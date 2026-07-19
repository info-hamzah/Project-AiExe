import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

import { requirePermission, toErrorResponse } from "@/lib/authz"
import { partnerService } from "@/lib/partnerService"

export async function GET() {
  try {
    await requirePermission("partners.view")
    return NextResponse.json(await partnerService.listOrgs())
  } catch (e) {
    return toErrorResponse(e)
  }
}

export async function POST(req: Request) {
  try {
    const session = await requirePermission("partners.manage")
    const body = await req.json()
    const id = await partnerService.createOrg(body, session.user.id)
    return NextResponse.json({ id }, { status: 201 })
  } catch (e) {
    return toErrorResponse(e)
  }
}
