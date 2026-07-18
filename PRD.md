# PRD — AiExe Platform Revamp, Phase 1 MVP

| | |
|---|---|
| **Product** | AiExe — AI-powered KYB/KYC platform (SSM-connected, Malaysia) |
| **Phase** | 1 (MVP) |
| **Status** | Draft v1 — 2026-07-17 |
| **Inputs** | `CLAUDE.md` (mandate), `guardrail.md` v2 (approved scope), `market.md` (research) |
| **Pending** | Pricing reconciliation vs internal wiki (Confluence J4BGE) · Jira audit (Step 3) |

---

## 1. Problem & Opportunity

Businesses in Malaysia that need to verify, monitor, and assess counterparties face incumbents that are either desktop-heavy and quote-opaque (Handshakes) or rigid direct-endpoint bureaus (OneCredit, CTOS, Experian). Meanwhile, the Companies (Amendment) Act 2024 now imposes recurring beneficial-ownership obligations (BO changes filed within 14 days via e-BOS), and BNM's revised e-KYC policy explicitly brings legal persons (KYB) into scope — creating compliance-driven, recurring demand for entity monitoring.

AiExe's current platform requires engineering involvement for routine operations (role changes, package changes, dashboard changes). Phase 1 must deliver **operational independence from engineers**, a **responsive UI**, and **stakeholder-approvable differentiation** against Handshakes and OneCredit.

## 2. Goals & Non-Goals

### Goals (Phase 1)
1. **Operational independence**: admins manage roles, packages, partners, resellers, and dashboards without code changes or engineer involvement.
2. **Monetization flexibility**: tiered subscriptions with a global Default Package, admin-set partner discounts and reseller commissions, and trackable onboarding sources (Direct / Partner / Reseller).
3. **Visible differentiation**: mobile-responsive relationship graphs, sneak-peek upselling, constrained AI dashboards — each demonstrable in a stakeholder demo.
4. **Channel foundation**: partners/resellers can onboard and manage their own users (B2B2B), a channel no competitor currently serves.

### Non-Goals (V2 — from guardrail.md)
- External datasource ingestion beyond existing SSM/CTOS/Experian integrations.
- WhatsApp/SMS or any non-in-app/email notification channel.
- Partner/reseller self-serve pricing controls.
- Unconstrained natural-language AI dashboard generation.
- Multi-jurisdiction registries (ACRA etc.), public partner sign-up funnel, managed-service KYB.

## 3. Personas

| Persona | Description | Primary needs |
|---|---|---|
| **Platform Admin** (AiExe ops) | Runs the platform day-to-day | Create/edit roles, packages, partner/reseller terms, default dashboards — without engineers |
| **Direct User** | SME credit/compliance/sales professional | Search entities, pull reports, monitor BO changes, personal dashboards; works from mobile in the field |
| **Team Main User** | Account owner of a team subscription | Master team dashboard, manage sub-users |
| **Sub-User** | Team member | Individual dashboard views within team account |
| **Partner** | Strategic org receiving admin-set discount/perks | Onboard and manage its own users; benefit from discounted pricing |
| **Reseller** | Channel seller earning admin-set commission | Onboard users at admin-set partner price; track commissions on their users' purchases |

## 4. Competitive Positioning (from `market.md`)

| Axis | Handshakes | OneCredit | **AiExe MVP** |
|---|---|---|---|
| Mobile/responsive UI | None (web/desktop only) | Not advertised | **Headline claim — release gate** |
| Pricing transparency | Quote-based, opaque | Public freemium + per-report | **Public tiers, benchmarked vs OneCredit** |
| Partner/reseller channel | None public | None | **Admin-managed B2B2B module** |
| Relationship graphs | Mature (4 map types) | Not advertised | Sigma-based, mobile-usable |
| AI dashboards | SEER (new/thin) | "AI-driven" (opaque) | Constrained AI generation |
| Malaysia SSM depth | Covered, SG-centric | Native | **Native + graph + channel** |

