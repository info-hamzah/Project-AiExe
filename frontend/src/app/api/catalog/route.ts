import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

import { pricingStore } from "@/lib/pricingStore"

export async function GET() {
  return NextResponse.json(await pricingStore.listCatalog())
}
