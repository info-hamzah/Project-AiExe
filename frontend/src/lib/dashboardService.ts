import { dbEnabled, q, writeAudit } from "@/lib/db"
import { WIDGET_CATALOG } from "@/lib/widgetCatalog"

/**
 * Dashboard configs (PA-13/PA-22): schema-versioned portable JSON in
 * dashboard_configs. Resolution order for a user: personal → admin_default → starter.
 */

export interface DashboardConfig {
  schemaVersion: 1
  widgets: { key: string; params?: Record<string, unknown> }[]
}

const STARTER: DashboardConfig = {
  schemaVersion: 1,
  widgets: [
    { key: "stat_my_reports" },
    { key: "stat_bo_changes" },
    { key: "table_bo_changes" },
    { key: "table_my_reports" },
  ],
}

const valid = (config: DashboardConfig): DashboardConfig => ({
  schemaVersion: 1,
  widgets: config.widgets.filter((w) => WIDGET_CATALOG.some((c) => c.key === w.key)).slice(0, 12),
})

export const dashboardService = {
  async currentFor(userId: string): Promise<{ config: DashboardConfig; source: "personal" | "targeted" | "default" | "starter" }> {
    if (!dbEnabled) return { config: STARTER, source: "starter" }
    const personal = await q<{ config: DashboardConfig }>(
      "SELECT config FROM dashboard_configs WHERE owner_type = 'user' AND owner_id = $1 ORDER BY updated_at DESC LIMIT 1",
      [userId],
    )
    if (personal.rowCount) return { config: valid(personal.rows[0].config), source: "personal" }
    // Targeted (PA-13): matches by role name or the user's partner org.
    const targeted = await q<{ config: DashboardConfig }>(
      `SELECT dc.config FROM dashboard_configs dc
       WHERE dc.owner_type = 'targeted' AND (
         EXISTS (
           SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
           WHERE ur.user_id = $1 AND dc.target->'roles' ? r.name
         )
         OR EXISTS (
           SELECT 1 FROM users u WHERE u.id = $1
             AND u.onboarding_partner_org_id IS NOT NULL
             AND dc.target->'partnerOrgs' ? u.onboarding_partner_org_id::text
         )
       )
       ORDER BY dc.updated_at DESC LIMIT 1`,
      [userId],
    )
    if (targeted.rowCount) return { config: valid(targeted.rows[0].config), source: "targeted" }
    const def = await q<{ config: DashboardConfig }>(
      "SELECT config FROM dashboard_configs WHERE owner_type = 'admin_default' ORDER BY updated_at DESC LIMIT 1",
    )
    if (def.rowCount) return { config: valid(def.rows[0].config), source: "default" }
    return { config: STARTER, source: "starter" }
  },

  async savePersonal(userId: string, config: DashboardConfig): Promise<void> {
    if (!dbEnabled) throw Object.assign(new Error("requires DATABASE_URL"), { status: 501 })
    const v = valid(config)
    const existing = await q<{ id: string }>(
      "SELECT id FROM dashboard_configs WHERE owner_type = 'user' AND owner_id = $1 LIMIT 1",
      [userId],
    )
    if (existing.rowCount) {
      await q("UPDATE dashboard_configs SET config = $2, schema_version = 1 WHERE id = $1", [existing.rows[0].id, JSON.stringify(v)])
    } else {
      await q(
        "INSERT INTO dashboard_configs (owner_type, owner_id, schema_version, config, created_by) VALUES ('user', $1, 1, $2, $1)",
        [userId, JSON.stringify(v)],
      )
    }
  },

  async publishTargeted(config: DashboardConfig, target: { roles?: string[]; partnerOrgs?: string[] }, actorId: string): Promise<void> {
    if (!dbEnabled) throw Object.assign(new Error("requires DATABASE_URL"), { status: 501 })
    const v = valid(config)
    await q(
      "INSERT INTO dashboard_configs (owner_type, owner_id, target, schema_version, config, created_by) VALUES ('targeted', NULL, $1, 1, $2, $3)",
      [JSON.stringify({ roles: target.roles ?? [], partnerOrgs: target.partnerOrgs ?? [] }), JSON.stringify(v), actorId],
    )
    await writeAudit(actorId, "dashboard", "targeted", "publish",
      `Published targeted dashboard (${v.widgets.length} widgets → roles: ${(target.roles ?? []).join(",") || "-"}; orgs: ${(target.partnerOrgs ?? []).length})`)
  },

  async publishDefault(config: DashboardConfig, actorId: string): Promise<void> {
    if (!dbEnabled) throw Object.assign(new Error("requires DATABASE_URL"), { status: 501 })
    const v = valid(config)
    const existing = await q<{ id: string }>(
      "SELECT id FROM dashboard_configs WHERE owner_type = 'admin_default' LIMIT 1",
    )
    if (existing.rowCount) {
      await q("UPDATE dashboard_configs SET config = $2 WHERE id = $1", [existing.rows[0].id, JSON.stringify(v)])
    } else {
      await q(
        "INSERT INTO dashboard_configs (owner_type, owner_id, schema_version, config, created_by) VALUES ('admin_default', NULL, 1, $1, $2)",
        [JSON.stringify(v), actorId],
      )
    }
    await writeAudit(actorId, "dashboard", "admin_default", "publish", `Published default dashboard (${v.widgets.length} widgets)`)
  },
}
