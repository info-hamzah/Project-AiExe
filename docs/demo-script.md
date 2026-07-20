# Stakeholder Demo Script — AiExe Phase 1 MVP

*Phase D deliverable. Runs entirely on the local build (`README.md` → Running locally). Each act maps to a competitive proof from `market.md` and a release gate from `PRD.md`. ~12 minutes.*

## Setup (before the room)
`docker compose up -d` → `npm run seed` → start the app with `NEXT_PUBLIC_DEV_AUTH=1`. Open on a laptop **and** a phone/tablet on the same network (`http://<laptop-ip>:3000`) — the mobile device is Act 1's prop.

---

## Act 1 — "Handshakes can't do this" (mobile graph · release gate 4)
1. On the **phone**, open **Relationship Graph**. Pan/zoom with touch; tap **KS Lim Holdings** to recenter.
2. Point out the BO-change banner: *Nusantara Agri — new UBO filed 3 days ago* → tap **View in graph**; the amber edge is the new filing.
3. Line: *"Companies Act 2024 gives directors 14 days to file BO changes. Handshakes is a desktop analyst tool — your client's compliance officer just did this from the mamak."*

## Act 2 — "OneCredit can't do this" (transparent pricing + upsell · gates 1–2)
1. As **Encik Explorer**: dashboard shows the **Mina AI sneak-peek** (blurred, benefit copy, pill CTA — never a 403).
2. Click **Upgrade to Pro** → features unlock instantly, zero deploys. Downgrade → locked again. **Buy RM10 bundle** → unlocked *and it survives downgrade* (the pricing wiki's rule, live).
3. As **Hamzah (Admin)** → **Packages & Pricing**: tiers Explorer FOC / Pro RM1,288 (promo RM1,000) / Elite RM1,500; every menu price decomposed **data + fee + SST**; edit Pro → publishes v-next, existing subscribers untouched.
4. Line: *"OneCredit publishes prices too — but their tiers are hardcoded product. Ours are admin configuration with versioned history and an audit trail."*

## Act 3 — The uncontested channel (B2B2B · gate 3)
1. As **Admin** → **Partners & Resellers**: Xmartalex (reseller 20%) and PEPS (partner 15%), terms versioned and attributed.
2. As **Rina Yusof** → **Partner Portal**: onboard a customer live (name + email, one click). Show read-only earnings — *no pricing controls anywhere*.
3. As the onboarded customer → **Search & Reports** → buy a report (RM15.40, state machine steps shown in the modal).
4. Back as **Rina**: RM1.00 pending (20% of the RM5 margin — *"commissions never touch SSM data cost"*). As **Admin** → **Finance** → mark paid.
5. Line: *"Neither Handshakes nor OneCredit has a partner channel at all. This is ours end-to-end: onboard → attribute → sell → commission → payout."*

## Act 4 — Mina AI dashboards (constrained generation · FR-5)
1. As any Pro user → **Dashboards** → type: *"show my monitored companies with recent BO changes"* → stat + table + graph centered on the changed entity, with an explanation.
2. Ask something out of scope (*"predict Apple's stock price"*) → graceful decline + what it *can* build. Line: *"Mina composes only pre-approved widgets — flexible for users, safe for compliance."*
3. As **Admin**: publish a targeted dashboard to the Finance role → switch to **Aina** → she has it.

## Act 5 — Operational independence (the prime directive · gate 1)
1. As **Admin** → **Roles & Access**: create a role, assign it, switch personas — access changes live. Audit panel shows every change with actor.
2. **Finance**: transactions by channel (direct/partner/reseller), CSV export, **Run reconciler** (the job that replaced the old board's 10+ stuck-order bug tickets), voucher creation with product scoping.
3. Closing line: *"Every rate, role, price, partner, and dashboard you saw was changed by an admin at runtime. The old platform needed an engineering ticket for each of these."*

---

## Fallbacks
- Phone won't connect → Chrome DevTools device mode (375px) on the laptop.
- A persona got mangled during rehearsal → `npm run seed` restores; `docker compose down -v && docker compose up -d && npm run seed` is the full reset.
