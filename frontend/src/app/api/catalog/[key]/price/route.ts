import { NextResponse } from "next/server"

import { requirePermission, toErrorResponse } from "@/lib/authz"

export const dynamic = "force-dynamic"

import { pricingStore } from "@/lib/pricingStore"

const ACTOR = "admin:demo"

export async function POST(req: Request, { params }: { params: { key: string } }) {
  try {
    await requirePermission("packages.manage")
    const { packageId = null, ...cents } = await req.json()
    return NextResponse.json(await pricingStore.setItemPrice(params.key, packageId, cents, ACTOR), { status: 201 })
  } catch (e) {
    const err = e as Error & { status?: number }
    return NextResponse.json({ error: err.message }, { status: err.status ?? 400 })
  }
}
