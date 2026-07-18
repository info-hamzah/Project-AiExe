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
 * In-memory pricing store backing /api/packages — dev/demo stand-in for the real
 * backend (ADR-001 §2). Seeded from the "Infomina AI Products Pricing" wiki (v16).
 * globalThis singleton: one store per server process (Next bundles routes separately).
 */

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
  id: uid(),
  version,
  platformFeeCents,
  promoFeeCents,
  currency: "MYR",
  entitlementMap,
  creditAllowances,
  effectiveFrom: now(),
  createdBy,
})

const bundleEntitlements = (included: boolean) =>
  Object.fromEntries(TOPUP_BUNDLE.map((k) => [k, included]))

const price = (
  dataCostCents: number,
  serviceFeeCents: number,
  sstCents: number,
  packageId: string | null = null,
): ItemPrice => ({ id: uid(), packageId, dataCostCents, serviceFeeCents, sstCents, effectiveFrom: now() })

interface StoreState {
  packages: Package[]
  catalog: CatalogItem[]
  audit: { id: string; actor: string; summary: string; createdAt: string }[]
}

const seed = (): StoreState => {
  const explorer: Package = {
    id: uid(), name: "Explorer", isDefault: true, billingCycle: "none", status: "active",
    currentVersion: mkVersion(1, 0, null, bundleEntitlements(false), {}),
    versions: [],
  }
  const pro: Package = {
    id: uid(), name: "Pro", isDefault: false, billingCycle: "monthly", status: "active",
    currentVersion: mkVersion(1, 128800, 100000, bundleEntitlements(true), { ssm_roc_rob: 10 }),
    versions: [],
  }
  const elite: Package = {
    id: uid(), name: "Elite", isDefault: false, billingCycle: "monthly", status: "active",
    currentVersion: mkVersion(1, 150000, null, bundleEntitlements(true), { ssm_roc_rob: 50 }),
    versions: [],
  }
  ;[explorer, pro, elite].forEach((p) => p.versions.push(p.currentVersion))

  const member = (dataCost: number, fee: number, sst: number): ItemPrice[] => [
    price(dataCost, fee, sst, pro.id),
    price(dataCost, fee, sst, elite.id),
  ]

  // Wiki "Detailed Pricing Breakdown" — cents. Member overrides only where the wiki differs.
  const catalog: CatalogItem[] = [
    { id: uid(), key: "ssm_roc_rob", name: "SSM — ROC/ROB Profile", category: "ssm", status: "active",
      prices: [price(1000, 500, 40)] },
    { id: uid(), key: "ssm_llp", name: "SSM — LLP", category: "ssm", status: "active",
      prices: [price(2000, 500, 40)] },
    { id: uid(), key: "ssm_pdf", name: "SSM PDF", category: "ssm", status: "active",
      prices: [price(0, 0, 0)] },
    { id: uid(), key: "cert_incorp", name: "Cert of Incorporation", category: "cert", status: "active",
      prices: [price(2000, 500, 40)] },
    { id: uid(), key: "ctc_cert_incorp", name: "CTC Cert of Incorporation", category: "cert", status: "active",
      prices: [price(3500, 0, 40)] },
    { id: uid(), key: "idaman_report", name: "Idaman Report", category: "idaman", status: "active",
      prices: [price(1000, 1000, 80)] },
    { id: uid(), key: "idaman_docreader", name: "Idaman DocReader", category: "idaman", status: "active",
      prices: [price(0, 926, 74), ...member(0, 463, 37)] },
    // Wiki discrepancy: BIR row lists cost RM4 + fee RM5.56 + SST RM0.44 (= RM10) but a
    // customer price of RM6. Seeded to the published RM6; cost line pending finance review.
    { id: uid(), key: "bir", name: "BIR", category: "data", status: "active",
      prices: [price(0, 556, 44)] },
    { id: uid(), key: "tin", name: "TIN", category: "data", status: "active",
      prices: [price(0, 185, 15), ...member(0, 0, 0)] },
    { id: uid(), key: "docreader_plus", name: "DocReader Plus (self-upload)", category: "docreader", status: "active",
      prices: [price(0, 1390, 120), ...member(0, 0, 0)] },
    { id: uid(), key: "cbm_litigation", name: "CBM Litigation Data", category: "data", status: "active",
      prices: [price(0, 926, 74), ...member(0, 556, 44)] },
    { id: uid(), key: "property_transaction", name: "Property Transaction Data", category: "data", status: "active",
      prices: [price(0, 926, 74), ...member(0, 278, 22)] },
    { id: uid(), key: "xb_sg_bizcheck", name: "Cross-Border — SG BizCheck", category: "crossborder", status: "active",
      prices: [price(0, 4630, 370)] },
    { id: uid(), key: "xb_id_corporate", name: "Cross-Border — ID Corporate Search", category: "crossborder", status: "active",
      prices: [price(0, 16667, 1333)] },
    { id: uid(), key: "xb_vt_corporate", name: "Cross-Border — VN Corporate Search", category: "crossborder", status: "active",
      prices: [price(2000, 1389, 111)] },
  ]

  return { packages: [explorer, pro, elite], catalog, audit: [] }
}

