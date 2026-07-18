import { dbEnabled, pgError, q, tx, writeAudit } from "@/lib/db"
import type { AuditEntry, RbacUser, Role, RoleInput } from "@/types/rbac"

/**
 * RBAC store — async facade with two backends:
 *  - Postgres (DATABASE_URL set): ADR-001 tables via docker-compose/RDS
 *  - in-memory demo fallback (no env): resets per process
 * API routes consume only this facade; swapping backends never touches the UI.
 */

/** Permission registry — modules register keys additively (ADR-001 §1). */
export const PERMISSIONS = [
  { key: "roles.view", description: "View roles and assignments" },
  { key: "roles.manage", description: "Create, edit, delete roles" },
  { key: "packages.view", description: "View packages and pricing" },
  { key: "packages.manage", description: "Edit packages, prices, default package" },
  { key: "partners.view", description: "View partner/reseller orgs" },
  { key: "partners.manage", description: "Create partners, set terms and rates" },
  { key: "finance.view", description: "View finance and transaction reports" },
  { key: "finance.reconcile", description: "Reconcile and mark payouts" },
  { key: "reports.search", description: "Search entities" },
  { key: "reports.purchase", description: "Purchase reports" },
  { key: "reports.bulk", description: "Bulk purchase" },
  { key: "graph.view", description: "View relationship graph" },
  { key: "monitoring.manage", description: "Manage monitored entities and BO alerts" },
  { key: "dashboards.view", description: "View dashboards" },
  { key: "dashboards.create", description: "Create personal dashboards" },
  { key: "dashboards.publish", description: "Publish default/targeted dashboards" },
  { key: "users.view", description: "View users" },
  { key: "users.manage", description: "Manage users (invite, deactivate, reset password)" },
] as const

export interface RbacBackend {
  listRoles(): Promise<Role[]>
  listPermissions(): Promise<{ key: string; description: string }[]>
  listUsers(): Promise<RbacUser[]>
  listAudit(): Promise<AuditEntry[]>
  createRole(input: RoleInput, actor: string): Promise<Role>
  updateRole(id: string, input: RoleInput, actor: string): Promise<Role>
  deleteRole(id: string, actor: string): Promise<void>
  setUserRoles(userId: string, roleIds: string[], actor: string): Promise<RbacUser>
}

/* ------------------------------ Postgres backend ------------------------------ */

interface RoleRow {
  id: string
  name: string
  description: string | null
  is_system: boolean
  keys: string[]
  created_at: string
  updated_at: string
}

