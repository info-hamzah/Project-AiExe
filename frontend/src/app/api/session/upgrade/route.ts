import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

import { q, tx, writeAudit } from "@/lib/db"
import { resolveSession } from "@/lib/session"

/**
 * Simulated tier change (Module 1): ends the active subscription, starts one on the
 * target package's current version. Real checkout goes through the order state
 * machine (ADR-002) in Module 2 — this proves gating flips with zero deploys.
 */
export async function POST(req: Request) {
  const session = await resolveSession()
  if (!session) return NextResponse.json({ error: "no user" }, { status: 401 })
  const { packageName } = await req.json()
  const pv = await q<{ id: string; name: string }>(
    `SELECT pv.id, p.name FROM package_versions pv JOIN packages p ON p.id = pv.package_id
     WHERE p.name = $1 ORDER BY pv.version DESC LIMIT 1`,
    [packageName],
  )
  if (!pv.rowCount) return NextResponse.json({ error: "package not found" }, { status: 404 })
  await tx(async (c) => {
    await c.query("UPDATE subscriptions SET status = 'cancelled', ends_at = now() WHERE subject_id = $1 AND status = 'active'", [session.user.id])
    await c.query("INSERT INTO subscriptions (subject_id, package_version_id, status) VALUES ($1, $2, 'active')", [session.user.id, pv.rows[0].id])
  })
  await writeAudit(session.user.id, "subscription", session.user.id, "update", `${session.user.name} moved to ${pv.rows[0].name} (simulated checkout)`)
  return NextResponse.json({ ok: true, packageName: pv.rows[0].name })
}
