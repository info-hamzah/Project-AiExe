import { describe, expect, it } from "vitest"

import { pricingStore } from "@/lib/pricingStore"

// DATABASE_URL is unset in tests → memory backend with wiki seed.
describe("priceFor (pure pricing function — PA-17 scaling rule)", () => {
  it("decomposes SSM ROC/ROB per the wiki (10 + 5 + 0.40)", async () => {
    const pkgs = await pricingStore.listPackages()
    const explorer = pkgs.find((p) => p.name === "Explorer")!
    const q = await pricingStore.priceFor(explorer.id, "ssm_roc_rob")
    expect([q.dataCostCents, q.serviceFeeCents, q.sstCents, q.totalCents]).toEqual([1000, 500, 40, 1540])
    expect(q.source).toBe("default")
  })

  it("applies member price override for Pro (DocReader RM10 → RM5)", async () => {
    const pkgs = await pricingStore.listPackages()
    const pro = pkgs.find((p) => p.name === "Pro")!
    const q = await pricingStore.priceFor(pro.id, "idaman_docreader")
    expect(q.totalCents).toBe(500)
    expect(q.source).toBe("member")
  })

  it("publishing a version preserves history and bumps current", async () => {
    const pkgs = await pricingStore.listPackages()
    const elite = pkgs.find((p) => p.name === "Elite")!
    const before = elite.currentVersion.version
    const updated = await pricingStore.publishVersion(
      elite.id,
      { platformFeeCents: 160000, promoFeeCents: null, entitlementMap: {}, creditAllowances: {} },
      "test",
    )
    expect(updated.currentVersion.version).toBe(before + 1)
    expect(updated.versions.map((v) => v.version)).toContain(before)
  })
})
