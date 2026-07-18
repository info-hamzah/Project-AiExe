# Project-AiExe — Phase 1 MVP Revamp

Ground-up revamp of **AiExe**, Infomina's AI-powered KYB/KYC platform connected to SSM (Malaysia). Phase 1 delivers **operational independence from engineers** (admin-managed roles, pricing, partners, dashboards), a **responsive UI** on the Infomina brand, and visible differentiation against **Handshakes** (desktop-only incumbent) and **OneCredit** (rigid direct-endpoint bureau, launched Feb 2026).

> ⚠️ **Repo rule (guardrail.md):** all revamp work is pushed **only to this repo**. `InfominaAi/*` org repos are read-only reference.

## Document index

| Doc | What it holds |
|---|---|
| [`guardrail.md`](guardrail.md) | Approved scope: in/out of Phase 1, tech + repo rules |
| [`PRD.md`](PRD.md) | Functional requirements FR-1–7, NFRs, reconciled pricing, release gates |
| [`market.md`](market.md) | Competitive research: Handshakes, OneCredit, CTOS/Experian, SSM data costs, pricing norms |
| [`jira-audit.md`](jira-audit.md) | 328-ticket audit of the old boards: reuse map, bug-pattern lessons, V2 pushes |
| [`execution-plan.md`](execution-plan.md) | Sprint 0 → Phase D plan, team split, risks |
| [`docs/adr/ADR-001-data-model.md`](docs/adr/ADR-001-data-model.md) | Core schema (implemented in [`migrations/`](migrations)) |
| [`docs/adr/ADR-002-purchase-state-machine.md`](docs/adr/ADR-002-purchase-state-machine.md) | Order lifecycle + reconciler |
| [`docs/ui-design-system.md`](docs/ui-design-system.md) | Approved design system (implemented in [`frontend/src/theme`](frontend/src/theme)) |

Project tracking: **Linear → team `PA` → project "AiExe Phase 1 MVP"** (24 issues across 5 milestones; `migrated` label = carried from the old Jira boards with lineage notes).

## Plan at a glance

```mermaid
gantt
    dateFormat  YYYY-MM-DD
    axisFormat  %d %b
    section Sprint 0
    Schema + ADRs + board hygiene            :done, s0, 2026-07-18, 2026-07-24
    section Phase A
    RBAC + entitlement/pricing core + sneak-peek :a, 2026-07-27, 2026-08-21
    section Phase B
    Partner/Reseller + commission ledger     :b, 2026-08-24, 2026-09-18
    section Phase C (parallel)
    AI dashboards + mobile graph             :c, 2026-08-24, 2026-10-02
    section Phase D
    Hardening + stakeholder demo             :d, 2026-10-05, 2026-10-16
```

**Release gates (Phase 1 done =)** ① admin runs role/package/partner/dashboard changes with zero engineer involvement · ② sneak-peek → upgrade funnel instrumented · ③ reseller flow produces a correct commission-ledger entry · ④ mobile/tablet graph walkthrough passes · ⑤ server-side money/entitlement logic, audit-logged, e2e-tested.

## Architecture

```mermaid
flowchart LR
    subgraph FE["frontend/ · Next.js 14 + AntD v5"]
        Shell["AppShell<br/>(navy shell, responsive)"]
        DS["/design route<br/>(design-system reference)"]
        Locked["LockedFeature<br/>(sneak-peek upsell)"]
        Dash["Dashboard FE<br/>(widget registry)"]
        Graph["Sigma graph<br/>(mobile-first)"]
    end
    subgraph API["API layer (single writer)"]
        Resolver["effective_access resolver<br/>(roles ∩ tier entitlements)"]
        Pricing["price(package,item,ctx)<br/>→ cost/fee/SST breakdown"]
        Orders["Order state machine<br/>+ 5-min reconciler"]
        GenAI["Constrained AI generation<br/>(prompt → widget catalog)"]
    end
    subgraph DB["RDS Postgres (migrations/)"]
        RBAC[(roles · permissions)]
        Pkg[(packages · versions<br/>· item_prices)]
        Partner[(partner_orgs · terms<br/>· commission_ledger)]
        Ord[(orders · order_events)]
        Widgets[(widget_catalog<br/>· dashboard_configs)]
        Audit[(audit_log)]
    end
    Dyn[(DynamoDB<br/>sneak-peek events)]
    Shell --> Resolver
    Locked -- impressions/CTA --> Dyn
    Dash --> GenAI --> Widgets
    Resolver --> RBAC
    Resolver --> Pkg
    Pricing --> Pkg
    Orders --> Ord
    Orders -- settled only --> Partner
    API --> Audit
```

