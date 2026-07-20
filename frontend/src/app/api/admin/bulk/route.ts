import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

import { bulkOps } from "@/lib/adminOps"
import { requirePermission, toErrorResponse } from "@/lib/authz"

/** Generic filter → preview → action pipeline (PA-18). */
export async function POST(req: Request) {
  try {
    const session = await requirePermission("users.manage")
    const { action, filter, preview } = await req.json()
    if (action !== "deactivate_users") return NextResponse.json({ error: "unknown action" }, { status: 400 })
    return NextResponse.json(await bulkOps.run(action, filter ?? {}, Boolean(preview), session.user.id))
  } catch (e) {
    return toErrorResponse(e)
  }
}