Benchmark to beat/match on per-report pricing: OneCredit — latest SSM profile RM12.90, risk report from RM8, Business tier RM300/mo. Data COGS floor: RM5–15.40 per fresh SSM pull (unless CSD bulk agreement).

## 5. Functional Requirements

### FR-1 Dynamic RBAC
- **FR-1.1** Roles are DB-backed records (name, description, permission set), CRUD-able by admins in a UI. No hardcoded role checks in feature code; all gating resolves through the permission layer.
- **FR-1.2** Permissions are enforced in Next.js middleware + server-side checks (no client-only gating). No Casbin/policy-engine dependency in MVP.
- **FR-1.3** Every role/permission change is audit-logged (actor, before/after, timestamp).
- **FR-1.4** Feature access = role permissions ∩ subscription-tier entitlements.
- **Acceptance**: an admin creates a new role, assigns it, and the user's access changes without deploy; audit trail shows the change.

### FR-2 Tier Gating & Sneak-Peek Upsell
- **FR-2.1** Each feature/module declares an entitlement key; packages map entitlement keys → allowed/locked.
- **FR-2.2** Locked features render a **sneak-peek state**: blurred/sample preview + benefit copy + "Upgrade" CTA (not a dead-end 403). Applies at minimum to Explorer-tier locks.
- **FR-2.3** Sneak-peek impressions and CTA clicks are tracked (upsell funnel metric).
- **Acceptance**: an Explorer user visiting a Professional-only module sees the preview + CTA; the click event is recorded; upgrading unlocks without re-login.

### FR-3 Subscription & Package Management
- **FR-3.1** Admin CRUD for packages: name, price, billing cycle, entitlement map, report-credit allowances. One package is flagged **Global Default**.
- **FR-3.2** Package tiers (names/prices **TBC vs internal pricing wiki**; structure benchmarked to market norms): Explorer (entry/freemium) → Professional → Enterprise (custom). Per-report credits modeled distinctly from platform fee, with data-COGS line non-discountable.
- **FR-3.3** Package changes version cleanly: existing subscribers keep terms until admin migrates them; price history is auditable.
- **FR-3.4** Every user account records an immutable **onboarding source**: Direct Sales / Partner(id) / Reseller(id).
- **Acceptance**: admin edits a package price; new sign-ups get the new price, existing users unaffected; finance view filters revenue by onboarding source.

### FR-4 Partner & Reseller (B2B2B) Module
- **FR-4.1** Admin creates partner orgs typed **Partner** (discount/perks on Default Package, terms set by admin) or **Reseller** (users billed at admin-set partner price; reseller earns admin-set commission % on purchases by users they onboarded).
- **FR-4.2** Partner/Reseller portal: onboard users (invite/link), view and manage own onboarded users. **No pricing controls visible to partners/resellers.**
- **FR-4.3** Commission ledger: every purchase by a reseller-onboarded user generates a ledger entry (order, amount, commission rate at time of sale, computed commission). Admin view for reconciliation/payout marking; reseller view read-only for their own earnings.
- **FR-4.4** Commission/discount computation applies to the platform/margin component only — data-COGS pass-through excluded (guardrail rule).
- **FR-4.5** All rate settings audit-logged (who set what rate, when).
- **Acceptance**: end-to-end demo — admin creates reseller with 20% commission → reseller invites a user → user purchases → ledger shows correct commission; partner-onboarded user sees discounted price automatically.

### FR-5 AI-Powered Custom Dashboards (constrained generation)
- **FR-5.1** A versioned **widget/query template catalog** (charts via Chart.js/Recharts, graph widgets via Sigma, tables, stat tiles) over pre-approved data queries. No free-text → SQL anywhere.
- **FR-5.2** User prompt → AI selects/parametrizes widgets from the catalog only; out-of-catalog requests get a graceful "not yet supported" with the nearest supported option.
- **FR-5.3** Admin: create default dashboards (all users) and targeted dashboards (group/role/partner). User: create/edit/delete personal dashboards. Team: Main User manages a master team dashboard; sub-users keep individual views.
- **FR-5.4** Dashboard configs are portable JSON (RDS-persisted), enabling duplication/templating.
- **Acceptance**: user types "show my monitored companies with recent BO changes" → dashboard renders from catalog widgets; an unsupported request degrades gracefully; admin-published default dashboard appears for all targeted users.

