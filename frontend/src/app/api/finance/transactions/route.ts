import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

import { requirePermission, toErrorResponse } from "@/lib/authz"
import { q } from "@/lib/db"

/** Finance transactions with channel attribution (PA-20). */
export async function GET() {
  try {
    await requirePermission("finance.view")
    const { rows } = await q(
      `SELECT o.id, o.state, o.created_at,
              u.name AS buyer, COALESCE(u.onboarding_source::text, 'direct') AS source,
              ci.name AS item,
              (o.price_breakdown->>'totalCents')::bigint AS total_cents,
              (o.price_breakdown->>'creditUsed') = 'true' AS credit_used,
              o.price_breakdown->'meta'->>'companyName' AS company
       FROM orders o
       JOIN users u ON u.id = o.buyer_id
       JOIN catalog_items ci ON ci.id = o.catalog_item_id
       ORDER BY o.created_at DESC LIMIT 200`,
    )
    const totals = await q(
      `SELECT COALESCE(u.onboarding_source::text, 'direct') AS source,
              COALESCE(SUM((o.price_breakdown->>'totalCents')::bigint), 0)::bigint AS cents,
              count(*)::int AS n
       FROM orders o JOIN users u ON u.id = o.buyer_id
       WHERE o.state = 'fulfilled' GROUP BY 1 ORDER BY 1`,
    )
    return NextResponse.json({ transactions: rows, totals: totals.rows })
  } catch (e) {
    return toErrorResponse(e)
  }
}
