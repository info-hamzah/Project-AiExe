import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

import { requirePermission, toErrorResponse } from "@/lib/authz"
import { runWidgetQuery } from "@/lib/widgetCatalog"

export async function GET(req: Request) {
  try {
    const session = await requirePermission("dashboards.view")
    const url = new URL(req.url)
    const key = url.searchParams.get("key") ?? ""
    const params = JSON.parse(url.searchParams.get("params") ?? "{}")
    return NextResponse.json(await runWidgetQuery(key, session, params))
  } catch (e) {
    return toErrorResponse(e)
  }
}
