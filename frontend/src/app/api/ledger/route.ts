import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

import { requirePermission, toErrorResponse } from "@/lib/authz"
import { partnerService } from "@/lib/partnerService"

export async function GET() {
  try {
    await requirePermission("finance.view")
    return NextResponse.json(await partnerService.listLedger())
  } catch (e) {
    return toErrorResponse(e)
  }
}
