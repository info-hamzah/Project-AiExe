import { dbEnabled, pgError, q, tx, writeAudit } from "@/lib/db"
import { TOPUP_BUNDLE } from "@/types/pricing"
import type {
  CatalogItem,
  ItemPrice,
  Package,
  PackageVersion,
  PackageVersionInput,
  PriceBreakdown,
} from "@/types/pricing"

/**
 * Pricing store — async facade over Postgres (DATABASE_URL) or in-memory demo.
 * Seed data comes from the "Infomina AI Products Pricing" wiki (v16) — via
 * `npm run seed` for Postgres, or the built-in memory seed.
 */

export interface PricingBackend {
  listPackages(): Promise<Package[]>
  listCatalog(): Promise<CatalogItem[]>
  priceFor(packageId: string, itemKey: string): Promise<PriceBreakdown>
  publishVersion(packageId: string, input: PackageVersionInput, actor: string): Promise<Package>
  setDefault(packageId: string, actor: string): Promise<Package>
  setItemPrice(
    itemKey: string,
    packageId: string | null,
    cents: { dataCostCents: number; serviceFeeCents: number; sstCents: number },
    actor: string,
  ): Promise<CatalogItem>
}

/* ------------------------------ Postgres backend ------------------------------ */

interface VersionRow {
  id: string
  package_id: string
  version: number
  platform_fee_cents: number
  promo_fee_cents: number | null
  entitlement_map: Record<string, boolean>
  credit_allowances: Record<string, number>
  effective_from: string
  created_by: string | null
}

const mapVersion = (v: VersionRow): PackageVersion => ({
  id: v.id,
  version: v.version,
  platformFeeCents: v.platform_fee_cents,
  promoFeeCents: v.promo_fee_cents,
  currency: "MYR",
  entitlementMap: v.entitlement_map ?? {},
  creditAllowances: v.credit_allowances ?? {},
  effectiveFrom: v.effective_from,
  createdBy: v.created_by ?? "seed",
})

async function pgPackages(): Promise<Package[]> {
  const pkgs = await q<{ id: string; name: string; is_default: boolean; billing_cycle: string; status: string }>(
    "SELECT id, name, is_default, billing_cycle, status FROM packages ORDER BY created_at",
  )
  const versions = await q<VersionRow>(
    "SELECT id, package_id, version, platform_fee_cents, promo_fee_cents, entitlement_map, credit_allowances, effective_from, created_by FROM package_versions ORDER BY package_id, version",
  )
  return pkgs.rows.map((p) => {
    const vs = versions.rows.filter((v) => v.package_id === p.id).map(mapVersion)
    return {
      id: p.id,
      name: p.name,
      isDefault: p.is_default,
      billingCycle: p.billing_cycle as Package["billingCycle"],
      status: p.status as Package["status"],
      currentVersion: vs[vs.length - 1],
      versions: vs,
    }
  })
}

interface PriceRow {
  id: string
  package_id: string | null
  data_cost_cents: number
  service_fee_cents: number
  sst_cents: number
  effective_from: string
}

const mapPrice = (p: PriceRow): ItemPrice => ({
  id: p.id,
  packageId: p.package_id,
  dataCostCents: p.data_cost_cents,
  serviceFeeCents: p.service_fee_cents,
  sstCents: p.sst_cents,
  effectiveFrom: p.effective_from,
})

