import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

import { q, writeAudit } from "@/lib/db"
import { resolveSession } from "@/lib/session"
import { TOPUP_BUNDLE } from "@/types/pricing"

/**
 * Simulated RM10 top-up (wiki rule): grants the premium bundle with
 * persists_after_downgrade = true — items stay free after any later downgrade.
 */
export async function POST() {
  const session = await resolveSession()
  if (!session) return NextResponse.json({ error: "no user" }, { status: 401 })
  for (const key of TOPUP_BUNDLE) {
    await q(
      `INSERT INTO entitlement_grants (subject_id, entitlement_key, source, persists_after_downgrade)
       VALUES ($1, $2, 'topup', true)
       ON CONFLICT (subject_id, entitlement_key, source) DO UPDATE SET revoked_at = NULL`,
      [session.user.id, key],
    )
  }
  await writeAudit(session.user.id, "entitlement", session.user.id, "create", `${session.user.name} purchased the RM10 premium bundle (persists after downgrade)`)
  return NextResponse.json({ ok: true, granted: TOPUP_BUNDLE })
}
