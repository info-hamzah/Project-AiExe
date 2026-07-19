import { q, tx, writeAudit } from "@/lib/db"

/**
 * Partner/Reseller service (PA-6/PA-7, ADR-001 §3).
 * Typed orgs with versioned admin-attributed terms; commission entries are immutable
 * and bind only to settled orders. Requires Postgres (Module 2 runs on the DB).
 */

export interface PartnerTerms {
  version: number
  discountPct: number | null
  commissionPct: number | null
  setBy: string
  effectiveFrom: string
}

export interface PartnerOrgView {
  id: string
  name: string
  type: "partner" | "reseller"
  status: string
  repUserId: string | null
  repName: string | null
  terms: PartnerTerms | null
  termsHistory: PartnerTerms[]
  userCount: number
}

export interface LedgerEntry {
  id: string
  orderId: string
  resellerName: string
  grossCents: number
  marginCents: number
  commissionPct: number
  commissionCents: number
  state: string
  createdAt: string
}

const mapTerms = (r: { version: number; discount_pct: string | null; commission_pct: string | null; set_by_user_id: string; effective_from: string }): PartnerTerms => ({
  version: r.version,
  discountPct: r.discount_pct !== null ? Number(r.discount_pct) : null,
  commissionPct: r.commission_pct !== null ? Number(r.commission_pct) : null,
  setBy: r.set_by_user_id,
  effectiveFrom: r.effective_from,
})

