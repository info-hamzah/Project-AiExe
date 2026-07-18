import { randomUUID } from "crypto"

import { dbEnabled, q, tx } from "@/lib/db"
import { pricingStore } from "@/lib/pricingStore"
import type { PriceBreakdown } from "@/types/pricing"

/**
 * Order service (ADR-002, single writer) — Module 1 simulation of the purchase flow.
 * Real gateway integration replaces `simulatePayment`; the state machine, event log,
 * credit consumption, and price pinning are the production shapes already.
 */

export interface OrderView {
  id: string
  itemKey: string
  itemName: string
  companyKey: string
  companyName: string
  state: string
  priceBreakdown: PriceBreakdown & { creditUsed?: boolean }
  events: { from: string | null; to: string; actor: string; at: string }[]
  createdAt: string
}

interface CreateOrderInput {
  buyerId: string
  packageId: string
  packageName: string
  itemKey: string
  itemName: string
  companyKey: string
  companyName: string
  /** credit allowance for this item on the buyer's current package version */
  creditAllowance: number
}

/* in-memory fallback (no DATABASE_URL) */
const g = globalThis as typeof globalThis & { __aiexeOrders?: OrderView[] }
g.__aiexeOrders ??= []
const memOrders = g.__aiexeOrders

async function creditsUsed(buyerId: string, itemKey: string): Promise<number> {
  if (!dbEnabled) {
    return memOrders.filter(
      (o) => o.itemKey === itemKey && o.state === "fulfilled" && o.priceBreakdown.creditUsed,
    ).length
  }
  const { rows } = await q<{ n: number }>(
    `SELECT count(*)::int AS n FROM orders o JOIN catalog_items ci ON ci.id = o.catalog_item_id
     WHERE o.buyer_id = $1 AND ci.key = $2 AND o.state = 'fulfilled'
       AND (o.price_breakdown->>'creditUsed')::boolean IS TRUE
       AND o.created_at > date_trunc('year', now())`,
    [buyerId, itemKey],
  )
  return rows[0]?.n ?? 0
}

/**
 * Create + drive an order through the state machine with a simulated gateway:
 * draft → pending_payment → paid → fulfilling → fulfilled, every hop in order_events.
 */
export async function purchase(input: CreateOrderInput): Promise<OrderView> {
  const quote = await pricingStore.priceFor(input.packageId, input.itemKey)
  const used = await creditsUsed(input.buyerId, input.itemKey)
  const creditUsed = used < input.creditAllowance
  const pinned = {
    ...quote,
    ...(creditUsed ? { dataCostCents: 0, serviceFeeCents: 0, sstCents: 0, totalCents: 0, creditUsed: true } : {}),
    meta: { companyKey: input.companyKey, companyName: input.companyName, itemName: input.itemName },
  }

  const transitions: [string | null, string, string][] = [
    [null, "draft", `user:${input.buyerId}`],
    ["draft", "pending_payment", `user:${input.buyerId}`],
    ["pending_payment", "paid", "gateway:simulated"],
    ["paid", "fulfilling", "order-service"],
    ["fulfilling", "fulfilled", "order-service"],
  ]

  if (!dbEnabled) {
    const now = new Date().toISOString()
    const view: OrderView = {
      id: randomUUID(),
      itemKey: input.itemKey,
      itemName: input.itemName,
      companyKey: input.companyKey,
      companyName: input.companyName,
      state: "fulfilled",
      priceBreakdown: pinned,
      events: transitions.map(([from, to, actor]) => ({ from, to, actor, at: now })),
      createdAt: now,
    }
    memOrders.unshift(view)
    return view
  }

  const orderId = await tx(async (c) => {
    const item = await c.query("SELECT id FROM catalog_items WHERE key = $1", [input.itemKey])
    if (!item.rowCount) throw Object.assign(new Error("unknown item"), { status: 404 })
    const ins = await c.query(
      `INSERT INTO orders (buyer_id, catalog_item_id, qty, price_breakdown, state, idempotency_key)
       VALUES ($1, $2, 1, $3, 'draft', $4) RETURNING id, created_at`,
      [input.buyerId, item.rows[0].id, JSON.stringify(pinned), randomUUID()],
    )
    const newOrderId = ins.rows[0].id as string
    for (const [from, to, actor] of transitions) {
      if (from !== null) {
        await c.query("UPDATE orders SET state = $2 WHERE id = $1", [newOrderId, to])
      }
      await c.query(
        "INSERT INTO order_events (order_id, from_state, to_state, actor, reason) VALUES ($1, $2, $3, $4, $5)",
        [newOrderId, from, to, actor, from === null ? "order created" : "simulated flow"],
      )
    }
    await c.query(
      "INSERT INTO audit_log (actor_id, entity_type, entity_id, action, after) VALUES ($1, 'order', $2, 'create', jsonb_build_object('summary', $3::text))",
      [input.buyerId, newOrderId, `Purchased ${input.itemName} for ${input.companyName} (${creditUsed ? "package credit" : `RM${(pinned.totalCents / 100).toFixed(2)}`})`],
    )
    return newOrderId
  })
  // read after commit — the pool connection can't see uncommitted tx rows
  return getOrder(orderId)
}

export async function getOrder(orderId: string): Promise<OrderView> {
  if (!dbEnabled) {
    const o = memOrders.find((m) => m.id === orderId)
    if (!o) throw Object.assign(new Error("order not found"), { status: 404 })
    return o
  }
  const { rows } = await q<{ id: string; state: string; price_breakdown: OrderView["priceBreakdown"] & { meta?: { companyKey: string; companyName: string; itemName: string } }; created_at: string; key: string }>(
    `SELECT o.id, o.state, o.price_breakdown, o.created_at, ci.key
     FROM orders o JOIN catalog_items ci ON ci.id = o.catalog_item_id WHERE o.id = $1`,
    [orderId],
  )
  if (!rows.length) throw Object.assign(new Error("order not found"), { status: 404 })
  const events = await q<{ from_state: string | null; to_state: string; actor: string; created_at: string }>(
    "SELECT from_state, to_state, actor, created_at FROM order_events WHERE order_id = $1 ORDER BY id",
    [orderId],
  )
  const r = rows[0]
  return {
    id: r.id,
    itemKey: r.key,
    itemName: r.price_breakdown.meta?.itemName ?? r.key,
    companyKey: r.price_breakdown.meta?.companyKey ?? "",
    companyName: r.price_breakdown.meta?.companyName ?? "",
    state: r.state,
    priceBreakdown: r.price_breakdown,
    events: events.rows.map((e) => ({ from: e.from_state, to: e.to_state, actor: e.actor, at: e.created_at })),
    createdAt: r.created_at,
  }
}

export async function listOrders(buyerId: string): Promise<OrderView[]> {
  if (!dbEnabled) return memOrders
  const { rows } = await q<{ id: string }>(
    "SELECT id FROM orders WHERE buyer_id = $1 ORDER BY created_at DESC LIMIT 50",
    [buyerId],
  )
  return Promise.all(rows.map((r) => getOrder(r.id)))
}

/** Has this buyer a fulfilled report of `itemKey` for `companyKey`? (gates report content) */
export async function hasReport(buyerId: string, itemKey: string, companyKey: string): Promise<boolean> {
  const orders = await listOrders(buyerId)
  return orders.some((o) => o.itemKey === itemKey && o.companyKey === companyKey && o.state === "fulfilled")
}
