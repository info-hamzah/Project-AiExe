# ADR-001: Core Data Model for the Phase 1 Revamp

**Status:** Proposed · Sprint 0 (PA-14) · 2026-07-18
**Context:** Ground-up schema for RBAC, packages/pricing, B2B2B, dashboards. Designed once, migrated once. RDS (PostgreSQL) is the system of record; DynamoDB only for high-churn event streams (sneak-peek impressions). All tables get `id (uuid pk)`, `created_at`, `updated_at` unless noted.

## 1. RBAC

```
roles              (name, description, is_system bool)
permissions        (key unique, description)            -- namespaced "module.action", registered by modules
role_permissions   (role_id fk, permission_key fk)      -- pk (role_id, permission_key)
user_roles         (user_id fk, role_id fk)             -- pk (user_id, role_id); multi-role per user
```

- **Central resolver** (PA-16 scaling rule): `effective_access(user) = union(role permissions) ∩ package entitlements`, computed server-side, cached (per-user, invalidated on role/package change). No inline role string comparisons anywhere.
- `is_system` guards bootstrap roles (super-admin) from deletion, not from inspection.

## 2. Packages, Pricing, Entitlements

```
packages           (name, is_default bool, billing_cycle, status)
package_versions   (package_id fk, version int, platform_fee_cents, currency,
                    entitlement_map jsonb, credit_allowances jsonb, effective_from)
subscriptions      (user_or_org_id, package_version_id fk, started_at, ends_at, status)
catalog_items      (key unique, name, category)          -- every sellable report/service; data rows, never code
item_prices        (catalog_item_id fk, package_id fk nullable,   -- null = default price
                    data_cost_cents, service_fee_cents, sst_cents, effective_from)
entitlement_grants (subject_id, entitlement_key, source enum(package|topup|voucher|admin),
                    granted_at, persists_after_downgrade bool)
```

- **Price = decomposed triple** (data cost / service fee / SST) per the pricing wiki — first-class columns, not derived. Discounts/commissions may only touch `service_fee_cents` (guardrail rule).
- **Versioning** (PA-4): subscribers pin to `package_versions`; a price edit creates a new version; existing subscriptions untouched until admin migrates.
- **Downgrade persistence** (wiki rule): `entitlement_grants.persists_after_downgrade = true` for the RM10 top-up bundle items — grants outlive the subscription tier.
- Pure pricing function: `price(package, item, buyer_ctx) -> breakdown` reads only these tables (PA-17 scaling rule).

## 3. Partner / Reseller (B2B2B)

```
partner_orgs       (name, type enum(partner|reseller), status, template_id fk nullable)
partner_terms      (partner_org_id fk, version int, discount_pct nullable,      -- partner type
                    partner_price_package_version_id nullable, commission_pct nullable,  -- reseller type
                    set_by_user_id, effective_from)
partner_templates  (name, default_terms jsonb, onboarding_config jsonb)          -- PA-21 scaling rule
partner_users      (partner_org_id fk, user_id fk, invited_by, joined_at)
commission_ledger  (id, order_id fk unique, reseller_org_id fk, gross_cents,
                    margin_component_cents, commission_pct_at_sale, commission_cents,
                    state enum(pending|settled|reversed), payout_id nullable)
payouts            (reseller_org_id, period, total_cents, marked_paid_by, paid_at)
```

- **Terms are versioned + attributed** (who set what rate, when → PA-3 audit).
- **Ledger entries are immutable**; corrections are compensating `reversed` entries, never updates. Commission computed from `margin_component_cents` only.
- `users.onboarding_source` (enum + `partner_org_id` nullable) is **write-once** at account creation — enforced by trigger.

## 4. Orders (state machine — see ADR-002)

```
orders             (buyer_id, catalog_item_id, package_version_id, qty,
                    price_breakdown jsonb, state, gateway_ref, idempotency_key unique)
order_events       (order_id fk, from_state, to_state, actor, reason, created_at)  -- append-only
```

## 5. Dashboards

```
widget_catalog     (key unique, version int, widget_type, query_key, params_schema jsonb, status)
dashboard_configs  (owner_type enum(user|team|admin_default|targeted), owner_id nullable,
                    target jsonb nullable,      -- {roles:[], groups:[], partner_orgs:[]}
                    schema_version int, config jsonb)   -- portable JSON (PA-22)
```

- Metric/formula definitions live behind `query_key` server-side (kills hardcoded-ratio bug class).

## 6. Audit (cross-cutting)

```
audit_log          (actor_id, entity_type, entity_id, action, before jsonb, after jsonb, created_at)
```
Written by the mutation layer for: roles, package_versions, partner_terms, vouchers, dashboard publishing. Append-only, partitioned by month.

## 7. Sneak-peek events → DynamoDB

`sneakpeek_events` table (pk: user_id, sk: ts) — impression/CTA-click events; high churn, TTL 13 months, aggregated nightly into RDS for the funnel views (PA-20 scaling rule: views read aggregates, not raw events).

## Decisions

1. **Postgres-first**; DynamoDB only for the event firehose. No new infra services (guardrail).
2. **jsonb for maps** (entitlement_map, dashboard config, template config) with `schema_version` columns — flexible now, migratable later.
3. **Money in integer cents (RM)**; currency column present but MYR-only in MVP (multi-currency = new config dimension, PA-17 scaling rule).
4. **Write-once onboarding source** at the DB layer, not just app layer.
5. One migration pass creates all of the above in Sprint 0 so Phases A–C never fight over schema.
