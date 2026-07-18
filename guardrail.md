# AiExe Platform Revamp — Phase 1 MVP Guardrails

*v2 — enhanced with market research findings (see `market.md`). Approved scope decisions from stakeholder interview are preserved unchanged.*

## In-Scope (Phase 1 MVP — non-negotiable)

### Dynamic RBAC & Gating
- Admin-managed roles (no hardcoded roles in code).
- Feature gating driven by subscription tier.
- "Sneak Peek" upsell UI on locked features (e.g. Explorer tier) with CTA to upgrade.

### Tiered Subscription & Finance Management
- Trackable onboarding sources: Direct Sales, Partner, Reseller.
- Global Default Package (fixed pricing baseline for all users unless overridden).
- Two distinct B2B2B relationship types, both **admin-controlled**, no partner/reseller self-serve pricing UI in MVP:
  - **Partner**: receives a discount/perks on the Default Package. Admin sets the discount terms per partner.
  - **Reseller**: onboarded users are billed at a partner price set by the admin; the reseller earns a commission (rate set by admin) on purchases made by users they onboarded.
- Partners/Resellers can onboard and manage their own users, but cannot set or edit pricing themselves in MVP.
- **[research-informed]** Commission/discount math must apply to the **platform/margin component only** — never to pass-through data cost (SSM profile pulls cost RM5–15.40 each at source; bureau reports have their own COGS). The pricing engine must model data COGS as a distinct, non-discountable line.

### AI-Powered Custom Dashboards
- Admin: create default dashboards (all users) and custom dashboards targeted at specific groups/roles/partners.
- User: create personal dashboards via **constrained AI generation** — prompt-driven, but limited to a pre-approved set of data queries/widgets (no arbitrary free-form query generation).
- Team Accounts: Main User creates a master/team dashboard; sub-users retain individual dashboard views.

### Competitor Edge (must be visible in the MVP, not just backend)
- Next.js/Sigma-powered relationship visualization, responsive on mobile/tablet. **[research-validated]** Handshakes is confirmed web/desktop-only with no mobile story anywhere in their product marketing — this edge is real and verifiable; the demo must include a mobile/tablet walkthrough of the graph view.
- Reseller/Partner (B2B2B) onboarding flow visibly differentiated. **[research-validated]** Neither Handshakes, OneCredit, nor the SSM data portals run a public partner/reseller program — this channel is uncontested; the MVP demo must show a partner onboarding a user end-to-end.
- **[research-informed]** Transparent pricing as a weapon: Handshakes and the incumbent bureaus are quote-based/opaque; OneCredit publishes a freemium + per-report menu (Business RM300/mo; latest SSM profile RM12.90). AiExe's package page must present clear tier pricing benchmarked against OneCredit's public price list.
- **[research-informed]** Beneficial-ownership monitoring hook: the Companies (Amendment) Act 2024 imposes recurring BO filing/update obligations (14-day change window, e-BOS). Entity-monitoring and graph features should be framed around this compliance driver in UI copy and sales collateral.

---

## Out-of-Scope (V2 — actively excluded from Phase 1)
- External datasource ingestion (new third-party data sources beyond existing SSM/CTOS/Experian integrations).
- WhatsApp / SMS / any non-in-app/email notification channel.
- Partner/Reseller self-serve pricing controls (admin remains sole pricing authority in MVP).
- Full natural-language/unconstrained AI dashboard generation (arbitrary prompt → arbitrary query).
- **[added]** Multi-jurisdiction registry coverage (ACRA/Singapore etc.) — Handshakes' turf; Malaysia-native depth is the MVP positioning. Do not spend Phase 1 effort on non-Malaysian registries.
- **[added]** Public self-serve partner sign-up — partner/reseller creation remains an admin action in MVP; a public "become a partner" funnel is V2.
- **[added]** Managed-service KYB (human-in-the-loop reports à la Handshakes KYB Services) — product stays self-serve software in Phase 1.

---

## Repo Rules
- **All revamp work is committed and pushed ONLY to `https://github.com/info-hamzah/Project-AiExe`** (the ground-up revamp workspace).
- **Never push to `InfominaAi/InfominaAI-FE`** or any other InfominaAi org repo — those are the live/legacy systems, used strictly as read-only reference.
- Work from the `info-hamzah` GitHub account.

## Tech Rules (fastest time-to-market, aligned to existing stack)
- **RBAC**: lightweight Next.js middleware + DB-backed role/permission tables. Do not introduce a full policy-engine dependency (e.g. Casbin) for MVP — revisit only if role complexity outgrows middleware checks.
- **Frontend**: stay within Next.js 14 (App Router, TS) + Ant Design/Pro Components; no new UI framework. Mobile responsiveness via AntD grid/breakpoints is a release gate, not a nice-to-have (it is the headline competitive claim).
- **Dashboards**: constrained AI generation must map to a fixed, versioned set of query templates/widgets — no dynamic SQL/query generation from free text.
- **Billing/commission logic**: server-side only, admin-configurable rates stored in DB (not hardcoded), auditable (who set what rate, when). Data-COGS line items modeled separately from platform fees (see pricing guardrail above).
- **Infra**: continue on existing AWS ECS Fargate / RDS / DynamoDB Terraform-managed setup — no new infra services introduced for MVP features.
- **[added] Compliance posture**: where AI/ML verification features touch BNM e-KYC scope, log verification outcomes so a False Acceptance Rate can be measured (BNM requires FAR ≤ 5% with continuous measurement). Do not build the full compliance reporting suite in MVP — just don't discard the data.

---

## Open Items
- **Pricing wiki reconciliation**: internal pricing package/breakdown (Confluence page J4BGE) not yet machine-readable in this session — PRD pricing section uses tier names from CLAUDE.md + market benchmarks, marked TBC until reconciled.
- **Jira audit (Step 3)**: pending Atlassian MCP tools becoming available in-session (server authenticated, tools not yet registered — restart likely required).
