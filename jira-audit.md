# Jira Audit & Gap Analysis — Step 3

*Audited 2026-07-17 against `guardrail.md` v2 and `PRD.md`. Source: full AE project (328 issues, board 136) + open items in defunct AIEX project (7 issues, board 36). Ticket statuses are as of audit date.*

---

## 1. Mapping: MVP Requirements → Existing Tickets

### FR-1 Dynamic RBAC
| Ticket | Status | Disposition |
|---|---|---|
| AE-49 *UX Enhancement: Roles Management* (Epic) | Backlog | **Reuse as MVP epic** — re-scope to dynamic role CRUD |
| AE-246 *Enhanced Roles Management* | Backlog | **Enhance** — becomes the FR-1.1 admin role-CRUD story |
| AE-50 / AE-43 *Multi-roles selection / research* | Done | Foundation exists — build on it |
| AE-51 *One user holds multiple roles / improved UAC* | Backlog | **Reuse** — fold into FR-1 |
| AE-117 *UAC Migration* | Backlog | **Reuse** — prerequisite for DB-backed permissions |
| AE-241 *Role Mgmt: sub-users company mandatory* | Backlog | **Reuse** (small) |
| AE-90 *Admin deactivate user* / AE-129 *Rename User Type* | Done | Existing capability |
| AE-22 *Reset Password* | Backlog | **Reuse** — ops-independence hygiene |
| AE-81 *User Management* (Epic), AE-111, AE-145 | Mixed | **Enhance** — admin/finance user-management dashboard aligns with FR-1/FR-3 |

**Gap → create:** permission-middleware story (FR-1.2), audit-logging story (FR-1.3), role×tier entitlement resolution (FR-1.4). Nothing in the backlog covers these.

### FR-2 Tier Gating & Sneak-Peek
| Ticket | Status | Disposition |
|---|---|---|
| AE-323 *Explorer as default package for YYC SSO users* | Backlog | **Reuse** — instance of Global Default Package rule |
| AE-119 *FE CTA for TIN purchase* | Backlog | **Enhance** — generalize into the sneak-peek CTA pattern |
| AE-23 *AI tour on login* | Backlog | Optional polish; V2 unless trivial |

**Gap → create:** the entire sneak-peek engine (entitlement keys, locked-state preview UI, impression/CTA analytics) is **net-new**. This is the largest greenfield item in the MVP and has zero existing tickets.

### FR-3 Subscription & Package Management
| Ticket | Status | Disposition |
|---|---|---|
| AE-30 / AE-31 / AE-10 *Pricing Module Development FE/BE* | Backlog | **Reuse as the FR-3 core** — already envisioned, never built |
| AE-245 *Enhanced Pricing Rule* | Backlog | **Enhance** — becomes admin-configurable package rules |
| AE-268 *Customer + Pricing Package FE Design* | Ready for production | **Ship & extend** — design base for package admin UI |
| AE-237 *Pricing Fix* / AE-78 *Pricing Update* | Done | Lesson: pricing changes were code-level fixes → must become admin-UI operations |
| AE-220 *Postpaid wallet/limit*, AE-121 *auto-debit* | Backlog | **V2** — billing-rail depth beyond MVP |
| AE-52 *Generate invoice*, AE-115 *eInvoice request* | Backlog | **V2** unless finance mandates for launch |
| AE-68 *Subscription anniversary notification* | Backlog | **Reuse** (in-app/email in scope) |
| AE-330 / AE-329 *SenangPay routing / external purchase API* | Backlog | **Enhance** — payments touchpoints for tier purchase flow |
| AE-256 *ToyyibPay gateway* | Backlog | **V2** — second gateway not MVP-critical |

**Gap → create:** package versioning/migration (FR-3.3), immutable onboarding-source attribution (FR-3.4), data-COGS-separated price modeling (guardrail rule).

