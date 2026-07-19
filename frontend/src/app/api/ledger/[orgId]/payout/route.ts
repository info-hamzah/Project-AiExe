import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

import { requirePermission, toErrorResponse } from "@/lib/authz"
import { partnerService } from "@/lib/partnerService"

export async function POST(_req: Request, { params }: { params: { orgId: string } }) {
  try {
    const session = await requirePermission("finance.reconcile")
    const n = await partnerService.markPaid(params.orgId, session.user.id)
    return NextResponse.json({ marked: n })
  } catch (e) {
    return toErrorResponse(e)
  }
}
