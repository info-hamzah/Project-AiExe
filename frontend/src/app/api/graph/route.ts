import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

import { requirePermission, toErrorResponse } from "@/lib/authz"
import { neighborhood } from "@/lib/demoData"

export async function GET(req: Request) {
  try {
    await requirePermission("graph.view")
    const root = new URL(req.url).searchParams.get("root") ?? "whb"
    return NextResponse.json(neighborhood(root))
  } catch (e) {
    return toErrorResponse(e)
  }
}