## Core data model (ADR-001, simplified)

```mermaid
erDiagram
    ROLES ||--o{ ROLE_PERMISSIONS : has
    ROLES ||--o{ USER_ROLES : "assigned to users"
    PACKAGES ||--o{ PACKAGE_VERSIONS : "immutable versions"
    PACKAGE_VERSIONS ||--o{ SUBSCRIPTIONS : "subscribers pin to"
    CATALOG_ITEMS ||--o{ ITEM_PRICES : "cost + fee + SST"
    PARTNER_TEMPLATES ||--o{ PARTNER_ORGS : "template-driven"
    PARTNER_ORGS ||--o{ PARTNER_TERMS : "versioned, attributed"
    PARTNER_ORGS ||--o{ PARTNER_USERS : onboards
    ORDERS ||--o{ ORDER_EVENTS : "append-only log"
    ORDERS ||--o| COMMISSION_LEDGER : "settled → entry"
    PARTNER_ORGS ||--o{ COMMISSION_LEDGER : earns
    WIDGET_CATALOG ||--o{ DASHBOARD_CONFIGS : "renders from"
```

## Order lifecycle (ADR-002)

```mermaid
stateDiagram-v2
    [*] --> DRAFT
    DRAFT --> PENDING_PAYMENT
    PENDING_PAYMENT --> PAID
    PENDING_PAYMENT --> PAYMENT_FAILED
    PENDING_PAYMENT --> EXPIRED
    PAYMENT_FAILED --> PENDING_PAYMENT : retry
    PAID --> FULFILLING : credits + ledger fire here
    FULFILLING --> FULFILLED
    FULFILLING --> FULFILLMENT_FAILED
    FULFILLMENT_FAILED --> FULFILLING : bounded auto-retry
    FULFILLMENT_FAILED --> REFUND_PENDING
    REFUND_PENDING --> REFUNDED : compensating ledger entry
    FULFILLED --> [*]
```

Enforced twice: in the single-writer order service **and** by a Postgres trigger (validated on PG16 — illegal transitions and ledger mutations raise).

## Knowledge graph

The project docs are indexed as a knowledge graph (89 nodes / 121 edges / 8 communities — order state machine, commission engine, RBAC core, dashboards, regulatory drivers…). Rebuild with `/graphify --update`; query with `/graphify query "…"`.

![Project knowledge graph](docs/assets/knowledge-graph.svg)

## Running locally (Module 1)

```bash
docker compose up -d                # Postgres 16 + migrations (ports: 5433)
cd frontend
npm install
npm run seed                        # idempotent demo data (wiki pricing, persona users)
DATABASE_URL=postgres://aiexe:aiexe@localhost:5433/aiexe npm run dev
# → http://localhost:3000 · /roles · /packages · /design
```

Without `DATABASE_URL` the app falls back to in-memory demo stores (no Docker needed, resets on restart). `NEXT_PUBLIC_UI_REVAMP=0` disables the revamp shell (legacy-embedding parity mode). Full plan + acceptance checklist: [`docs/module-1-plan.md`](docs/module-1-plan.md).

## Competitive positioning (from market.md)

| Axis | Handshakes | OneCredit | **AiExe** |
|---|---|---|---|
| Mobile/responsive | ✗ desktop-only | not advertised | **release gate** |
| Pricing | opaque quotes | public menu | **public tiers: Explorer FOC · Pro RM1,288 · Elite RM1,500** |
| Partner/reseller channel | none | none | **admin-managed B2B2B + commission ledger** |
| AI dashboards | thin (SEER) | opaque | **constrained generation over widget catalog** |
| Regulatory hook | — | — | **BO-change monitoring (Companies Act 2024, 14-day window)** |
