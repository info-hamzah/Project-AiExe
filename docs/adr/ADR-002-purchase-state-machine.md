# ADR-002: Purchase Order State Machine

**Status:** Proposed · Sprint 0 (PA-14, implemented by PA-8) · 2026-07-18
**Context:** The old board's single biggest recurring bug class was purchase/fulfilment state drift: payment success but status "Reject" (AE-253), paid but no report (AE-229), stuck at Processing (AE-258), gateway-failed orders manually fulfilled by CS (AE-216). Root cause: implicit states scattered across payment callbacks and fulfilment jobs, with no reconciliation. This ADR defines one explicit state machine every buy flow uses (tier purchase, per-report, top-up).

## States

```
DRAFT ──> PENDING_PAYMENT ──> PAID ──> FULFILLING ──> FULFILLED
             │    │              │          │
             │    └─> PAYMENT_FAILED        └─> FULFILLMENT_FAILED ──> (retry → FULFILLING)
             │              │                            │
             └─> EXPIRED    └─> (retry → PENDING_PAYMENT)└─> REFUND_PENDING ──> REFUNDED
```

Terminal: `FULFILLED`, `REFUNDED`, `EXPIRED`, `CANCELLED` (admin action from any pre-PAID state).

## Rules

1. **Single writer:** only the order service transitions state; gateway webhooks and fulfilment jobs *request* transitions, they never write state directly.
2. **Append-only event log** (`order_events`): every transition records from/to, actor (user, gateway webhook, reconciler, admin), and reason. The current state is always derivable; disputes are debuggable.
3. **Idempotency:** gateway callbacks carry the order `idempotency_key`; duplicate webhooks are no-ops. Payment success on an already-`PAID`+ order never regresses state (fixes the AE-253 "success but Reject" class).
4. **Settled-only side effects:** commission ledger entries (PA-7), report credits, and entitlement grants fire on `PAID → FULFILLING` transition and finalize at `FULFILLED`; a `REFUNDED` order writes a compensating `reversed` ledger entry. Nothing fires from webhook handlers.
5. **Reconciler job** (every 5 min): sweeps orders stuck > threshold in `PENDING_PAYMENT` (queries gateway for truth), `FULFILLING` (re-queues or fails), and `FULFILLMENT_FAILED` (bounded auto-retry, then surfaces in an admin queue). Replaces the manual "Refresh" button (AE-273) and CS manual supply (AE-216).
6. **Admin queue, not tickets:** anything the reconciler can't resolve lands in an admin UI queue with one-click retry/refund — recurring ops stay out of engineering.

## Gateway scope

SenangPay only in MVP (existing). The state machine is gateway-agnostic (webhook adapter interface); ToyyibPay (AE-256) plugs in as a V2 adapter. Freeze on gateway changes until this lands (execution-plan risk #3).

## Testing gate

Vitest: transition table exhaustively tested (every state × every event → expected state or rejection). Playwright: the four release-gate flows drive real transitions. The reconciler has a chaos test: kill fulfilment mid-flight, assert recovery.