const g = globalThis as typeof globalThis & { __aiexePricingStore?: StoreState }
g.__aiexePricingStore ??= seed()
const state = g.__aiexePricingStore

const logAudit = (actor: string, summary: string) => {
  state.audit.unshift({ id: uid(), actor, summary, createdAt: now() })
  if (state.audit.length > 100) state.audit.pop()
}

/**
 * Pure pricing function (PA-17 scaling rule):
 * (package, item, ctx) → decomposed breakdown. Member override wins over default.
 */
export function priceFor(packageId: string, itemKey: string): PriceBreakdown {
  const pkg = state.packages.find((p) => p.id === packageId)
  const item = state.catalog.find((c) => c.key === itemKey)
  if (!pkg || !item) throw Object.assign(new Error("package or item not found"), { status: 404 })
  const rows = item.prices
    .filter((p) => p.packageId === pkg.id || p.packageId === null)
    .sort((a, b) => (a.packageId === null ? 1 : -1) - (b.packageId === null ? 1 : -1))
  const row = rows[0]
  if (!row) throw Object.assign(new Error("no price row"), { status: 404 })
  return {
    itemKey,
    packageName: pkg.name,
    dataCostCents: row.dataCostCents,
    serviceFeeCents: row.serviceFeeCents,
    sstCents: row.sstCents,
    totalCents: row.dataCostCents + row.serviceFeeCents + row.sstCents,
    source: row.packageId ? "member" : "default",
  }
}

export const pricingStore = {
  listPackages: (): Package[] => state.packages,
  listCatalog: (): CatalogItem[] => state.catalog,
  listAudit: () => state.audit,
  priceFor,

  /** Package edit = NEW immutable version (PA-4). Old versions retained. */
  publishVersion(packageId: string, input: PackageVersionInput, actor: string): Package {
    const pkg = state.packages.find((p) => p.id === packageId)
    if (!pkg) throw Object.assign(new Error("package not found"), { status: 404 })
    const next = mkVersion(
      pkg.currentVersion.version + 1,
      input.platformFeeCents,
      input.promoFeeCents,
      input.entitlementMap,
      input.creditAllowances,
      actor,
    )
    pkg.versions.push(next)
    pkg.currentVersion = next
    logAudit(actor, `Published ${pkg.name} v${next.version} (fee RM${(next.platformFeeCents / 100).toFixed(2)})`)
    return pkg
  },

  setDefault(packageId: string, actor: string): Package {
    const pkg = state.packages.find((p) => p.id === packageId)
    if (!pkg) throw Object.assign(new Error("package not found"), { status: 404 })
    state.packages.forEach((p) => { p.isDefault = p.id === packageId })
    logAudit(actor, `Set "${pkg.name}" as the Global Default package`)
    return pkg
  },

  /** New price row for an item (member override when packageId given). Old rows retained. */
  setItemPrice(
    itemKey: string,
    packageId: string | null,
    cents: { dataCostCents: number; serviceFeeCents: number; sstCents: number },
    actor: string,
  ): CatalogItem {
    const item = state.catalog.find((c) => c.key === itemKey)
    if (!item) throw Object.assign(new Error("item not found"), { status: 404 })
    // newest row first so priceFor picks it up; history preserved after it
    item.prices.unshift(price(cents.dataCostCents, cents.serviceFeeCents, cents.sstCents, packageId))
    const scope = packageId
      ? state.packages.find((p) => p.id === packageId)?.name ?? "member"
      : "default"
    const total = (cents.dataCostCents + cents.serviceFeeCents + cents.sstCents) / 100
    logAudit(actor, `Set ${item.name} ${scope} price to RM${total.toFixed(2)} (cost/fee/SST decomposed)`)
    return item
  },
}