### FR-4 Partner & Reseller (B2B2B)
| Ticket | Status | Disposition |
|---|---|---|
| AE-128 *Reseller Sales Onboarding Enhancement (Xmartalex)* | Backlog | **Enhance** — concrete reseller case; generalize into the module |
| AE-100 *PEPS Ventures Partnership Subscription Arrangement* | Backlog | **Enhance** — concrete partner case; today handled as one-off arrangement → becomes admin-configured partner record |
| AE-103 / AE-105 *Partner Prepaid BE/FE* | Done | Foundation — partner-priced prepaid exists |
| AE-104 / AE-248 *YYC SSOv2 / SSO landing* | Done | Partner-channel SSO precedent (YYC) |
| AE-303 / AE-331 *Client Management (+enhancement)* | RfP / Backlog | **Reuse** — partner-facing user management base |
| AE-122 + subtasks AE-133–137 *Filter/export client onboarding* | Backlog | **Reuse** — admin/partner ops tooling |
| Voucher family: AE-294 (filter by product), AE-293, AE-274, AE-228, AE-306, AE-263, AE-283 | Mixed | **Enhance** — voucher machinery is adjacent to discounts; scope rigorously (see lessons) |

**Gap → create:** partner/reseller org model (typed Partner vs Reseller), commission ledger with rate-at-time-of-sale (FR-4.3/4.4), reseller read-only earnings view, onboarding-source auto-attribution. The commission ledger has **no existing ticket**.

### FR-5 AI Dashboards
| Ticket | Status | Disposition |
|---|---|---|
| AE-110 *FE AI Dashboard* | In Progress | **Continue** — active MVP workstream |
| AE-112 *POC AI Dashboard* / AE-153 *API for AI Dashboard* | Done | Foundation proven |
| AE-125 / AE-149 *AI Dashboard Endpoint (+enhanced)* | Backlog | **Reuse** — backend for constrained generation |
| AE-147 *Unified Dashboard for Multi-User* | Backlog | **Enhance** — maps to team master-dashboard (FR-5.3) |
| AE-146 *Consolidated Dashboard* / AE-213 *Enhance Dashboard* / AE-218 *User dashboard feedback* | Backlog | **Merge** into FR-5 scope; close as duplicates where overlapping |
| AE-145 *User-management dashboard admin/finance* | Backlog | **Reuse** — admin-targeted dashboard instance |

**Gap → create:** versioned widget/query-template catalog (FR-5.1), prompt→catalog mapping with graceful degradation (FR-5.2), dashboard targeting by group/role/partner, portable JSON dashboard configs.

### FR-6 Responsive Relationship Graph
| Ticket | Status | Disposition |
|---|---|---|
| AIEX-203 *FE Network Graph Optimisation* | In Progress | **Migrate to AE and continue** — performance base for the mobile gate |
| AIEX-201 *Relation Graph autoplay animation* | In Progress | **Migrate**; demo polish |
| AE-325 *DOA Network Graph* | In Progress | **Continue** — active graph workstream |
| AE-15 *Simplify Graph Visualisation* | Done | Foundation |
| AE-292 *PIS expand from existing network graph* / AE-281 *PIR on Stakeholder Insights* | Backlog | **Enhance** — graph-centric feature depth |
| AE-282 *Graph: purchase reports from other countries* | Backlog | **V2** (cross-border expansion) |

**Gap → create:** mobile/tablet interaction work (touch, breakpoints), performance budget (FR-6.2), BO-change alert deep-link (FR-6.3). No existing ticket addresses mobile responsiveness of the graph — the headline competitive claim is currently unowned.

---

## 2. Lessons from Bug History (build these in, don't repeat them)

