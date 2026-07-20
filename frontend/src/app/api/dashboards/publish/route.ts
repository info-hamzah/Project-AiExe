import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

import { requirePermission, toErrorResponse } from "@/lib/authz"
import { dashboardService } from "@/lib/dashboardService"

export async function POST(req: Request) {
  try {
    const session = await requirePermission("dashboards.publish")
    const body = await req.json()
    if (body.target) await dashboardService.publishTargeted(body, body.target, session.user.id)
    else await dashboardService.publishDefault(body, session.user.id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return toErrorResponse(e)
  }
}
