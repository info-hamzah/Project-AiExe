# AiExe — Market & Competitive Research

*Compiled 2026-07-17 from public web research. Facts are cited; inferences are marked.*

---

## 1. Market Context

### Size & growth
- Global eKYC market: ~USD 3.2B (2025) → projected USD 12.1B by 2034 (~16.8% CAGR). Asia-Pacific is the fastest-growing region (~17.8% of global share).
- Global AML market: USD 4.13B (2025) → USD 9.38B by 2030 (17.8% CAGR); AML software specifically ~USD 3.5B (2024) → USD 14.75B by 2034. APAC forecast at the highest regional CAGR (~18.2% to 2032).
- **No credible Malaysia-only market-size figure exists publicly.** *Inference: estimate Malaysian TAM bottom-up from SSM-registered entities (~11M business entities per OneCredit's claimed coverage) and counts of regulated institutions.*

### Regulatory tailwinds (Malaysia)
- **BNM e-KYC Policy Document** (revised, effective 15 Apr 2024): sets minimum standards for e-KYC onboarding of individuals **and legal persons** — KYB is explicitly in scope. Requires overall False Acceptance Rate ≤ 5% with continuous measurement for AI/ML-driven verification.
- **Companies (Amendment) Act 2024** (in force 1 Apr 2024): mandatory beneficial-ownership (BO) filing with SSM via the e-BOS portal; new companies file within 60 days, BO changes within 14 days, BO info accompanies annual returns. Aligned to FATF/OECD standards.
- *Inference: recurring BO-change obligations create ongoing, compliance-driven demand for entity monitoring — a natural fit for AiExe's monitoring + relationship-graph capability.*

---

## 2. SSM Data Access (supply side)

Two SSM-authorised channels sell corporate data per search:

| Channel | Notes | Price signals |
|---|---|---|
| **SSM e-Info** (official) | Instant PDF; volume buyers get an unpublished "Corporate Subscription Data (CSD)" plan | Company Profile (ROC) RM15.40 · Company Charges RM25.40 · Good Standing cert RM105.40 · Financial Comparison RM25.40–105.40 · bulk listing RM4.08/company + RM23.24 processing |
| **MYDATA-SSM** | MYDATA Analytics Sdn Bhd, SSM-appointed provider since 2016 | Third-party sources cite ~RM5–25 per document (site blocks scraping; unverified) |

- Neither portal advertises a public reseller/channel-partner program.
- *Inference: AiExe's data COGS floor is roughly **RM5–15.40 per fresh SSM profile pull** unless a CSD/bulk agreement is negotiated. Pricing and margin design must respect this floor; discounts should apply to the platform component, not pass-through data cost.*

---

## 3. Competitor: Handshakes (DC Frontiers, Singapore)

**What they are:** ACRA-authorised information provider (founded 2011) mapping company/people relationships from regulatory filings. Products: **APP** (flagship web platform — entity search over 4.6M+ registry records, four connectivity-map types incl. legal-beneficial-ownership maps, monitoring alerts), **DATAMART** (self-serve bulk registry data, SG+MY), **API**, **KYB Services** (managed KYB incl. UBO identification and sanctions/adverse-media screening), plus FUSE / XPERT / SEER (AI tools, thinly described). Data: ACRA (daily), SSM, China SAIC, Vietnam, Thailand, HK/AU reports. Partnerships: S&P Global, Bureau van Dijk, LSEG, Nikkei (14.79% stake; Handshakes powers Nikkei/FT's ScoutAsia), Microsoft. MAS Approved Screening Partner.

**Customers/GTM:** financial institutions, compliance teams, capital-markets firms (SGX, SAC Capital, Crowe cited), public sector. Direct enterprise sales (demo-led) + self-serve trial/credit top-ups. **No public reseller/partner program found.**

**Pricing:** **no public price list.** DATAMART is pay-per-search credits with emailed quotations; APP is demo-led.

**UX:** web-only (app.handshakes.ai); **no mobile app or mobile support mentioned anywhere**; analyst/desktop-oriented. Zero third-party review footprint (G2/Capterra searches polluted by the unrelated US "Handshake" recruiting platform).

**Openings for AiExe** *(inferences marked)*:
1. Mobile-first responsive UI — they have no mobile story.
2. Transparent tiered pricing vs their quote-based friction.
3. Malaysia-native SSM depth vs their Singapore-centric identity *(positioning inference)*.
4. B2B2B partner/reseller channel — a distribution gap they leave open.
5. AI dashboards — their SEER AI tooling is new/immature *(inference from thin marketing copy)*.

---

## 4. Competitor: OneCredit (One Strategy Group, Malaysia)

**What they are:** Malaysia's newest approved credit reporting agency (licensed subsidiary One Future Solutions Sdn Bhd, regulated under the Registrar Office of Credit Reporting Agencies). Officially launched **12 Feb 2026**. CEO Liew Tian Rong. AI-driven risk management, KYC verification, credit underwriting; claims coverage of **11M registered/operating business entities**. Data: SSM, financials, public records, litigation, credit references, "verified alternative sources."

**Published pricing (portal.onecredit.my/pricing)** — the most direct benchmark for AiExe:

| Item | Price |
|---|---|
| Starter (free) | Search 11M+ profiles, archived reports, monitor 3 entities (SSM updates only) |
| Business tier | **RM300/month** (billed annually): unlimited monitoring, 10 free basic reports/month, dedicated account manager |
| Archived SSM profile | RM5 |
| Latest SSM profile | RM12.90 |
| Risk report | from RM8 |
| Full audited financials | from RM34.90 |
| Enterprise | custom |

They market explicitly against incumbents ("others charge RM17 per latest profile").

**Weaknesses vs AiExe** *(from CLAUDE.md positioning + research)*: rigid direct-endpoint model — no partner/reseller onboarding, no customizable AI dashboards, no relationship-graph visualization advertised.

---

## 5. Incumbents (suppliers + partial competitors)

AiExe's Terraform includes `ctos` and `experian` S3 buckets — CTOS and Experian are likely **data suppliers** to AiExe while also being partial competitors *(inference from infra naming)*.

- **CTOS Digital** — Malaysia's largest CRA (Bursa-listed). CTOS Basis (business credit reports), SME Score (100–400), eKYC (first CRA with online subscription eKYC), one-off reports via e-commerce. Consumer MyCTOS report RM25; business pricing quote-based. Strong embedded/API partnerships (AEON Credit → 12,000 merchants; Alliance Bank; FinDoc).
- **Experian Malaysia** (ex-RAMCI) — corporate report types CP/BP, CI/BI, CRIS-S, CDDC; Intelliscore business score (1–100); sold via CrediTrack B2B portal, quote-based. Consumer report RM23.90.
- **Credit Bureau Malaysia** — MyBizSCoRE (0–100); cheapest consumer report (~RM19.44); weakest public API/partner ecosystem of the three *(inference)*.
- **CRIF OMESTI** — secondary CRA offering company reports; worth tracking.

---

## 6. Pricing Norms for Comparable Platforms

- **Sumsub:** KYC from USD 1.35/verification, USD 149/month minimum; KYB custom (~EUR 35–45 per semi-automated check per industry sources).
- **Ondato KYB:** publicly "from €600/month" (third-party cite €569/month Standard, 3 users); pay only for completed verifications; Enterprise custom.
- **CTOS:** eKYC subscription platform + pay-per-search screening; business reports quote-based.
- **Tookitaki / Know Your Customer:** enterprise custom quotes only.
- *Pattern (inference): regional norm = monthly platform fee (~USD 150–650 entry) + per-report/per-verification usage credits, with named tiers and custom enterprise — consistent with an Explorer / Professional / Enterprise structure for AiExe.*

### Partner/reseller channel norms (generic global B2B SaaS — no MY/SEA-specific published benchmarks found)
- Referral commissions: ~10% (warm lead), ~20% (qualified opp), 25–40%+ when the partner carries the sale.
- Reseller discounts off list: typically 10–50%, most commonly starting ~20%, stepping up with volume.
- *Inference for AiExe: commission/discount should apply to the platform/margin component only — never to pass-through SSM/bureau data cost.*

---

## 7. Strategic Takeaways for the MVP

1. **Price transparently and publicly.** Both Handshakes (opaque quotes) and incumbents (quote-based) create friction; OneCredit has proven a freemium + per-report menu works in Malaysia. AiExe should publish tier pricing and undercut or match OneCredit's per-report benchmarks where data COGS allows.
2. **Mobile-responsiveness is a genuine, verifiable edge.** No competitor in this space has a mobile story.
3. **The B2B2B partner/reseller channel is uncontested.** Neither Handshakes, OneCredit, nor the SSM portals run a public partner program — AiExe's admin-managed partner/reseller module attacks an open distribution gap.
4. **BO monitoring is the regulatory hook.** The Companies (Amendment) Act 2024's recurring BO obligations give the monitoring + graph features a compliance-driven reason to buy, not just an analytics one.
5. **Watch OneCredit closely.** Launched Feb 2026, aggressive pricing, same SSM-connected AI positioning — they are the nearest-term threat, and their public price list is the benchmark stakeholders will compare against.

---

## Sources

**Handshakes:** handshakes.ai (+ /products/app, /datamart, /kyb) · imda.gov.sg innovative-tech directory (DC Frontiers) · sgpbusiness.com (DC Frontiers) · asia.nikkei.com (Nikkei stake) · theedgemalaysia.com (ScoutAsia launch) · sg.linkedin.com/company/handshakes-by-dc-frontiers

**OneCredit & bureaus:** onecredit.my · portal.onecredit.my/pricing · theedgemalaysia.com/node/792749 · bernama.com (launch; AEON Credit x CTOS) · thestar.com.my (OneCredit debut) · ctoscredit.com.my (+ Basis, SME Score, eKYC subscription, KYC Screening) · technode.global (FinDoc x CTOS) · experian.com.my · mycreditinfo.com.my · creditbureau.com.my · company-report.crif.com.my · ringgitohringgit.com (report price comparison)

**Market & pricing norms:** marketintelo.com / imarcgroup.com (eKYC market) · marketsandmarkets.com / databridgemarketresearch.com / bisresearch.com (AML market) · skrine.com / lexology.com / bnm.gov.my (e-KYC PD) · pwc.com/my / dfdl.com / ssm.com.my (BO framework) · ssm-einfo.my (price list) · mydata-ssm.com.my · businessdataguide.com · sumsub.com/pricing · ondato.com/plans-pricing · financesonline.com (Ondato) · tookitaki.com · saastr.com / channels-as-a-strategy.com (channel norms)
