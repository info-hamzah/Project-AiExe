import type { RbacUser, Role } from "@/types/rbac"

/**
 * Central permission resolver (PA-2 / PA-16 scaling rule).
 * ALL access checks go through here — never inline role comparisons.
 * effective_access = union(role permissions) ∩ tier entitlements.
 * Tier entitlements integrate when the package module (PA-17/PA-1) lands;
 * until then the entitlement set is treated as unrestricted.
 */
export function effectiveAccess(
  user: RbacUser,
  roles: Role[],
  tierEntitlements?: ReadonlySet<string>,
): Set<string> {
  const roleById = new Map(roles.map((r) => [r.id, r]))
  const fromRoles = new Set<string>()
  for (const roleId of user.roleIds) {
    for (const key of roleById.get(roleId)?.permissionKeys ?? []) fromRoles.add(key)
  }
  if (!tierEntitlements) return fromRoles
  return new Set([...fromRoles].filter((k) => tierEntitlements.has(k)))
}

export const hasPermission = (access: ReadonlySet<string>, key: string): boolean =>
  access.has(key)
