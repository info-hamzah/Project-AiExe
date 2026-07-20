import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

import { requirePermission, toErrorResponse } from "@/lib/authz"
import { generateFromPrompt } from "@/lib/widgetCatalog"

/** Constrained AI generation (PA-10): prompt → catalog keys only, graceful degrade. */
export async function POST(req: Request) {
  try {
    await requirePermission("dashboards.view")
    const { prompt } = await req.json()
    return NextResponse.json(generateFromPrompt(String(prompt ?? "")))
  } catch (e) {
    return toErrorResponse(e)
  }
}
