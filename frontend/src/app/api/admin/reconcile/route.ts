import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

import { reconcileOrders } from "@/lib/adminOps"
import { requirePermission, toErrorResponse } from "@/lib/authz"

/** On-demand reconciler sweep (ADR-002 rule 5; scheduled 5-min job in production). */
export async function POST(req: Request) {
  try {
    await requirePermission("finance.reconcile")
    const { thresholdSeconds = 900 } = await req.json().catch(() => ({}))
    return NextResponse.json(await reconcileOrders(Number(thresholdSeconds)))
  } catch (e) {
    return toErrorResponse(e)
  }
}