const mapRole = (r: RoleRow): Role => ({
  id: r.id,
  name: r.name,
  description: r.description ?? "",
  isSystem: r.is_system,
  permissionKeys: r.keys ?? [],
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const ROLE_SELECT = `
  SELECT r.id, r.name, r.description, r.is_system, r.created_at, r.updated_at,
         COALESCE(array_agg(rp.permission_key) FILTER (WHERE rp.permission_key IS NOT NULL), '{}') AS keys
  FROM roles r
  LEFT JOIN role_permissions rp ON rp.role_id = r.id`

const pgBackend: RbacBackend = {
  async listRoles() {
    const { rows } = await q<RoleRow>(`${ROLE_SELECT} GROUP BY r.id ORDER BY r.created_at`)
    return rows.map(mapRole)
  },

  async listPermissions() {
    const { rows } = await q<{ key: string; description: string | null }>(
      "SELECT key, description FROM permissions ORDER BY key",
    )
    return rows.map((r) => ({ key: r.key, description: r.description ?? "" }))
  },

  async listUsers() {
    const { rows } = await q<{ id: string; name: string; email: string; role_ids: string[] }>(
      `SELECT u.id, u.name, u.email,
              COALESCE(array_agg(ur.role_id::text) FILTER (WHERE ur.role_id IS NOT NULL), '{}') AS role_ids
       FROM users u LEFT JOIN user_roles ur ON ur.user_id = u.id
       GROUP BY u.id ORDER BY u.created_at`,
    )
    return rows.map((r) => ({ id: r.id, name: r.name, email: r.email, roleIds: r.role_ids }))
  },

  async listAudit() {
    const { rows } = await q<{ id: number; actor_id: string; entity_type: string; entity_id: string; action: string; after: { summary?: string } | null; created_at: string }>(
      "SELECT id, actor_id, entity_type, entity_id, action, after, created_at FROM audit_log ORDER BY id DESC LIMIT 50",
    )
    return rows.map((r) => ({
      id: String(r.id),
      actor: "admin:demo",
      entityType: (r.entity_type === "user_roles" ? "user_roles" : "role") as AuditEntry["entityType"],
      entityId: r.entity_id,
      action: r.action as AuditEntry["action"],
      summary: r.after?.summary ?? `${r.action} ${r.entity_type}`,
      createdAt: r.created_at,
    }))
  },

  async createRole(input, actor) {
    try {
      return await tx(async (c) => {
        const { rows } = await c.query(
          "INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING id",
          [input.name, input.description],
        )
        const id = rows[0].id as string
        if (input.permissionKeys.length) {
          await c.query(
            "INSERT INTO role_permissions (role_id, permission_key) SELECT $1::uuid, unnest($2::text[])",
            [id, input.permissionKeys],
          )
        }
        await c.query(
          "INSERT INTO audit_log (actor_id, entity_type, entity_id, action, after) VALUES ('00000000-0000-0000-0000-000000000000', 'role', $1, 'create', jsonb_build_object('summary', $2::text))",
          [id, `Created role "${input.name}" (${input.permissionKeys.length} permissions)`],
        )
        const res = await c.query(`${ROLE_SELECT} WHERE r.id = $1 GROUP BY r.id`, [id])
        return mapRole(res.rows[0])
      })
    } catch (e) {
      throw pgError(e)
    }
  },

  async updateRole(id, input, actor) {
    try {
      return await tx(async (c) => {
        const upd = await c.query(
          "UPDATE roles SET name = $2, description = $3 WHERE id = $1 RETURNING id",
          [id, input.name, input.description],
        )
        if (!upd.rowCount) throw Object.assign(new Error("role not found"), { status: 404 })
        await c.query("DELETE FROM role_permissions WHERE role_id = $1", [id])
        if (input.permissionKeys.length) {
          await c.query(
            "INSERT INTO role_permissions (role_id, permission_key) SELECT $1::uuid, unnest($2::text[])",
            [id, input.permissionKeys],
          )
        }
        await c.query(
          "INSERT INTO audit_log (actor_id, entity_type, entity_id, action, after) VALUES ('00000000-0000-0000-0000-000000000000', 'role', $1, 'update', jsonb_build_object('summary', $2::text))",
          [id, `Updated role "${input.name}" (${input.permissionKeys.length} permissions)`],
        )
        const res = await c.query(`${ROLE_SELECT} WHERE r.id = $1 GROUP BY r.id`, [id])
        return mapRole(res.rows[0])
      })
    } catch (e) {
      const err = e as Error & { status?: number }
      throw err.status ? err : pgError(e)
    }
  },

  async deleteRole(id, actor) {
    try {
      const { rows } = await q<{ name: string }>("SELECT name FROM roles WHERE id = $1", [id])
      if (!rows.length) throw Object.assign(new Error("role not found"), { status: 404 })
      await q("DELETE FROM roles WHERE id = $1", [id]) // system-role guard raises in trigger
      await writeAudit(actor, "role", id, "delete", `Deleted role "${rows[0].name}"`)
    } catch (e) {
      const err = e as Error & { status?: number }
      throw err.status ? err : pgError(e)
    }
  },

  async setUserRoles(userId, roleIds, actor) {
    try {
      return await tx(async (c) => {
        const u = await c.query("SELECT id, name, email FROM users WHERE id = $1", [userId])
        if (!u.rowCount) throw Object.assign(new Error("user not found"), { status: 404 })
        await c.query("DELETE FROM user_roles WHERE user_id = $1", [userId])
        if (roleIds.length) {
          await c.query(
            `INSERT INTO user_roles (user_id, role_id)
             SELECT $1::uuid, r.id FROM roles r WHERE r.id = ANY($2::uuid[])`,
            [userId, roleIds],
          )
        }
        const names = await c.query(
          "SELECT r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = $1",
          [userId],
        )
        await c.query(
          "INSERT INTO audit_log (actor_id, entity_type, entity_id, action, after) VALUES ('00000000-0000-0000-0000-000000000000', 'user_roles', $1, 'update', jsonb_build_object('summary', $2::text))",
          [userId, `Set ${u.rows[0].name}'s roles to [${names.rows.map((r) => r.name).join(", ") || "none"}]`],
        )
        const ids = await c.query("SELECT role_id FROM user_roles WHERE user_id = $1", [userId])
        return {
          id: u.rows[0].id,
          name: u.rows[0].name,
          email: u.rows[0].email,
          roleIds: ids.rows.map((r) => String(r.role_id)),
        }
      })
    } catch (e) {
      const err = e as Error & { status?: number }
      throw err.status ? err : pgError(e)
    }
  },
}

/* ------------------------------ in-memory backend ------------------------------ */

let seq = 0
const uid = () => `${Date.now().toString(36)}-${(seq++).toString(36)}`
const now = () => new Date().toISOString()

const mkRole = (name: string, description: string, isSystem: boolean, permissionKeys: string[]): Role => ({
  id: uid(), name, description, isSystem, permissionKeys, createdAt: now(), updatedAt: now(),
})

interface MemState { roles: Role[]; users: RbacUser[]; audit: AuditEntry[] }

const seedMem = (): MemState => {
  const roles = [
    mkRole("Super Admin", "Full platform access", true, PERMISSIONS.map((p) => p.key)),
    mkRole("Finance", "Finance and reconciliation", false, ["finance.view", "finance.reconcile", "packages.view", "users.view"]),
    mkRole("Sales", "Customer-facing sales role", false, ["reports.search", "reports.purchase", "graph.view", "dashboards.view", "users.view"]),
    mkRole("Analyst", "Research and monitoring", false, ["reports.search", "graph.view", "monitoring.manage", "dashboards.view", "dashboards.create"]),
  ]
  return {
    roles,
    users: [
      { id: uid(), name: "Aina Rahman", email: "aina@demo.aiexe.my", roleIds: [roles[1].id] },
      { id: uid(), name: "Marcus Lee", email: "marcus@demo.aiexe.my", roleIds: [roles[2].id] },
      { id: uid(), name: "Priya Nair", email: "priya@demo.aiexe.my", roleIds: [roles[3].id] },
    ],
    audit: [],
  }
}

const g = globalThis as typeof globalThis & { __aiexeRbacStore?: MemState }
g.__aiexeRbacStore ??= seedMem()
const mem = g.__aiexeRbacStore

const memAudit = (entry: Omit<AuditEntry, "id" | "createdAt">) => {
  mem.audit.unshift({ ...entry, id: uid(), createdAt: now() })
  if (mem.audit.length > 100) mem.audit.pop()
}

const memBackend: RbacBackend = {
  listRoles: async () => mem.roles,
  listPermissions: async () => [...PERMISSIONS],
  listUsers: async () => mem.users,
  listAudit: async () => mem.audit,

  async createRole(input, actor) {
    if (mem.roles.some((r) => r.name.toLowerCase() === input.name.toLowerCase())) {
      throw Object.assign(new Error(`role "${input.name}" already exists`), { status: 409 })
    }
    const role = mkRole(input.name, input.description, false, input.permissionKeys)
    mem.roles.push(role)
    memAudit({ actor, entityType: "role", entityId: role.id, action: "create", summary: `Created role "${role.name}" (${role.permissionKeys.length} permissions)` })
    return role
  },

  async updateRole(id, input, actor) {
    const role = mem.roles.find((r) => r.id === id)
    if (!role) throw Object.assign(new Error("role not found"), { status: 404 })
    const before = role.permissionKeys.length
    Object.assign(role, { name: input.name, description: input.description, permissionKeys: input.permissionKeys, updatedAt: now() })
    memAudit({ actor, entityType: "role", entityId: role.id, action: "update", summary: `Updated role "${role.name}" (${before} → ${input.permissionKeys.length} permissions)` })
    return role
  },

  async deleteRole(id, actor) {
    const role = mem.roles.find((r) => r.id === id)
    if (!role) throw Object.assign(new Error("role not found"), { status: 404 })
    if (role.isSystem) throw Object.assign(new Error(`system role "${role.name}" cannot be deleted`), { status: 403 })
    mem.roles.splice(mem.roles.indexOf(role), 1)
    mem.users.forEach((u) => { u.roleIds = u.roleIds.filter((rid) => rid !== id) })
    memAudit({ actor, entityType: "role", entityId: id, action: "delete", summary: `Deleted role "${role.name}"` })
  },

  async setUserRoles(userId, roleIds, actor) {
    const user = mem.users.find((u) => u.id === userId)
    if (!user) throw Object.assign(new Error("user not found"), { status: 404 })
    const valid = new Set(mem.roles.map((r) => r.id))
    user.roleIds = roleIds.filter((rid) => valid.has(rid))
    const names = mem.roles.filter((r) => user.roleIds.includes(r.id)).map((r) => r.name)
    memAudit({ actor, entityType: "user_roles", entityId: userId, action: "assign", summary: `Set ${user.name}'s roles to [${names.join(", ") || "none"}]` })
    return user
  },
}

export const rbacStore: RbacBackend = dbEnabled ? pgBackend : memBackend
