/**
 * Idempotent demo seed for Module 1 (npm run seed).
 * Upserts: permission registry, roles, persona users, packages (wiki v16 pricing),
 * catalog + decomposed prices, subscriptions. Safe to re-run.
 */
import pg from "pg"

const DATABASE_URL = process.env.DATABASE_URL ?? "postgres://aiexe:aiexe@localhost:5433/aiexe"
const pool = new pg.Pool({ connectionString: DATABASE_URL })
const q = (text, params) => pool.query(text, params)

const PERMISSIONS = [
  ["roles.view", "View roles and assignments"],
  ["roles.manage", "Create, edit, delete roles"],
  ["packages.view", "View packages and pricing"],
  ["packages.manage", "Edit packages, prices, default package"],
  ["partners.view", "View partner/reseller orgs"],
  ["partners.manage", "Create partners, set terms and rates"],
  ["finance.view", "View finance and transaction reports"],
  ["finance.reconcile", "Reconcile and mark payouts"],
  ["reports.search", "Search entities"],
  ["reports.purchase", "Purchase reports"],
  ["reports.bulk", "Bulk purchase"],
  ["graph.view", "View relationship graph"],
  ["monitoring.manage", "Manage monitored entities and BO alerts"],
  ["dashboards.view", "View dashboards"],
  ["dashboards.create", "Create personal dashboards"],
  ["dashboards.publish", "Publish default/targeted dashboards"],
  ["users.view", "View users"],
  ["users.manage", "Manage users (invite, deactivate, reset password)"],
]

const ALL_KEYS = PERMISSIONS.map(([k]) => k)
const TOPUP_BUNDLE = [
  "mina_exec_summary", "mina_visualization_graph", "mina_chat", "bizinfo",
  "business_radius_scan", "stakeholder_insights", "ecourt_links", "tin",
]
const bundle = (on) => Object.fromEntries(TOPUP_BUNDLE.map((k) => [k, on]))

const ROLES = [
  ["Super Admin", "Full platform access", true, ALL_KEYS],
  ["Finance", "Finance and reconciliation", false, ["finance.view", "finance.reconcile", "packages.view", "users.view"]],
  ["Sales", "Customer-facing sales role", false, ["reports.search", "reports.purchase", "graph.view", "dashboards.view", "users.view"]],
  ["Analyst", "Research and monitoring", false, ["reports.search", "graph.view", "monitoring.manage", "dashboards.view", "dashboards.create"]],
]

const USERS = [
  ["Hamzah (Admin)", "admin@demo.aiexe.my", ["Super Admin"], "Pro"],
  ["Aina Rahman", "aina@demo.aiexe.my", ["Finance"], "Pro"],
  ["Marcus Lee", "marcus@demo.aiexe.my", ["Sales"], "Pro"],
  ["Priya Nair", "priya@demo.aiexe.my", ["Analyst"], "Elite"],
  ["Encik Explorer", "explorer@demo.aiexe.my", [], "Explorer"],
]

// [name, isDefault, cycle, feeCents, promoCents, entitlements, credits]
const PACKAGES = [
  ["Explorer", true, "none", 0, null, bundle(false), {}],
  ["Pro", false, "monthly", 128800, 100000, bundle(true), { ssm_roc_rob: 10 }],
  ["Elite", false, "monthly", 150000, null, bundle(true), { ssm_roc_rob: 50 }],
]

// [key, name, category, default [d,f,s], member [d,f,s] | null]
const CATALOG = [
  ["ssm_roc_rob", "SSM — ROC/ROB Profile", "ssm", [1000, 500, 40], null],
  ["ssm_llp", "SSM — LLP", "ssm", [2000, 500, 40], null],
  ["ssm_pdf", "SSM PDF", "ssm", [0, 0, 0], null],
  ["cert_incorp", "Cert of Incorporation", "cert", [2000, 500, 40], null],
  ["ctc_cert_incorp", "CTC Cert of Incorporation", "cert", [3500, 0, 40], null],
  ["idaman_report", "Idaman Report", "idaman", [1000, 1000, 80], null],
  ["idaman_docreader", "Idaman DocReader", "idaman", [0, 926, 74], [0, 463, 37]],
  // Wiki discrepancy: BIR decomposition ≠ published RM6 price; seeded to RM6 pending finance review.
  ["bir", "BIR", "data", [0, 556, 44], null],
  ["tin", "TIN", "data", [0, 185, 15], [0, 0, 0]],
  ["docreader_plus", "DocReader Plus (self-upload)", "docreader", [0, 1390, 120], [0, 0, 0]],
  ["cbm_litigation", "CBM Litigation Data", "data", [0, 926, 74], [0, 556, 44]],
  ["property_transaction", "Property Transaction Data", "data", [0, 926, 74], [0, 278, 22]],
  ["xb_sg_bizcheck", "Cross-Border — SG BizCheck", "crossborder", [0, 4630, 370], null],
  ["xb_id_corporate", "Cross-Border — ID Corporate Search", "crossborder", [0, 16667, 1333], null],
  ["xb_vt_corporate", "Cross-Border — VN Corporate Search", "crossborder", [2000, 1389, 111], null],
]

