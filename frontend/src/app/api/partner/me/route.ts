import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

import { requirePermission, toErrorResponse } from "@/lib/authz"
import { partnerService } from "@/lib/partnerService"

/** Rep's own org: users + earnings (read-only) — the partner portal feed. */
export async function GET() {
  try {
    const session = await requirePermission("partner.portal")
    const org = await partnerService.orgForRep(session.user.id)
    if (!org) return NextResponse.json({ error: "no org for this user" }, { status: 404 })
    const [users, ledger] = await Promise.all([
      partnerService.listOnboardedUsers(org.id),
      org.type === "reseller" ? partnerService.listLedger(org.id) : Promise.resolve(null),
    ])
    return NextResponse.json({ org, users, ledger })
  } catch (e) {
    return toErrorResponse(e)
  }
}
