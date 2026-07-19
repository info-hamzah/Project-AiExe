import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

import { requirePermission, toErrorResponse } from "@/lib/authz"
import { partnerService } from "@/lib/partnerService"

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requirePermission("partners.manage")
    await partnerService.setTerms(params.id, await req.json(), session.user.id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return toErrorResponse(e)
  }
}
