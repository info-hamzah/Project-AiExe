import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

import { pricingStore } from "@/lib/pricingStore"

const ACTOR = "admin:demo"

export async function POST(req: Request, { params }: { params: { key: string } }) {
  try {
    const { packageId = null, ...cents } = await req.json()
    return NextResponse.json(pricingStore.setItemPrice(params.key, packageId, cents, ACTOR), { status: 201 })
  } catch (e) {
    const err = e as Error & { status?: number }
    return NextResponse.json({ error: err.message }, { status: err.status ?? 400 })
  }
}
