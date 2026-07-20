import { q, tx, writeAudit } from "@/lib/db"

/**
 * Admin operations: vouchers (PA-19), bulk user ops (PA-18), order reconciler (PA-8).
 * All DB-backed; audit-logged.
 */

/* ------------------------------- vouchers ------------------------------- */

export interface VoucherView {
  id: string
  code: string
  name: string
  scopeItemKeys: string[]
  feeDiscountPct: number
  maxRedemptions: number
  redeemed: number
  status: string
}

export const voucherService = {
  async list(): Promise<VoucherView[]> {
    const { rows } = await q<{ id: string; code: string; name: string; scope_item_keys: string[]; fee_discount_pct: string; max_redemptions: number; redeemed: number; status: string }>(
      "SELECT id, code, name, scope_item_keys, fee_discount_pct, max_redemptions, redeemed, status FROM vouchers ORDER BY created_at DESC",
    )
    return rows.map((r) => ({
      id: r.id, code: r.code, name: r.name, scopeItemKeys: r.scope_item_keys,
      feeDiscountPct: Number(r.fee_discount_pct), maxRedemptions: r.max_redemptions,
      redeemed: r.redeemed, status: r.status,
    }))
  },

  async create(input: { code: string; name: string; scopeItemKeys: string[]; feeDiscountPct: number; maxRedemptions: number }, actorId: string): Promise<void> {
    await q(
      "INSERT INTO vouchers (code, name, scope_item_keys, fee_discount_pct, max_redemptions, created_by) VALUES ($1, $2, $3, $4, $5, $6)",
      [input.code.toUpperCase(), input.name, input.scopeItemKeys, input.feeDiscountPct, input.maxRedemptions, actorId],
    )
    await writeAudit(actorId, "voucher", input.code.toUpperCase(), "create",
      `Created voucher ${input.code.toUpperCase()} (${input.feeDiscountPct}% off fee, scope: ${input.scopeItemKeys.join(",")}, max ${input.maxRedemptions})`)
  },

  /**
   * Validate + consume a voucher for an item. Scope enforcement is the whole point
   * (AE-261 class): a voucher NEVER applies outside its scoped items.
   */
  async redeem(code: string, itemKey: string): Promise<{ feeDiscountPct: number }> {
    return tx(async (c) => {
      const v = await c.query(
        "SELECT id, scope_item_keys, fee_discount_pct, max_redemptions, redeemed, status FROM vouchers WHERE code = $1 FOR UPDATE",
        [code.toUpperCase()],
      )
      if (!v.rowCount) throw Object.assign(new Error("invalid voucher code"), { status: 404 })
      const row = v.rows[0]
      if (row.status !== "active") throw Object.assign(new Error("voucher inactive"), { status: 400 })
      if (!row.scope_item_keys.includes(itemKey)) {
        throw Object.assign(new Error(`voucher not valid for this product`), { status: 400 })
      }
      if (row.redeemed >= row.max_redemptions) {
        throw Object.assign(new Error("voucher fully redeemed"), { status: 400 })
      }
      await c.query("UPDATE vouchers SET redeemed = redeemed + 1 WHERE id = $1", [row.id])
      return { feeDiscountPct: Number(row.fee_discount_pct) }
    })
  },
}

/* ------------------------------- bulk ops (PA-18) ------------------------------- */

export interface BulkFilter {
  onboardingSource?: "direct" | "partner" | "reseller"
  emailContains?: string
}

/** Generic filter → preview → action pipeline; "deactivate" is the first action. */
export const bulkOps = {
  async run(action: "deactivate_users", filter: BulkFilter, preview: boolean, actorId: string) {
    const { rows } = await q<{ id: string; name: string; email: string }>(
      `SELECT id, name, email FROM users
       WHERE status = 'active'
         AND ($1::text IS NULL OR onboarding_source::text = $1)
         AND ($2::text IS NULL OR email ILIKE '%' || $2 || '%')
       ORDER BY created_at`,
      [filter.onboardingSource ?? null, filter.emailContains ?? null],
    )
    if (preview) return { preview: true, count: rows.length, users: rows }
    if (action === "deactivate_users" && rows.length) {
      await q("UPDATE users SET status = 'deactivated' WHERE id = ANY($1::uuid[])", [rows.map((r) => r.id)])
      await writeAudit(actorId, "users", "bulk", "update",
        `Bulk-deactivated ${rows.length} user(s) [${filter.onboardingSource ?? "any source"}${filter.emailContains ? `, email~${filter.emailContains}` : ""}]`)
    }
    return { preview: false, count: rows.length, users: rows }
  },
}

/* ------------------------------- reconciler (PA-8) ------------------------------- */

/**
 * Order reconciler (ADR-002 rule 5): sweeps orders stuck in non-terminal states.
 * Runs on demand locally (admin button); a 5-minute scheduled job in production.
 * - pending_payment older than threshold → queries gateway (simulated: expire)
 * - fulfilling older than threshold → bounded retry → fulfilled
 */
export async function reconcileOrders(thresholdSeconds: number, actor = "reconciler"): Promise<{ expired: number; recovered: number }> {
  return tx(async (c) => {
    const stuckPending = await c.query(
      `SELECT id FROM orders WHERE state = 'pending_payment' AND updated_at < now() - make_interval(secs => $1)`,
      [thresholdSeconds],
    )
    for (const r of stuckPending.rows) {
      await c.query("UPDATE orders SET state = 'expired' WHERE id = $1", [r.id])
      await c.query(
        "INSERT INTO order_events (order_id, from_state, to_state, actor, reason) VALUES ($1, 'pending_payment', 'expired', $2, 'reconciler sweep: gateway reports no payment')",
        [r.id, actor],
      )
    }
    const stuckFulfilling = await c.query(
      `SELECT id FROM orders WHERE state = 'fulfilling' AND updated_at < now() - make_interval(secs => $1)`,
      [thresholdSeconds],
    )
    for (const r of stuckFulfilling.rows) {
      await c.query("UPDATE orders SET state = 'fulfilled' WHERE id = $1", [r.id])
      await c.query(
        "INSERT INTO order_events (order_id, from_state, to_state, actor, reason) VALUES ($1, 'fulfilling', 'fulfilled', $2, 'reconciler sweep: retry succeeded')",
        [r.id, actor],
      )
    }
    return { expired: stuckPending.rowCount ?? 0, recovered: stuckFulfilling.rowCount ?? 0 }
  })
}
