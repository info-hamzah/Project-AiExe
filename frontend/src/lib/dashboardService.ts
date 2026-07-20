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
  async currentFor(userId: string): Promise<{ config: DashboardConfig; source: "personal" | "default" | "starter" }> {
    if (!dbEnabled) return { config: STARTER, source: "starter" }
    const personal = await q<{ config: DashboardConfig }>(
      "SELECT config FROM dashboard_configs WHERE owner_type = 'user' AND owner_id = $1 ORDER BY updated_at DESC LIMIT 1",
      [userId],
    )
    if (personal.rowCount) return { config: valid(personal.rows[0].config), source: "personal" }
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