1. **Purchase/fulfilment state fragility** — the single biggest recurring bug class: AE-253 (payment success but status "Reject"), AE-229 (paid, no report), AE-216 (SenangPay failed → CS manually supplies), AE-258 (stuck at Processing), AE-289, AE-251, AE-271, AE-232, AE-204, AE-207. AE-273 ("Refresh" for failed purchases) is a shipped workaround, not a fix. **Lesson → PRD:** the MVP purchase flow (tier upgrades, per-report buys, commission events) needs an explicit order state machine with reconciliation and automatic retry/refund paths; commission ledger entries must only bind to settled states.
2. **Hardcoded calculations** — AE-240 ("Ratio and Analysis (Hardcoded) is incorrect"), AE-239, AE-252, AE-173/AE-257 (auditor info discrepancies). **Lesson:** the FR-5 widget catalog must centralize metric definitions server-side; no formula logic in frontend or hardcoded values.
3. **Recurring manual ops** — monthly "YYC Internal User Deletion" tickets (AE-328, -305, -295, -279, -247, -235, -211, -208), manual special arrangements (AE-283 Turbo Jewellery FOC, AE-263 refund voucher), Elite bulk vouchers "temporarily manual" (per pricing wiki). **Lesson:** these are exactly the engineer/ops dependencies Phase 1 exists to kill — each recurring manual ticket should map to an admin-UI capability (bulk user lifecycle, admin-set FOC/discount arrangements, voucher batch creation).
4. **Voucher scoping bugs** — AE-261 (voucher on unrelated products), AE-294 (filter by product), AE-228 (pagination). **Lesson:** entitlement and discount objects need explicit product-scope models from day one; the sneak-peek/entitlement engine should share this scoping layer.
5. **One-off partner arrangements** — YYC, PEPS Ventures, Xmartalex each handled as bespoke tickets. **Lesson:** the FR-4 module's success test is that the *next* partner requires zero tickets.

---

## 3. Push to V2 (explicitly out of MVP sprint)

- **New data sources / registries:** AE-209 (AsiaVerify AMLA/Sanction), AE-210 (LinkedIn data), AE-25 (AsiaVerify KYB), AE-244/AE-259 (Hong Kong), AE-88 (Indonesia backup API), AIEX-132 (Cambodia replication), AE-300 (MSIC scraping), AE-99 (e-Info import)
- **Billing depth:** AE-220 (postpaid wallet), AE-121 (auto-debit), AE-256 (ToyyibPay), AE-52/AE-115 (invoice/eInvoice)
- **Cross-border expansion features:** AE-282, AE-292 Phase 2 (unless graph work absorbs it cheaply)
- **Notification channels beyond in-app/email:** anything WhatsApp-adjacent (separate AWL project) — confirmed out
- **Misc client-specific ops:** YYC deletion cycles (to be replaced by admin bulk tooling, not carried as tickets)

## 4. Continue as-is (active, MVP-aligned)
AE-110 (FE AI Dashboard), AE-325 (DOA Network Graph), AE-318/AE-317/AE-319/AE-326/AE-327 (DOA feature family), AIEX-203/201 (graph optimisation — migrate to AE), AE-303/AE-268 (client mgmt + pricing FE, ready for production), checkout/voucher prio items in code review (AE-315/316/320/321).

## 5. Net-New Tickets to Create (no existing coverage)
1. Sneak-peek entitlement engine (FE + BE + analytics events) — FR-2
2. Permission middleware + role×tier resolution — FR-1.2/1.4
3. Audit log for roles/packages/rates — FR-1.3, NFR-2
4. Package versioning & subscriber migration — FR-3.3
5. Onboarding-source attribution (immutable, all signup paths incl. SSO) — FR-3.4
6. Partner/Reseller org model + typed terms (discount vs commission) — FR-4.1
7. Commission ledger + reseller earnings view — FR-4.3
8. Widget/query template catalog (versioned, server-side metrics) — FR-5.1
9. Prompt→catalog constrained generation service — FR-5.2
10. Dashboard targeting (group/role/partner) + team master dashboard — FR-5.3
11. Mobile graph interaction + performance budget — FR-6.1/6.2
12. BO-change alert → graph deep-link — FR-6.3
13. Purchase state machine hardening + reconciliation (lesson #1)

---

*Step 3 complete. Step 4 (execution plan) may proceed.*