### FR-6 Responsive Relationship Graph (competitive gate)
- **FR-6.1** Sigma-based entity-relationship visualization usable on mobile/tablet: touch pan/zoom/tap-to-expand, responsive layout via AntD breakpoints.
- **FR-6.2** Graph view loads interactive within 3s on a mid-range mobile device over 4G for a typical entity neighborhood (performance budget; exact node-count threshold set during build).
- **FR-6.3** BO-monitoring framing: graph and monitoring UI surface beneficial-ownership changes prominently (Companies (Amendment) Act 2024 hook).
- **Acceptance**: stakeholder demo includes the graph walkthrough on a tablet and phone; interaction is smooth; a BO-change alert deep-links into the graph.

### FR-7 Notifications (minimal)
- **FR-7.1** In-app and email only (monitoring alerts, commission events, upgrade confirmations). No WhatsApp/SMS (V2).

## 6. Non-Functional Requirements

- **NFR-1 Responsiveness**: all MVP screens usable at 375px width; desktop-first layouts degrade gracefully via AntD grid. Release gate, not best-effort.
- **NFR-2 Auditability**: role changes, package changes, rate settings, and purchases are audit-logged with actor + timestamp.
- **NFR-3 Server-side enforcement**: entitlements, pricing, and commission math computed server-side only.
- **NFR-4 Compliance data retention**: where AI/ML verification touches BNM e-KYC scope, log verification outcomes so FAR can later be computed (BNM requires FAR ≤ 5% continuous measurement). Full compliance reporting is V2 — just don't discard the data.
- **NFR-5 Infra**: existing AWS ECS Fargate / RDS / DynamoDB via Terraform; no new managed services. Dashboards/config in RDS; high-churn data (e.g. sneak-peek events) may use DynamoDB.
- **NFR-6 Stack discipline**: Next.js 14 (App Router, TS) + Ant Design/Pro Components; Chart.js/Recharts/Sigma for visuals; Zustand + TanStack Query for state; Vitest + Playwright for tests.

## 7. Pricing (reconciled with internal wiki — "Infomina AI Products Pricing", v16, 2026-07-17)

### Tiers

| Tier | Price | Key terms |
|---|---|---|
| **Explorer** (FOC — Global Default Package) | Free | Pay-per-report menu; premium features (Mina Executive Summary, Visualization Graph, Mina Chat, BizInfo, Business Radius Scan, Stakeholder Insights, E-court Links, TIN) unlock as a bundle via **RM10 top-up** |
| **Pro** | **RM1,288/mo** standard · RM1,000 promo | 10 FOC ROC/ROB reports/year; member per-report rates; premium bundle free; 1-month free trial then revert to Explorer |
| **Elite** | **RM1,500/mo** | 50 FOC ROC/ROB reports/year; bulk voucher (currently manual — enhancement candidate); member rates |
| **Reseller price** | RM1,000/mo (AiExe) | Commission model per guardrails (admin-set) |
| Cognitive Ingestion Agent (separate product) | RM3,000/mo standard · RM1,500 promo/reseller | Max 100 docs/month, cloud |

Downgrade rule: previously-unlocked free items **remain free** after downgrade (entitlement persistence — FR-2/FR-3 must model this).

### Per-report menu (customer price, RM — member price where different)

