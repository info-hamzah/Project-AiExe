import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

import { requirePermission, toErrorResponse } from "@/lib/authz"
import { WIDGET_CATALOG } from "@/lib/widgetCatalog"

export async function GET() {
  try {
    await requirePermission("dashboards.view")
    return NextResponse.json(WIDGET_CATALOG)
  } catch (e) {
    return toErrorResponse(e)
  }
}
