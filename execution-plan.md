# Execution Plan — AiExe Phase 1 MVP (Step 4)

*Inputs: `guardrail.md` v2 (approved scope) · `PRD.md` (reconciled pricing) · `jira-audit.md` (ticket mapping) · `market.md` (positioning). Timeline uses indicative 2-week sprints; calibrate to actual team capacity.*

---

## 0. Strategy in One Paragraph

Build the **entitlement/pricing core first** (it unblocks everything: gating, sneak-peek, packages, partner terms), run **dashboards and graph work in parallel** (both have active tickets — AE-110, AE-325, AIEX-203), and close with **hardening + the stakeholder demo** that proves the three competitive claims: mobile graph (vs Handshakes), transparent tiers (vs everyone), and a live partner→user→purchase→commission flow (vs OneCredit). Every recurring manual-ops ticket killed along the way is direct progress on the "operational independence" prime directive.

---

## Sprint 0 (1 week) — Foundations & Cleanup

**Engineering**
- Data model design review: `roles`, `permissions`, `packages`, `entitlements`, `partner_orgs`, `commission_ledger`, `dashboard_configs`, `onboarding_source` (RDS; migrations planned once).
- Purchase state machine design (lesson #1 from jira-audit): states, reconciliation job, settled-only commission binding. Applies to existing checkout prio items (AE-315/316/320/321) as they merge.
- Ship what's parked in *ready for production*: AE-303 (Client Management), AE-268 (Pricing Package FE design), AE-287 (DoA Migration II), AE-294 (voucher filter by product).

**Product/PM**
- Migrate AIEX-203/201 into AE; close AIEX board.
- Create the 13 net-new tickets from `jira-audit.md` §5; tag everything `mvp-p1`; move §3 list to a `v2` label and out of the sprint view.
- Resolve the TH/IN cross-border price discrepancy in the pricing wiki.

**Exit:** schema approved, board reflects guardrails exactly, state-machine ADR written.

## Phase A — Sprints 1–2: RBAC + Entitlement/Pricing Core

*Tickets: AE-49 epic (rescoped), AE-246, AE-51, AE-117, AE-30/31/10, AE-245, AE-323, net-new #1–5.*

- **S1 BE:** role/permission tables + CRUD APIs; Next.js middleware enforcement; audit-log writes (actor, before/after). Package model with entitlement map, data-COGS line separated, Global Default flag.
- **S1 FE:** Admin role-management UI (AntD Pro tables/forms); package admin UI extending AE-268's design.
- **S2 BE:** role×tier entitlement resolution; package versioning + subscriber migration; onboarding-source attribution on all signup paths (direct, YYC SSO, invite links).
- **S2 FE:** **Sneak-peek engine** — locked-state wrapper component (blur/sample + benefit copy + upgrade CTA), driven by entitlement keys; impression/CTA event instrumentation. Generalize AE-119's TIN CTA into this pattern.
- **Kill recurring ops:** bulk user-lifecycle admin tool (replaces monthly YYC deletion tickets).

**Exit demo:** admin creates a role and edits a package with zero deploys; Explorer user sees sneak-peek on a Pro feature; events flow to analytics.

## Phase B — Sprints 3–4: Partner/Reseller Module + Finance

*Tickets: AE-128 (Xmartalex), AE-100 (PEPS), AE-331/303 base, AE-122+subtasks, voucher family, net-new #6–7, #13.*

- **S3 BE:** partner-org model with typed terms — Partner (admin-set discount on platform component) vs Reseller (admin-set partner price + commission %). Rate settings audit-logged. Voucher scoping hardened (product-scope model shared with entitlements — fixes AE-261 class).
- **S3 FE:** Admin partner management UI; partner/reseller portal shell — invite/onboard users, view own users (no pricing controls).
- **S4 BE:** commission ledger (order, amount, rate-at-time-of-sale, computed commission, settled-only); purchase state machine hardening + reconciliation job live on all buy flows.
- **S4 FE:** reseller earnings view (read-only); admin reconciliation/payout view; finance filters by onboarding source (extends AE-41/42 work).
- Onboard **Xmartalex and PEPS as the pilot reseller/partner** on the new module — their bespoke backlog tickets close as byproducts.

**Exit demo:** admin creates reseller @20% → reseller invites user → user buys a report → ledger shows correct commission; partner-onboarded user sees discounted price automatically.

## Phase C — Sprints 3–5 (parallel track): AI Dashboards + Responsive Graph

*Runs parallel to Phase B with the dashboard/graph-focused engineers. Tickets: AE-110 (in progress), AE-125/149, AE-147, AE-146/213 (merged), AIEX-203/201, AE-325, net-new #8–12.*

- **S3:** widget/query template catalog v1 — server-side metric definitions (kills the hardcoded-ratio bug class: AE-239/240/252), Chart.js/Recharts/Sigma/table/stat-tile widget types, versioned JSON schema.
- **S4:** constrained generation service — prompt → catalog selection/parametrization, graceful "not supported" fallback; personal dashboard CRUD; admin default + targeted dashboards (group/role/partner); team master dashboard (AE-147).
- **S3–S5 graph:** continue AIEX-203 optimisation → mobile touch interactions (pan/zoom/tap-expand), AntD breakpoint layouts, neighborhood-size capping to meet the 3s/4G budget; BO-change alert deep-link into graph (net-new #12).

**Exit demo:** "show my monitored companies with recent BO changes" renders a dashboard; the same graph is smooth on a phone.

## Phase D — Sprint 6: Hardening, Mobile Gate & Stakeholder Demo

- Playwright e2e for the 4 release-gate flows; Vitest coverage on entitlement/pricing/commission math; load-test graph perf budget on mid-range mobile.
- Responsive audit of all MVP screens at 375px (NFR-1 release gate).
- e-KYC data-retention check: verification outcomes logged (NFR-4).
- **Stakeholder demo script** (maps to §4 of `market.md`):
  1. *vs Handshakes:* tablet + phone graph walkthrough, BO-change alert → graph.
  2. *vs OneCredit:* public pricing page (Explorer/Pro/Elite), sneak-peek upsell journey, AI dashboard prompt.
  3. *B2B2B (uncontested):* live partner onboarding → purchase → commission ledger.
  4. *Ops independence:* admin changes a role, a price, and publishes a dashboard — no engineers.

**Exit:** all 5 PRD release gates green; stakeholder sign-off.

---

## Workstream / Team Split

| Track | Focus | Phases |
|---|---|---|
| **Core BE** (2) | RBAC, entitlements, packages, partner/commission, state machine | 0–B |
| **Core FE** (2) | Admin UIs, sneak-peek engine, partner portal, finance views | A–B |
| **Dash/Graph** (2) | Widget catalog, constrained AI generation, Sigma mobile work | C |
| **QA/Release** (1, shared) | e2e gates, responsive audit, demo rehearsal | D (embedded earlier) |

Dependencies: Phase B needs A's package/entitlement model (S2). Phase C's targeting needs A's roles (S2) but catalog work starts independently in S3. Nothing in C blocks B.

## Milestones

| End of | Milestone |
|---|---|
| Sprint 0 | Board clean, schema + state-machine ADRs approved |
| Sprint 2 | RBAC + packages + sneak-peek live in staging |
| Sprint 4 | Pilot partner & reseller live; commission ledger correct |
| Sprint 5 | Dashboards + mobile graph feature-complete |
| Sprint 6 | Release gates green; stakeholder demo & sign-off |

## Top Risks in This Plan

1. **AE-110/AE-325 drift** — active work predates the catalog design; align in Sprint 0 so in-flight dashboard/graph code adopts the catalog rather than fighting it.
2. **Pilot partner availability** (Xmartalex/PEPS) — confirm in Sprint 0; a synthetic pilot org is the fallback for the demo.
3. **Payment-flow surface area** — SenangPay routing changes (AE-330/329) mid-MVP; freeze gateway scope until the state machine lands.
4. **Single shared QA** — release gates concentrate risk in Sprint 6; pull the responsive audit forward into each phase's exit demo.
