import { dbEnabled, q } from "@/lib/db"
import { EDGES, ENTITIES, entityByKey } from "@/lib/demoData"
import { listOrders } from "@/lib/orderService"
import { partnerService } from "@/lib/partnerService"
import type { SessionInfo } from "@/lib/session"

/**
 * Widget catalog + server-side query registry (PA-9).
 * Every metric/query lives HERE, keyed by query_key — never in the frontend and
 * never as free-text SQL (kills the hardcoded-ratio bug class, AE-239/240/252).
 * The dashboard FE is a dumb renderer over {widgetType, data}.
 */

export interface CatalogWidget {
  key: string
  name: string
  widgetType: "stat" | "bar_chart" | "table" | "graph"
  queryKey: string
  /** default params; instances may override (e.g. graph root) */
  params: Record<string, unknown>
  description: string
}

export const WIDGET_CATALOG: CatalogWidget[] = [
  { key: "stat_my_reports", name: "My reports (count)", widgetType: "stat", queryKey: "my_reports_count", params: {}, description: "Fulfilled report purchases by the current user" },
  { key: "stat_bo_changes", name: "BO changes (14d)", widgetType: "stat", queryKey: "bo_change_count", params: {}, description: "Monitored entities with recent beneficial-ownership changes" },
  { key: "stat_commission_owed", name: "Commission owed", widgetType: "stat", queryKey: "commission_owed", params: {}, description: "Settled, unpaid reseller commissions (admin/finance)" },
  { key: "chart_reports_by_day", name: "Report purchases over time", widgetType: "bar_chart", queryKey: "reports_by_day", params: {}, description: "My report purchases per day" },
  { key: "chart_revenue_by_source", name: "Revenue by onboarding source", widgetType: "bar_chart", queryKey: "revenue_by_source", params: {}, description: "Order revenue grouped by Direct / Partner / Reseller channel" },
  { key: "chart_sneakpeek_funnel", name: "Sneak-peek funnel", widgetType: "bar_chart", queryKey: "sneakpeek_funnel", params: {}, description: "Locked-feature impressions vs upgrade clicks" },
  { key: "table_bo_changes", name: "Recent BO changes", widgetType: "table", queryKey: "bo_changes", params: {}, description: "Beneficial-ownership filings on monitored companies (Companies Act 2024)" },
  { key: "table_my_reports", name: "My reports", widgetType: "table", queryKey: "my_reports", params: {}, description: "Purchased reports with state and price" },
  { key: "graph_company", name: "Relationship graph", widgetType: "graph", queryKey: "company_graph", params: { root: "whb" }, description: "Sigma neighborhood graph centered on a company" },
]

type QueryFn = (session: SessionInfo, params: Record<string, unknown>) => Promise<unknown>

const queries: Record<string, QueryFn> = {
  async my_reports_count(session) {
    const orders = await listOrders(session.user.id)
    return { value: orders.filter((o) => o.state === "fulfilled").length, suffix: "reports" }
  },

  async bo_change_count() {
    return { value: EDGES.filter((e) => e.type === "bo_changed").length, suffix: "in 14 days" }
  },

  async commission_owed(session) {
    if (!dbEnabled || !session.permissions.includes("finance.view")) return { value: 0, prefix: "RM" }
    const { totals } = await partnerService.listLedger()
    return { value: (totals.settledCents / 100).toFixed(2), prefix: "RM" }
  },

  async reports_by_day(session) {
    const orders = await listOrders(session.user.id)
    const byDay = new Map<string, number>()
    orders.forEach((o) => {
      const d = o.createdAt.slice(0, 10)
      byDay.set(d, (byDay.get(d) ?? 0) + 1)
    })
    return { rows: [...byDay.entries()].sort().map(([name, value]) => ({ name, value })), yLabel: "purchases" }
  },

  async revenue_by_source() {
    if (!dbEnabled) return { rows: [], yLabel: "RM" }
    const { rows } = await q<{ source: string; cents: number }>(
      `SELECT COALESCE(u.onboarding_source::text, 'direct') AS source,
              COALESCE(SUM((o.price_breakdown->>'totalCents')::bigint), 0)::bigint AS cents
       FROM orders o JOIN users u ON u.id = o.buyer_id
       WHERE o.state = 'fulfilled' GROUP BY 1 ORDER BY 1`,
    )
    return { rows: rows.map((r) => ({ name: r.source, value: Number(r.cents) / 100 })), yLabel: "RM" }
  },

  async sneakpeek_funnel() {
    if (!dbEnabled) return { rows: [], yLabel: "events" }
    const { rows } = await q<{ event: string; n: number }>(
      "SELECT event::text, count(*)::int AS n FROM sneakpeek_events GROUP BY 1 ORDER BY 1",
    )
    return { rows: rows.map((r) => ({ name: r.event, value: r.n })), yLabel: "events" }
  },

  async bo_changes() {
    const rows = EDGES.filter((e) => e.type === "bo_changed").map((e) => ({
      company: entityByKey(e.target)?.name ?? e.target,
      companyKey: e.target,
      change: e.label,
      person: entityByKey(e.source)?.name ?? e.source,
    }))
    return {
      columns: [
        { title: "Company", dataIndex: "company", linkTo: "graph" },
        { title: "Change", dataIndex: "change" },
        { title: "Person", dataIndex: "person" },
      ],
      rows,
    }
  },

  async my_reports(session) {
    const orders = await listOrders(session.user.id)
    return {
      columns: [
        { title: "Company", dataIndex: "companyName" },
        { title: "Report", dataIndex: "itemName" },
        { title: "State", dataIndex: "state", tag: true },
        { title: "Paid", dataIndex: "paid" },
      ],
      rows: orders.map((o) => ({
        companyName: o.companyName,
        itemName: o.itemName,
        state: o.state,
        paid: o.priceBreakdown.creditUsed ? "credit" : `RM ${(o.priceBreakdown.totalCents / 100).toFixed(2)}`,
      })),
    }
  },

  async company_graph(_session, params) {
    const root = typeof params.root === "string" && entityByKey(params.root) ? params.root : "whb"
    return { root }
  },
}

