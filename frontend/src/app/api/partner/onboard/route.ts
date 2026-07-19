import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

import { requirePermission, toErrorResponse } from "@/lib/authz"
import { partnerService } from "@/lib/partnerService"

export async function POST(req: Request) {
  try {
    const session = await requirePermission("partner.portal")
    const org = await partnerService.orgForRep(session.user.id)
    if (!org) return NextResponse.json({ error: "no org for this user" }, { status: 404 })
    await partnerService.onboardUser(org.id, await req.json(), session.user.id)
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (e) {
    return toErrorResponse(e)
  }
}