async function main() {
  // permissions
  for (const [key, description] of PERMISSIONS) {
    await q(
      "INSERT INTO permissions (key, description) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description",
      [key, description],
    )
  }

  // roles + role_permissions
  const roleIds = {}
  for (const [name, description, isSystem, keys] of ROLES) {
    const { rows } = await q(
      `INSERT INTO roles (name, description, is_system) VALUES ($1, $2, $3)
       ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
       RETURNING id`,
      [name, description, isSystem],
    )
    roleIds[name] = rows[0].id
    await q("DELETE FROM role_permissions WHERE role_id = $1", [rows[0].id])
    await q(
      "INSERT INTO role_permissions (role_id, permission_key) SELECT $1, unnest($2::text[])",
      [rows[0].id, keys],
    )
  }

  // packages + v1
  const pkgIds = {}
  for (const [name, isDefault, cycle, fee, promo, ents, credits] of PACKAGES) {
    const { rows } = await q(
      `INSERT INTO packages (name, is_default, billing_cycle, status) VALUES ($1, false, $2, 'active')
       ON CONFLICT (name) DO UPDATE SET billing_cycle = EXCLUDED.billing_cycle
       RETURNING id`,
      [name, cycle],
    )
    pkgIds[name] = rows[0].id
    const v = await q("SELECT 1 FROM package_versions WHERE package_id = $1 LIMIT 1", [rows[0].id])
    if (!v.rowCount) {
      await q(
        `INSERT INTO package_versions (package_id, version, platform_fee_cents, promo_fee_cents, entitlement_map, credit_allowances)
         VALUES ($1, 1, $2, $3, $4, $5)`,
        [rows[0].id, fee, promo, JSON.stringify(ents), JSON.stringify(credits)],
      )
    }
    if (isDefault) {
      await q("UPDATE packages SET is_default = false WHERE is_default AND id <> $1", [rows[0].id])
      await q("UPDATE packages SET is_default = true WHERE id = $1", [rows[0].id])
    }
  }

  // catalog + prices (default + member rows, only when the item has none yet)
  for (const [key, name, category, def, member] of CATALOG) {
    const { rows } = await q(
      `INSERT INTO catalog_items (key, name, category, status) VALUES ($1, $2, $3, 'active')
       ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [key, name, category],
    )
    const has = await q("SELECT 1 FROM item_prices WHERE catalog_item_id = $1 LIMIT 1", [rows[0].id])
    if (!has.rowCount) {
      await q(
        "INSERT INTO item_prices (catalog_item_id, package_id, data_cost_cents, service_fee_cents, sst_cents) VALUES ($1, NULL, $2, $3, $4)",
        [rows[0].id, ...def],
      )
      if (member) {
        for (const pkgName of ["Pro", "Elite"]) {
          await q(
            "INSERT INTO item_prices (catalog_item_id, package_id, data_cost_cents, service_fee_cents, sst_cents) VALUES ($1, $2, $3, $4, $5)",
            [rows[0].id, pkgIds[pkgName], ...member],
          )
        }
      }
    }
  }

  // persona users + roles + subscriptions
  for (const [name, email, roleNames, pkgName] of USERS) {
    const { rows } = await q(
      `INSERT INTO users (name, email, onboarding_source) VALUES ($1, $2, 'direct')
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [name, email],
    )
    const userId = rows[0].id
    await q("DELETE FROM user_roles WHERE user_id = $1", [userId])
    for (const rn of roleNames) {
      await q("INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [userId, roleIds[rn]])
    }
    const sub = await q("SELECT 1 FROM subscriptions WHERE subject_id = $1 LIMIT 1", [userId])
    if (!sub.rowCount) {
      const pv = await q(
        "SELECT id FROM package_versions WHERE package_id = $1 ORDER BY version DESC LIMIT 1",
        [pkgIds[pkgName]],
      )
      await q(
        "INSERT INTO subscriptions (subject_id, package_version_id, status) VALUES ($1, $2, 'active')",
        [userId, pv.rows[0].id],
      )
    }
  }

  const counts = await q(`
    SELECT (SELECT count(*) FROM roles) roles, (SELECT count(*) FROM permissions) perms,
           (SELECT count(*) FROM users) users, (SELECT count(*) FROM packages) pkgs,
           (SELECT count(*) FROM catalog_items) items, (SELECT count(*) FROM item_prices) prices,
           (SELECT count(*) FROM subscriptions) subs`)
  console.log("seeded:", counts.rows[0])
  await pool.end()
}

main().catch((e) => { console.error(e); process.exit(1) })
