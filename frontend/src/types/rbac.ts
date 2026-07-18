/** RBAC types mirroring ADR-001 §1 — the FE contract the real API must satisfy. */

export interface Permission {
  /** Namespaced "module.action" key, e.g. "roles.manage", "reports.purchase". */
  key: string
  description: string
}

export interface Role {
  id: string
  name: string
  description: string
  isSystem: boolean
  permissionKeys: string[]
  createdAt: string
  updatedAt: string
}

export interface RbacUser {
  id: string
  name: string
  email: string
  roleIds: string[]
}

export interface AuditEntry {
  id: string
  actor: string
  entityType: "role" | "user_roles"
  entityId: string
  action: "create" | "update" | "delete" | "assign"
  summary: string
  createdAt: string
}

export interface RoleInput {
  name: string
  description: string
  permissionKeys: string[]
}
