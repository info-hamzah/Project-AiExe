/** Pricing types mirroring ADR-001 §2 — the FE contract the real API must satisfy. */

export interface Package {
  id: string
  name: string
  isDefault: boolean
  billingCycle: "monthly" | "annual" | "none"
  status: "draft" | "active" | "retired"
  /** Latest version — history in `versions`. */
  currentVersion: PackageVersion
  versions: PackageVersion[]
}

export interface PackageVersion {
  id: string
  version: number
  platformFeeCents: number
  promoFeeCents: number | null
  currency: "MYR"
  /** entitlement_key → included */
  entitlementMap: Record<string, boolean>
  /** catalog item key → free units per year */
  creditAllowances: Record<string, number>
  effectiveFrom: string
  createdBy: string
}

export interface CatalogItem {
  id: string
  key: string
  name: string
  category: "ssm" | "idaman" | "crossborder" | "docreader" | "data" | "cert"
  status: "active" | "retired"
  prices: ItemPrice[]
}

/** Decomposed price — discounts/commissions may only touch serviceFeeCents. */
export interface ItemPrice {
  id: string
  /** null = default/Explorer price; package id = member price override */
  packageId: string | null
  dataCostCents: number
  serviceFeeCents: number
  sstCents: number
  effectiveFrom: string
}

export interface PriceBreakdown {
  itemKey: string
  packageName: string
  dataCostCents: number
  serviceFeeCents: number
  sstCents: number
  totalCents: number
  /** Which price row applied: package override or default. */
  source: "member" | "default"
}

export interface PackageVersionInput {
  platformFeeCents: number
  promoFeeCents: number | null
  entitlementMap: Record<string, boolean>
  creditAllowances: Record<string, number>
}

/** RM10 top-up bundle keys (Explorer unlock; free on Pro/Elite; persist after downgrade). */
export const TOPUP_BUNDLE = [
  "mina_exec_summary",
  "mina_visualization_graph",
  "mina_chat",
  "bizinfo",
  "business_radius_scan",
  "stakeholder_insights",
  "ecourt_links",
  "tin",
] as const