export const partnerService = {
  async listOrgs(): Promise<PartnerOrgView[]> {
    const orgs = await q<{ id: string; name: string; type: "partner" | "reseller"; status: string; rep_user_id: string | null; rep_name: string | null; user_count: number }>(
      `SELECT po.id, po.name, po.type, po.status, po.rep_user_id, u.name AS rep_name,
              (SELECT count(*)::int FROM partner_users pu WHERE pu.partner_org_id = po.id) AS user_count
       FROM partner_orgs po LEFT JOIN users u ON u.id = po.rep_user_id
       ORDER BY po.created_at`,
    )
    const terms = await q<{ partner_org_id: string; version: number; discount_pct: string | null; commission_pct: string | null; set_by_user_id: string; effective_from: string }>(
      "SELECT partner_org_id, version, discount_pct, commission_pct, set_by_user_id, effective_from FROM partner_terms ORDER BY partner_org_id, version",
    )
    return orgs.rows.map((o) => {
      const hist = terms.rows.filter((t) => t.partner_org_id === o.id).map(mapTerms)
      return {
        id: o.id, name: o.name, type: o.type, status: o.status,
        repUserId: o.rep_user_id, repName: o.rep_name,
        terms: hist[hist.length - 1] ?? null, termsHistory: hist, userCount: o.user_count,
      }
    })
  },

  async createOrg(
    input: { name: string; type: "partner" | "reseller"; discountPct?: number; commissionPct?: number; repName?: string; repEmail?: string },
    actorId: string,
  ): Promise<string> {
    return tx(async (c) => {
      const org = await c.query(
        "INSERT INTO partner_orgs (name, type) VALUES ($1, $2) RETURNING id",
        [input.name, input.type],
      )
      const orgId = org.rows[0].id as string
      await c.query(
        `INSERT INTO partner_terms (partner_org_id, version, discount_pct, commission_pct, set_by_user_id)
         VALUES ($1, 1, $2, $3, $4)`,
        [orgId, input.type === "partner" ? input.discountPct ?? 0 : null, input.type === "reseller" ? input.commissionPct ?? 0 : null, actorId],
      )
      if (input.repName && input.repEmail) {
        const rep = await c.query(
          `INSERT INTO users (name, email, onboarding_source, onboarding_partner_org_id)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
          [input.repName, input.repEmail, input.type, orgId],
        )
        await c.query("UPDATE partner_orgs SET rep_user_id = $2 WHERE id = $1", [orgId, rep.rows[0].id])
        // rep gets the portal + member roles
        await c.query(
          `INSERT INTO user_roles (user_id, role_id)
           SELECT $1::uuid, r.id FROM roles r WHERE r.name IN ('Partner Rep', 'Member')
           ON CONFLICT DO NOTHING`,
          [rep.rows[0].id],
        )
        // default package subscription
        await c.query(
          `INSERT INTO subscriptions (subject_id, package_version_id, status)
           SELECT $1::uuid, pv.id, 'active' FROM package_versions pv
           JOIN packages p ON p.id = pv.package_id AND p.is_default
           ORDER BY pv.version DESC LIMIT 1`,
          [rep.rows[0].id],
        )
      }
      const rate = input.type === "partner" ? `${input.discountPct ?? 0}% discount` : `${input.commissionPct ?? 0}% commission`
      await c.query(
        "INSERT INTO audit_log (actor_id, entity_type, entity_id, action, after) VALUES ($1, 'partner_org', $2, 'create', jsonb_build_object('summary', $3::text))",
        [actorId, orgId, `Created ${input.type} "${input.name}" (${rate})`],
      )
      return orgId
    })
  },

  async setTerms(orgId: string, input: { discountPct?: number; commissionPct?: number }, actorId: string): Promise<void> {
    await tx(async (c) => {
      const org = await c.query("SELECT name, type FROM partner_orgs WHERE id = $1", [orgId])
      if (!org.rowCount) throw Object.assign(new Error("org not found"), { status: 404 })
      const cur = await c.query("SELECT COALESCE(MAX(version), 0) AS v FROM partner_terms WHERE partner_org_id = $1", [orgId])
      const type = org.rows[0].type as string
      await c.query(
        `INSERT INTO partner_terms (partner_org_id, version, discount_pct, commission_pct, set_by_user_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [orgId, Number(cur.rows[0].v) + 1, type === "partner" ? input.discountPct ?? 0 : null, type === "reseller" ? input.commissionPct ?? 0 : null, actorId],
      )
      const rate = type === "partner" ? `${input.discountPct}% discount` : `${input.commissionPct}% commission`
      await c.query(
        "INSERT INTO audit_log (actor_id, entity_type, entity_id, action, after) VALUES ($1, 'partner_terms', $2, 'rate_change', jsonb_build_object('summary', $3::text))",
        [actorId, orgId, `Set ${org.rows[0].name} terms v${Number(cur.rows[0].v) + 1}: ${rate}`],
      )
    })
  },

  /** Org the given user represents (rep) — powers the partner portal. */
  async orgForRep(userId: string): Promise<PartnerOrgView | null> {
    const orgs = await this.listOrgs()
    return orgs.find((o) => o.repUserId === userId) ?? null
  },

  async listOnboardedUsers(orgId: string) {
    const { rows } = await q<{ id: string; name: string; email: string; joined_at: string; package: string | null }>(
      `SELECT u.id, u.name, u.email, pu.joined_at,
              (SELECT p.name FROM subscriptions s
               JOIN package_versions pv ON pv.id = s.package_version_id
               JOIN packages p ON p.id = pv.package_id
               WHERE s.subject_id = u.id AND s.status = 'active'
               ORDER BY s.started_at DESC LIMIT 1) AS package
       FROM partner_users pu JOIN users u ON u.id = pu.user_id
       WHERE pu.partner_org_id = $1 ORDER BY pu.joined_at DESC`,
      [orgId],
    )
    return rows
  },

  /** Rep onboards a customer: attributed user + membership + Member role + default package. */
  async onboardUser(orgId: string, input: { name: string; email: string }, actorId: string): Promise<void> {
    await tx(async (c) => {
      const org = await c.query("SELECT name, type FROM partner_orgs WHERE id = $1", [orgId])
      if (!org.rowCount) throw Object.assign(new Error("org not found"), { status: 404 })
      const user = await c.query(
        `INSERT INTO users (name, email, onboarding_source, onboarding_partner_org_id)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [input.name, input.email, org.rows[0].type, orgId],
      )
      const userId = user.rows[0].id as string
      await c.query("INSERT INTO partner_users (partner_org_id, user_id, invited_by) VALUES ($1, $2, $3)", [orgId, userId, actorId])
      await c.query(
        "INSERT INTO user_roles (user_id, role_id) SELECT $1::uuid, r.id FROM roles r WHERE r.name = 'Member' ON CONFLICT DO NOTHING",
        [userId],
      )
      await c.query(
        `INSERT INTO subscriptions (subject_id, package_version_id, status)
         SELECT $1::uuid, pv.id, 'active' FROM package_versions pv
         JOIN packages p ON p.id = pv.package_id AND p.is_default
         ORDER BY pv.version DESC LIMIT 1`,
        [userId],
      )
      await c.query(
        "INSERT INTO audit_log (actor_id, entity_type, entity_id, action, after) VALUES ($1, 'partner_users', $2, 'create', jsonb_build_object('summary', $3::text))",
        [actorId, userId, `${org.rows[0].name} onboarded ${input.name} (${org.rows[0].type} channel)`],
      )
    })
  },

  /** Buyer's channel context at purchase time: org + latest terms. */
  async channelForBuyer(buyerId: string): Promise<{ orgId: string; orgName: string; type: "partner" | "reseller"; discountPct: number; commissionPct: number } | null> {
    const { rows } = await q<{ org_id: string; name: string; type: "partner" | "reseller"; discount_pct: string | null; commission_pct: string | null }>(
      `SELECT po.id AS org_id, po.name, po.type, pt.discount_pct, pt.commission_pct
       FROM users u
       JOIN partner_orgs po ON po.id = u.onboarding_partner_org_id
       JOIN LATERAL (
         SELECT discount_pct, commission_pct FROM partner_terms
         WHERE partner_org_id = po.id ORDER BY version DESC LIMIT 1
       ) pt ON true
       WHERE u.id = $1 AND po.status = 'active'`,
      [buyerId],
    )
    if (!rows.length) return null
    const r = rows[0]
    return {
      orgId: r.org_id, orgName: r.name, type: r.type,
      discountPct: r.discount_pct !== null ? Number(r.discount_pct) : 0,
      commissionPct: r.commission_pct !== null ? Number(r.commission_pct) : 0,
    }
  },

  /** Immutable settled ledger entry — margin component only (guardrail rule). */
  async recordCommission(entry: { orderId: string; orgId: string; grossCents: number; marginCents: number; commissionPct: number }): Promise<void> {
    const commissionCents = Math.round((entry.marginCents * entry.commissionPct) / 100)
    await q(
      `INSERT INTO commission_ledger (order_id, reseller_org_id, gross_cents, margin_component_cents, commission_pct_at_sale, commission_cents, state)
       VALUES ($1, $2, $3, $4, $5, $6, 'settled')`,
      [entry.orderId, entry.orgId, entry.grossCents, entry.marginCents, entry.commissionPct, commissionCents],
    )
  },

  async listLedger(orgId?: string): Promise<{ entries: LedgerEntry[]; totals: { settledCents: number; paidCents: number } }> {
    const { rows } = await q<{ id: string; order_id: string; reseller_name: string; gross_cents: number; margin_component_cents: number; commission_pct_at_sale: string; commission_cents: number; state: string; payout_id: string | null; created_at: string }>(
      `SELECT cl.id, cl.order_id, po.name AS reseller_name, cl.gross_cents, cl.margin_component_cents,
              cl.commission_pct_at_sale, cl.commission_cents, cl.state, cl.payout_id, cl.created_at
       FROM commission_ledger cl JOIN partner_orgs po ON po.id = cl.reseller_org_id
       WHERE ($1::uuid IS NULL OR cl.reseller_org_id = $1) ORDER BY cl.created_at DESC LIMIT 100`,
      [orgId ?? null],
    )
    const entries = rows.map((r) => ({
      id: r.id, orderId: r.order_id, resellerName: r.reseller_name,
      grossCents: r.gross_cents, marginCents: r.margin_component_cents,
      commissionPct: Number(r.commission_pct_at_sale), commissionCents: r.commission_cents,
      state: r.payout_id ? "paid" : r.state, createdAt: r.created_at,
    }))
    return {
      entries,
      totals: {
        settledCents: entries.filter((e) => e.state === "settled").reduce((a, e) => a + e.commissionCents, 0),
        paidCents: entries.filter((e) => e.state === "paid").reduce((a, e) => a + e.commissionCents, 0),
      },
    }
  },

  /** Mark all currently-settled entries of an org as paid (one payout batch). */
  async markPaid(orgId: string, actorId: string): Promise<number> {
    return tx(async (c) => {
      const pending = await c.query(
        "SELECT id, commission_cents FROM commission_ledger WHERE reseller_org_id = $1 AND state = 'settled' AND payout_id IS NULL",
        [orgId],
      )
      if (!pending.rowCount) return 0
      const total = pending.rows.reduce((a: number, r: { commission_cents: number }) => a + Number(r.commission_cents), 0)
      const payout = await c.query(
        "INSERT INTO payouts (reseller_org_id, period, total_cents, marked_paid_by, paid_at) VALUES ($1, daterange(date_trunc('month', now())::date, now()::date, '[]'), $2, $3, now()) RETURNING id",
        [orgId, total, actorId],
      )
      await c.query(
        "UPDATE commission_ledger SET payout_id = $2 WHERE id = ANY($1::uuid[])",
        [pending.rows.map((r: { id: string }) => r.id), payout.rows[0].id],
      )
      await c.query(
        "INSERT INTO audit_log (actor_id, entity_type, entity_id, action, after) VALUES ($1, 'payout', $2, 'create', jsonb_build_object('summary', $3::text))",
        [actorId, payout.rows[0].id, `Marked ${pending.rowCount} commission entries paid (RM${(total / 100).toFixed(2)})`],
      )
      return pending.rowCount
    })
  },
}