const pgBackend: PricingBackend = {
  listPackages: pgPackages,

  async listCatalog() {
    const items = await q<{ id: string; key: string; name: string; category: string; status: string }>(
      "SELECT id, key, name, category, status FROM catalog_items ORDER BY category, key",
    )
    const prices = await q<PriceRow & { catalog_item_id: string }>(
      "SELECT id, catalog_item_id, package_id, data_cost_cents, service_fee_cents, sst_cents, effective_from FROM item_prices ORDER BY effective_from DESC",
    )
    return items.rows.map((i) => ({
      id: i.id,
      key: i.key,
      name: i.name,
      category: i.category as CatalogItem["category"],
      status: i.status as CatalogItem["status"],
      prices: prices.rows.filter((p) => p.catalog_item_id === i.id).map(mapPrice),
    }))
  },

  async priceFor(packageId, itemKey) {
    const pkg = await q<{ name: string }>("SELECT name FROM packages WHERE id = $1", [packageId])
    if (!pkg.rowCount) throw Object.assign(new Error("package not found"), { status: 404 })
    const { rows } = await q<PriceRow>(
      `SELECT ip.id, ip.package_id, ip.data_cost_cents, ip.service_fee_cents, ip.sst_cents, ip.effective_from
       FROM item_prices ip JOIN catalog_items ci ON ci.id = ip.catalog_item_id
       WHERE ci.key = $2 AND (ip.package_id = $1 OR ip.package_id IS NULL)
       ORDER BY ip.package_id NULLS LAST, ip.effective_from DESC
       LIMIT 1`,
      [packageId, itemKey],
    )
    if (!rows.length) throw Object.assign(new Error("no price row"), { status: 404 })
    const r = rows[0]
    return {
      itemKey,
      packageName: pkg.rows[0].name,
      dataCostCents: r.data_cost_cents,
      serviceFeeCents: r.service_fee_cents,
      sstCents: r.sst_cents,
      totalCents: r.data_cost_cents + r.service_fee_cents + r.sst_cents,
      source: r.package_id ? ("member" as const) : ("default" as const),
    }
  },

  async publishVersion(packageId, input, actor) {
    try {
      await tx(async (c) => {
        const cur = await c.query(
          "SELECT COALESCE(MAX(version), 0) AS v FROM package_versions WHERE package_id = $1",
          [packageId],
        )
        const pkg = await c.query("SELECT name FROM packages WHERE id = $1", [packageId])
        if (!pkg.rowCount) throw Object.assign(new Error("package not found"), { status: 404 })
        const next = Number(cur.rows[0].v) + 1
        await c.query(
          `INSERT INTO package_versions (package_id, version, platform_fee_cents, promo_fee_cents, entitlement_map, credit_allowances)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [packageId, next, input.platformFeeCents, input.promoFeeCents, JSON.stringify(input.entitlementMap), JSON.stringify(input.creditAllowances)],
        )
        await c.query(
          "INSERT INTO audit_log (actor_id, entity_type, entity_id, action, after) VALUES ('00000000-0000-0000-0000-000000000000', 'package', $1, 'publish', jsonb_build_object('summary', $2::text))",
          [packageId, `Published ${pkg.rows[0].name} v${next} (fee RM${(input.platformFeeCents / 100).toFixed(2)})`],
        )
      })
      const all = await pgPackages()
      return all.find((p) => p.id === packageId)!
    } catch (e) {
      const err = e as Error & { status?: number }
      throw err.status ? err : pgError(e)
    }
  },

  async setDefault(packageId, actor) {
    try {
      await tx(async (c) => {
        const pkg = await c.query("SELECT name FROM packages WHERE id = $1", [packageId])
        if (!pkg.rowCount) throw Object.assign(new Error("package not found"), { status: 404 })
        await c.query("UPDATE packages SET is_default = false WHERE is_default")
        await c.query("UPDATE packages SET is_default = true WHERE id = $1", [packageId])
        await c.query(
          "INSERT INTO audit_log (actor_id, entity_type, entity_id, action, after) VALUES ('00000000-0000-0000-0000-000000000000', 'package', $1, 'update', jsonb_build_object('summary', $2::text))",
          [packageId, `Set "${pkg.rows[0].name}" as the Global Default package`],
        )
      })
      const all = await pgPackages()
      return all.find((p) => p.id === packageId)!
    } catch (e) {
      const err = e as Error & { status?: number }
      throw err.status ? err : pgError(e)
    }
  },

  async setItemPrice(itemKey, packageId, cents, actor) {
    try {
      const item = await q<{ id: string; name: string }>(
        "SELECT id, name FROM catalog_items WHERE key = $1",
        [itemKey],
      )
      if (!item.rowCount) throw Object.assign(new Error("item not found"), { status: 404 })
      await q(
        `INSERT INTO item_prices (catalog_item_id, package_id, data_cost_cents, service_fee_cents, sst_cents)
         VALUES ($1, $2, $3, $4, $5)`,
        [item.rows[0].id, packageId, cents.dataCostCents, cents.serviceFeeCents, cents.sstCents],
      )
      const total = (cents.dataCostCents + cents.serviceFeeCents + cents.sstCents) / 100
      await writeAudit(actor, "price", item.rows[0].id, "update", `Set ${item.rows[0].name} ${packageId ? "member" : "default"} price to RM${total.toFixed(2)}`)
      const catalog = await pgBackend.listCatalog()
      return catalog.find((c) => c.key === itemKey)!
    } catch (e) {
      const err = e as Error & { status?: number }
      throw err.status ? err : pgError(e)
    }
  },
}

/* ------------------------------ in-memory backend ------------------------------ */

let seq = 0
const uid = () => `${Date.now().toString(36)}-p${(seq++).toString(36)}`
const now = () => new Date().toISOString()

const mkVersion = (
  version: number,
  platformFeeCents: number,
  promoFeeCents: number | null,
  entitlementMap: Record<string, boolean>,
  creditAllowances: Record<string, number>,
  createdBy = "seed",
): PackageVersion => ({
  id: uid(), version, platformFeeCents, promoFeeCents, currency: "MYR",
  entitlementMap, creditAllowances, effectiveFrom: now(), createdBy,
})

const bundleEntitlements = (included: boolean) =>
  Object.fromEntries(TOPUP_BUNDLE.map((k) => [k, included]))

const price = (
  dataCostCents: number, serviceFeeCents: number, sstCents: number, packageId: string | null = null,
): ItemPrice => ({ id: uid(), packageId, dataCostCents, serviceFeeCents, sstCents, effectiveFrom: now() })

interface MemState {
  packages: Package[]
  catalog: CatalogItem[]
}

const seedMem = (): MemState => {
  const explorer: Package = {
    id: uid(), name: "Explorer", isDefault: true, billingCycle: "none", status: "active",
    currentVersion: mkVersion(1, 0, null, bundleEntitlements(false), {}), versions: [],
  }
  const pro: Package = {
    id: uid(), name: "Pro", isDefault: false, billingCycle: "monthly", status: "active",
    currentVersion: mkVersion(1, 128800, 100000, bundleEntitlements(true), { ssm_roc_rob: 10 }), versions: [],
  }
  const elite: Package = {
    id: uid(), name: "Elite", isDefault: false, billingCycle: "monthly", status: "active",
    currentVersion: mkVersion(1, 150000, null, bundleEntitlements(true), { ssm_roc_rob: 50 }), versions: [],
  }
  ;[explorer, pro, elite].forEach((p) => p.versions.push(p.currentVersion))
  const member = (d: number, f: number, s: number): ItemPrice[] => [price(d, f, s, pro.id), price(d, f, s, elite.id)]
  const catalog: CatalogItem[] = [
    { id: uid(), key: "ssm_roc_rob", name: "SSM — ROC/ROB Profile", category: "ssm", status: "active", prices: [price(1000, 500, 40)] },
    { id: uid(), key: "ssm_llp", name: "SSM — LLP", category: "ssm", status: "active", prices: [price(2000, 500, 40)] },
    { id: uid(), key: "ssm_pdf", name: "SSM PDF", category: "ssm", status: "active", prices: [price(0, 0, 0)] },
    { id: uid(), key: "cert_incorp", name: "Cert of Incorporation", category: "cert", status: "active", prices: [price(2000, 500, 40)] },
    { id: uid(), key: "ctc_cert_incorp", name: "CTC Cert of Incorporation", category: "cert", status: "active", prices: [price(3500, 0, 40)] },
    { id: uid(), key: "idaman_report", name: "Idaman Report", category: "idaman", status: "active", prices: [price(1000, 1000, 80)] },
    { id: uid(), key: "idaman_docreader", name: "Idaman DocReader", category: "idaman", status: "active", prices: [price(0, 926, 74), ...member(0, 463, 37)] },
    // Wiki discrepancy: BIR decomposition (4+5.56+0.44=RM10) ≠ published RM6; seeded to RM6.
    { id: uid(), key: "bir", name: "BIR", category: "data", status: "active", prices: [price(0, 556, 44)] },
    { id: uid(), key: "tin", name: "TIN", category: "data", status: "active", prices: [price(0, 185, 15), ...member(0, 0, 0)] },
    { id: uid(), key: "docreader_plus", name: "DocReader Plus (self-upload)", category: "docreader", status: "active", prices: [price(0, 1390, 120), ...member(0, 0, 0)] },
    { id: uid(), key: "cbm_litigation", name: "CBM Litigation Data", category: "data", status: "active", prices: [price(0, 926, 74), ...member(0, 556, 44)] },
    { id: uid(), key: "property_transaction", name: "Property Transaction Data", category: "data", status: "active", prices: [price(0, 926, 74), ...member(0, 278, 22)] },
    { id: uid(), key: "xb_sg_bizcheck", name: "Cross-Border — SG BizCheck", category: "crossborder", status: "active", prices: [price(0, 4630, 370)] },
    { id: uid(), key: "xb_id_corporate", name: "Cross-Border — ID Corporate Search", category: "crossborder", status: "active", prices: [price(0, 16667, 1333)] },
    { id: uid(), key: "xb_vt_corporate", name: "Cross-Border — VN Corporate Search", category: "crossborder", status: "active", prices: [price(2000, 1389, 111)] },
  ]
  return { packages: [explorer, pro, elite], catalog }
}

const g = globalThis as typeof globalThis & { __aiexePricingStore?: MemState }
g.__aiexePricingStore ??= seedMem()
const mem = g.__aiexePricingStore

const memBackend: PricingBackend = {
  listPackages: async () => mem.packages,
  listCatalog: async () => mem.catalog,

  async priceFor(packageId, itemKey) {
    const pkg = mem.packages.find((p) => p.id === packageId)
    const item = mem.catalog.find((c) => c.key === itemKey)
    if (!pkg || !item) throw Object.assign(new Error("package or item not found"), { status: 404 })
    const rows = item.prices
      .filter((p) => p.packageId === pkg.id || p.packageId === null)
      .sort((a, b) => (a.packageId === null ? 1 : -1) - (b.packageId === null ? 1 : -1))
    const row = rows[0]
    if (!row) throw Object.assign(new Error("no price row"), { status: 404 })
    return {
      itemKey, packageName: pkg.name,
      dataCostCents: row.dataCostCents, serviceFeeCents: row.serviceFeeCents, sstCents: row.sstCents,
      totalCents: row.dataCostCents + row.serviceFeeCents + row.sstCents,
      source: row.packageId ? ("member" as const) : ("default" as const),
    }
  },

  async publishVersion(packageId, input, actor) {
    const pkg = mem.packages.find((p) => p.id === packageId)
    if (!pkg) throw Object.assign(new Error("package not found"), { status: 404 })
    const next = mkVersion(pkg.currentVersion.version + 1, input.platformFeeCents, input.promoFeeCents, input.entitlementMap, input.creditAllowances, actor)
    pkg.versions.push(next)
    pkg.currentVersion = next
    return pkg
  },

  async setDefault(packageId, actor) {
    const pkg = mem.packages.find((p) => p.id === packageId)
    if (!pkg) throw Object.assign(new Error("package not found"), { status: 404 })
    mem.packages.forEach((p) => { p.isDefault = p.id === packageId })
    return pkg
  },

  async setItemPrice(itemKey, packageId, cents, actor) {
    const item = mem.catalog.find((c) => c.key === itemKey)
    if (!item) throw Object.assign(new Error("item not found"), { status: 404 })
    item.prices.unshift(price(cents.dataCostCents, cents.serviceFeeCents, cents.sstCents, packageId))
    return item
  },
}

export const pricingStore: PricingBackend = dbEnabled ? pgBackend : memBackend
export const priceFor = (packageId: string, itemKey: string) => pricingStore.priceFor(packageId, itemKey)
