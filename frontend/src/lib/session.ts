import { cookies } from "next/headers"

import { dbEnabled, q } from "@/lib/db"
import { PERMISSIONS } from "@/lib/rbacStore"
import { TOPUP_BUNDLE } from "@/types/pricing"

/**
 * Dev session layer (Module 1). A dev-only cookie selects the active persona;
 * real auth (SSO/login) replaces `resolveSession` without touching consumers.
 * Effective access per PRD FR-1.4: role permissions ∩ tier entitlements —
 * permissions gate admin/module access, entitlements gate premium features.
 */

export const DEV_COOKIE = "aiexe_dev_user"

export interface SessionInfo {
  user: { id: string; name: string; email: string }
  permissions: string[]
  /** feature entitlement key → enabled (package entitlements ∪ persistent grants) */
  entitlements: Record<string, boolean>
  packageName: string
  packageVersion: number
}

/** No-DB fallback: a static all-access admin so the app works without Docker. */
const memorySession: SessionInfo = {
  user: { id: "00000000-0000-0000-0000-000000000000", name: "Demo Admin", email: "admin@demo.aiexe.my" },
  permissions: PERMISSIONS.map((p) => p.key),
  entitlements: Object.fromEntries(TOPUP_BUNDLE.map((k) => [k, true])),
  packageName: "Pro",
  packageVersion: 1,
}

export async function resolveSession(): Promise<SessionInfo | null> {
  if (!dbEnabled) return memorySession

  const cookieUserId = cookies().get(DEV_COOKIE)?.value
  const user = cookieUserId
    ? await q<{ id: string; name: string; email: string }>(
        "SELECT id, name, email FROM users WHERE id = $1",
        [cookieUserId],
      )
    : await q<{ id: string; name: string; email: string }>(
        "SELECT id, name, email FROM users ORDER BY created_at LIMIT 1",
      )
  if (!user.rowCount) return null
  const u = user.rows[0]

  const perms = await q<{ key: string }>(
    `SELECT DISTINCT rp.permission_key AS key
     FROM user_roles ur JOIN role_permissions rp ON rp.role_id = ur.role_id
     WHERE ur.user_id = $1 ORDER BY key`,
    [u.id],
  )

  const sub = await q<{ name: string; version: number; entitlement_map: Record<string, boolean> }>(
    `SELECT p.name, pv.version, pv.entitlement_map
     FROM subscriptions s
     JOIN package_versions pv ON pv.id = s.package_version_id
     JOIN packages p ON p.id = pv.package_id
     WHERE s.subject_id = $1 AND s.status = 'active'
     ORDER BY s.started_at DESC LIMIT 1`,
    [u.id],
  )

  const grants = await q<{ entitlement_key: string }>(
    "SELECT entitlement_key FROM entitlement_grants WHERE subject_id = $1 AND revoked_at IS NULL",
    [u.id],
  )

  const entitlements: Record<string, boolean> = { ...(sub.rows[0]?.entitlement_map ?? {}) }
  for (const g of grants.rows) entitlements[g.entitlement_key] = true

  return {
    user: u,
    permissions: perms.rows.map((r) => r.key),
    entitlements,
    packageName: sub.rows[0]?.name ?? "Explorer",
    packageVersion: sub.rows[0]?.version ?? 0,
  }
}
