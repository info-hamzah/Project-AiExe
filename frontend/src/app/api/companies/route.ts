import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

import { requirePermission, toErrorResponse } from "@/lib/authz"
import { searchEntities } from "@/lib/demoData"

export async function GET(req: Request) {
  try {
    await requirePermission("reports.search")
    const q = new URL(req.url).searchParams.get("q") ?? ""
    return NextResponse.json(searchEntities(q))
  } catch (e) {
    return toErrorResponse(e)
  }
}
