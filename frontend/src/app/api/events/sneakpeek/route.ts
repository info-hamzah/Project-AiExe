import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

import { dbEnabled, q } from "@/lib/db"
import { resolveSession } from "@/lib/session"

/** Sneak-peek funnel events (impression / cta_click) — PA-1 instrumentation. */
export async function POST(req: Request) {
  const session = await resolveSession()
  if (!session) return NextResponse.json({ error: "no user" }, { status: 401 })
  const { entitlementKey, event } = await req.json()
  if (!["impression", "cta_click"].includes(event)) {
    return NextResponse.json({ error: "bad event" }, { status: 400 })
  }
  if (dbEnabled) {
    await q(
      "INSERT INTO sneakpeek_events (user_id, entitlement_key, event) VALUES ($1, $2, $3)",
      [session.user.id, entitlementKey, event],
    )
  }
  return NextResponse.json({ ok: true })
}

export async function GET() {
  if (!dbEnabled) return NextResponse.json([])
  const { rows } = await q(
    `SELECT entitlement_key, event, count(*)::int AS n
     FROM sneakpeek_events GROUP BY entitlement_key, event ORDER BY entitlement_key, event`,
  )
  return NextResponse.json(rows)
}
