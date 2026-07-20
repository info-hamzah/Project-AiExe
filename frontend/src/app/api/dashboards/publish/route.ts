import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

import { requirePermission, toErrorResponse } from "@/lib/authz"
import { dashboardService } from "@/lib/dashboardService"

export async function POST(req: Request) {
  try {
    const session = await requirePermission("dashboards.publish")
    await dashboardService.publishDefault(await req.json(), session.user.id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return toErrorResponse(e)
  }
}