SSM ROC/ROB 15.40 · SSM LLP 25.40 · SSM PDF free · Cert of Incorp 25.40 · CTC variants 25.40–35.40 · Idaman Report 20.80 · Idaman DocReader 10 (member 5) · Personal Involvement Report 55.40–105.40 · BIR 6 · DocReader Plus 15 (member free) · CBM Litigation 10 (member 6) · Property Transaction 10 (member 3) · Customized DocReaders (Legal/CoSec/bank-statement) 15 (member 10) · Cross-border: SG 50 / ID 180 / VN 35 / TH 35 / CN 35 (wiki notes TH 250 / IN 100 in the detailed breakdown — **discrepancy to confirm**)

Each menu item carries an explicit Cost + Service Fee + SST decomposition in the wiki — this maps directly onto the guardrail rule that commission/discount applies to the service-fee/margin component only, never the data-cost component.

### Notes vs market (`market.md`)
- AiExe's SSM ROC/ROB at RM15.40 vs OneCredit's "latest SSM profile" RM12.90: OneCredit undercuts on the headline SKU. Counter-position on bundle value (graph, AI chat, dashboards, cross-border) rather than price-matching below COGS (SSM cost is RM10 + RM5 service fee + SST).
- Pro RM1,288/mo sits well above OneCredit Business (RM300/mo) — the tier story must sell breadth (cross-border, DocReader automation, AI features), not just SSM access.

## 8. Success Metrics

| Goal | Metric | Target (MVP) |
|---|---|---|
| Operational independence | Engineer tickets for role/package/dashboard changes | ~0 after launch (all admin-UI) |
| Upsell engine | Sneak-peek impression → upgrade CTA CTR; CTA → upgrade conversion | Baseline established; funnel instrumented day 1 |
| Channel foundation | Partners/resellers live; % of new users via Partner/Reseller sources | ≥1 live reseller + 1 partner in pilot |
| Differentiation | Stakeholder demo sign-off incl. mobile graph walkthrough | Approved |
| Dashboards | % active users with ≥1 custom dashboard | Baseline established |

## 9. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| OneCredit price aggression (launched Feb 2026, undercuts incumbents) | Pricing pressure | Public transparent tiers; compete on channel + dashboards + mobile, not price alone |
| Constrained AI dashboards feel underwhelming vs "AI" hype | Demo risk | Invest in prompt→widget mapping quality and curated catalog breadth; graceful degradation copy |
| Commission/discount edge cases (refunds, mid-cycle changes) | Finance correctness | Ledger records rate-at-time-of-sale; keep MVP policy simple (e.g. commissions on settled payments only); document policy in admin UI |
| Mobile graph performance on large neighborhoods | Headline claim fails | Performance budget (FR-6.2), neighborhood-size capping, progressive expansion |
| Pricing wiki drift vs PRD placeholders | Stakeholder confusion | Reconcile §7 against Confluence page before any external presentation |
| RBAC middleware outgrows itself | Tech debt | Acceptable for MVP by guardrail; revisit policy engine only on demonstrated complexity |

## 10. Dependencies & Open Items

1. ~~Internal pricing wiki~~ — **resolved 2026-07-17**: §7 reconciled with "Infomina AI Products Pricing" (v16). Open sub-item: TH/IN cross-border price discrepancy between the package table and detailed breakdown.
2. ~~Jira audit (workflow Step 3)~~ — **resolved 2026-07-17**: see `jira-audit.md` (ticket mapping, bug-pattern lessons, V2 pushes) and `execution-plan.md` (Step 4 phased plan).
3. **SSM CSD/bulk agreement status** — affects per-report margin floor.
4. **Payment/billing rails** — confirm existing payment provider supports admin-variable pricing + commission ledger needs.

## 11. Release Gates (Phase 1 done =)

1. Admin performs a role change, package edit, partner creation, and default-dashboard publish — zero engineer involvement.
2. Sneak-peek → upgrade funnel works end-to-end and is instrumented.
3. Reseller flow demo: create reseller → invite → purchase → correct commission in ledger.
4. Mobile/tablet graph walkthrough passes stakeholder demo.
5. All entitlement/pricing/commission logic server-side, audit-logged, and covered by Vitest unit tests + Playwright e2e for the four flows above.
