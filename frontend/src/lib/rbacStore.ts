import type { AuditEntry, RbacUser, Role, RoleInput } from "@/types/rbac"

/**
 * In-memory RBAC store backing the /api/roles routes — dev/demo stand-in for the
 * real backend (ADR-001 tables). Module-scoped singleton: survives requests in one
 * server process, resets on restart. Swapped for the real API without FE changes.
 */

let seq = 0
const uid = () => `${Date.now().toString(36)}-${(seq++).toString(36)}`
const now = () => new Date().toISOString()

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

const mkRole = (
  name: string,
  description: string,
  isSystem: boolean,
  permissionKeys: string[],
): Role => ({ id: uid(), name, description, isSystem, permissionKeys, createdAt: now(), updatedAt: now() })

interface StoreState {
  roles: Role[]
  users: RbacUser[]
  audit: AuditEntry[]
}

const seed = (): StoreState => {
  const roles = [
    mkRole("Super Admin", "Full platform access", true, PERMISSIONS.map((p) => p.key)),
    mkRole("Finance", "Finance and reconciliation", false, [
      "finance.view", "finance.reconcile", "packages.view", "users.view",
    ]),
    mkRole("Sales", "Customer-facing sales role", false, [
      "reports.search", "reports.purchase", "graph.view", "dashboards.view", "users.view",
    ]),
    mkRole("Analyst", "Research and monitoring", false, [
      "reports.search", "graph.view", "monitoring.manage", "dashboards.view", "dashboards.create",
    ]),
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

// Next.js bundles each API route separately — module-scope state would give every
// route its own copy. globalThis keeps one store per server process.
const g = globalThis as typeof globalThis & { __aiexeRbacStore?: StoreState }
g.__aiexeRbacStore ??= seed()
const { roles, users, audit } = g.__aiexeRbacStore

const logAudit = (entry: Omit<AuditEntry, "id" | "createdAt">) => {
  audit.unshift({ ...entry, id: uid(), createdAt: now() })
  if (audit.length > 100) audit.pop()
}

export const rbacStore = {
  listRoles: (): Role[] => roles,
  listUsers: (): RbacUser[] => users,
  listAudit: (): AuditEntry[] => audit,

  createRole(input: RoleInput, actor: string): Role {
    if (roles.some((r) => r.name.toLowerCase() === input.name.toLowerCase())) {
      throw Object.assign(new Error(`role "${input.name}" already exists`), { status: 409 })
    }
    const role = mkRole(input.name, input.description, false, input.permissionKeys)
    roles.push(role)
    logAudit({ actor, entityType: "role", entityId: role.id, action: "create", summary: `Created role "${role.name}" (${role.permissionKeys.length} permissions)` })
    return role
  },

  updateRole(id: string, input: RoleInput, actor: string): Role {
    const role = roles.find((r) => r.id === id)
    if (!role) throw Object.assign(new Error("role not found"), { status: 404 })
    const before = role.permissionKeys.length
    role.name = input.name
    role.description = input.description
    role.permissionKeys = input.permissionKeys
    role.updatedAt = now()
    logAudit({ actor, entityType: "role", entityId: role.id, action: "update", summary: `Updated role "${role.name}" (${before} → ${input.permissionKeys.length} permissions)` })
    return role
  },

  deleteRole(id: string, actor: string): void {
    const role = roles.find((r) => r.id === id)
    if (!role) throw Object.assign(new Error("role not found"), { status: 404 })
    if (role.isSystem) throw Object.assign(new Error(`system role "${role.name}" cannot be deleted`), { status: 403 })
    roles.splice(roles.indexOf(role), 1)
    users.forEach((u) => { u.roleIds = u.roleIds.filter((rid) => rid !== id) })
    logAudit({ actor, entityType: "role", entityId: id, action: "delete", summary: `Deleted role "${role.name}"` })
  },

  setUserRoles(userId: string, roleIds: string[], actor: string): RbacUser {
    const user = users.find((u) => u.id === userId)
    if (!user) throw Object.assign(new Error("user not found"), { status: 404 })
    const valid = new Set(roles.map((r) => r.id))
    user.roleIds = roleIds.filter((rid) => valid.has(rid))
    const names = roles.filter((r) => user.roleIds.includes(r.id)).map((r) => r.name)
    logAudit({ actor, entityType: "user_roles", entityId: userId, action: "assign", summary: `Set ${user.name}'s roles to [${names.join(", ") || "none"}]` })
    return user
  },
}