export async function runWidgetQuery(
  widgetKey: string,
  session: SessionInfo,
  paramOverrides: Record<string, unknown> = {},
): Promise<{ widget: CatalogWidget; data: unknown }> {
  const widget = WIDGET_CATALOG.find((w) => w.key === widgetKey)
  if (!widget) throw Object.assign(new Error(`unknown widget: ${widgetKey}`), { status: 404 })
  const fn = queries[widget.queryKey]
  if (!fn) throw Object.assign(new Error(`unregistered query: ${widget.queryKey}`), { status: 500 })
  const data = await fn(session, { ...widget.params, ...paramOverrides })
  return { widget, data }
}

/**
 * Constrained "AI" generation (PA-10): prompt → catalog selection only.
 * Rule-based matcher for the local build; a Claude call slots in behind the same
 * contract (the model may ONLY return catalog keys — never queries or code).
 */
export function generateFromPrompt(prompt: string): {
  widgets: { key: string; params?: Record<string, unknown> }[]
  explanation: string
} | { unsupported: true; message: string; suggestions: string[] } {
  const p = prompt.toLowerCase()
  const picks: { key: string; params?: Record<string, unknown> }[] = []
  const reasons: string[] = []

  if (/\b(bo|beneficial|ownership|ubo|monitor)/.test(p)) {
    picks.push({ key: "stat_bo_changes" }, { key: "table_bo_changes" }, { key: "graph_company", params: { root: "nusantara" } })
    reasons.push("beneficial-ownership monitoring (table + graph centered on the changed entity)")
  }
  if (/\b(revenue|sales|income|source|channel|partner|reseller)/.test(p)) {
    picks.push({ key: "chart_revenue_by_source" }, { key: "stat_commission_owed" })
    reasons.push("revenue by onboarding channel + commissions owed")
  }
  if (/\b(report|purchase|order|bought)/.test(p)) {
    picks.push({ key: "stat_my_reports" }, { key: "table_my_reports" }, { key: "chart_reports_by_day" })
    reasons.push("your report purchases")
  }
  if (/\b(funnel|sneak|upsell|conversion|upgrade)/.test(p)) {
    picks.push({ key: "chart_sneakpeek_funnel" })
    reasons.push("the sneak-peek upsell funnel")
  }
  if (/\b(graph|network|relationship|connect)/.test(p) && !picks.some((x) => x.key === "graph_company")) {
    const match = ENTITIES.find((e) => e.type !== "person" && p.includes(e.name.toLowerCase().split(" ")[0]))
    picks.push({ key: "graph_company", params: { root: match?.key ?? "whb" } })
    reasons.push(`relationship graph${match ? ` for ${match.name}` : ""}`)
  }

  if (!picks.length) {
    return {
      unsupported: true,
      message: "That request isn't in the widget catalog yet — Mina can only compose pre-approved widgets (no free-form queries).",
      suggestions: WIDGET_CATALOG.slice(0, 5).map((w) => w.name),
    }
  }
  const unique = picks.filter((x, i) => picks.findIndex((y) => y.key === x.key) === i)
  return { widgets: unique, explanation: `Built from the catalog: ${reasons.join("; ")}.` }
}
