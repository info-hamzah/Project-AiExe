import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

import { requirePermission, toErrorResponse } from "@/lib/authz"
import { dashboardService } from "@/lib/dashboardService"

export async function GET() {
  try {
    const session = await requirePermission("dashboards.view")
    return NextResponse.json(await dashboardService.currentFor(session.user.id))
  } catch (e) {
    return toErrorResponse(e)
  }
}
