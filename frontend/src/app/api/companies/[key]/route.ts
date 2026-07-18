import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

import { requirePermission, toErrorResponse } from "@/lib/authz"
import { demoFinancials, EDGES, entityByKey } from "@/lib/demoData"
import { hasReport } from "@/lib/orderService"

export async function GET(_req: Request, { params }: { params: { key: string } }) {
  try {
    const session = await requirePermission("reports.search")
    const entity = entityByKey(params.key)
    if (!entity) return NextResponse.json({ error: "not found" }, { status: 404 })
    const incident = EDGES.filter((e) => e.source === params.key || e.target === params.key).map((e) => ({
      ...e,
      sourceName: entityByKey(e.source)?.name ?? e.source,
      targetName: entityByKey(e.target)?.name ?? e.target,
    }))
    const purchased = await hasReport(session.user.id, "ssm_roc_rob", params.key)
    return NextResponse.json({
      entity,
      edges: incident,
      financials: purchased ? demoFinancials(params.key) : null,
      purchased,
    })
  } catch (e) {
    return toErrorResponse(e)
  }
}
