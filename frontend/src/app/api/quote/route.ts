import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

import { pricingStore } from "@/lib/pricingStore"

/** Pure pricing quote: ?packageId=..&itemKey=.. → decomposed breakdown. */
export async function GET(req: Request) {
  const url = new URL(req.url)
  try {
    return NextResponse.json(
      await pricingStore.priceFor(url.searchParams.get("packageId") ?? "", url.searchParams.get("itemKey") ?? ""),
    )
  } catch (e) {
    const err = e as Error & { status?: number }
    return NextResponse.json({ error: err.message }, { status: err.status ?? 400 })
  }
}
