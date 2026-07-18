# Module 1 — Admin Core, locally deployable

**Decided 2026-07-18:** scope = Admin Core (RBAC + Packages/Pricing + sneak-peek gating) · persistence = Postgres via docker-compose · auth = dev mock user-switcher.

**Goal:** one command brings up a persistent local build where you can log in as different personas and *see role + tier changes gate the product* — the "operational independence" story, testable end-to-end on your machine.

## What already exists (done)
- `/roles` — role CRUD, module-grouped permission matrix, multi-role assignment, guards, audit panel (PA-16, verified)
- `/packages` — tier cards with real wiki pricing, immutable version publishing, decomposed price menu, quote engine (PA-17, verified)
- `/design` — themed design-system reference; navy AppShell; `effectiveAccess` resolver choke point
- `migrations/0001–0005` — validated on Postgres 16
- Typed API contracts for both modules (currently over in-memory demo stores)

## Work plan (est. 3 working sessions)

### Session 1 — Persistence
1. `docker-compose.yml` at repo root: `postgres:16-alpine` + volume; `migrate` one-shot service applying `migrations/*.sql` in order (plus a `users` stub table + the commented trigger from 0003 attached).
2. `frontend`: add `pg` client + `src/lib/db.ts` (pool via `DATABASE_URL`, globalThis-safe).
3. Swap `rbacStore`/`pricingStore` internals for Postgres queries behind the **same exported interfaces** (API routes and pages untouched). In-memory stays as fallback when `DATABASE_URL` is unset.
4. Seed script `npm run seed`: idempotent — permissions registry, 4 roles, 3 packages with wiki pricing, catalog + price rows, demo users with subscriptions (one per persona incl. an Explorer-tier user).

### Session 2 — Auth stub + entitlement gating
5. Dev user-switcher: header dropdown (persona list from DB) writing a signed dev cookie; `getSessionUser()` server-side helper. Clearly marked dev-only (disabled unless `NEXT_PUBLIC_DEV_AUTH=1`).
6. Activate the resolver's second operand: `effectiveAccess = role perms ∩ current package version's entitlementMap` (+ persistent grants). Single choke point already exists in `lib/access.ts`.
7. Gate for real: sidebar menu filtered by permissions; `/roles` & `/packages` require `roles.manage` / `packages.manage`; premium features (Mina bundle keys) render `LockedFeature` sneak-peek for Explorer users, unlocked for Pro/Elite.
8. Record sneak-peek impressions/CTA clicks to a `sneakpeek_events` table (Postgres locally; DynamoDB is the prod target) so the funnel is inspectable.

### Session 3 — Wire-through + test pass
9. Simulated upgrade action ("Upgrade to Pro" on the CTA) flipping the user's subscription — proves gate changes live without deploys.
10. Unified audit: RBAC + pricing writes land in the `audit_log` table; one `/api/audit` feed (PA-3 first slice).
11. Smoke checklist run (below) + `README` "Local testing" section + Playwright happy-path for the two release-gate flows touched (role change gates feature; package edit versions cleanly).

## Bring-up (target DX)
```bash
docker compose up -d        # postgres + migrations
cd frontend && npm install
npm run seed                # idempotent demo data
NEXT_PUBLIC_DEV_AUTH=1 npm run dev
# → http://localhost:3000 · switch personas from the header dropdown
```

## Your test checklist (acceptance)
1. Switch to **Admin** → create a role, assign it to Sales user → switch to **Sales** persona → menu/pages reflect new access (no restart).
2. As **Explorer user** → premium features show sneak-peek + Upgrade CTA → click upgrade (simulated) → features unlock; downgrade → previously-granted top-up items stay free (wiki rule).
3. As **Admin** → edit Pro price → verify new version in UI; existing subscriber's fee unchanged.
4. Restart everything (`docker compose restart`, kill dev server) → all of the above **persists**.
5. `audit` panel shows every change with actor + timestamp.

## Out of scope for Module 1
Partner/reseller module (Module 2), real payments/order state machine (implemented at DB level; service layer comes with Module 2's purchase flows), real login/SSO, dashboards/AI generation, graph screens.
