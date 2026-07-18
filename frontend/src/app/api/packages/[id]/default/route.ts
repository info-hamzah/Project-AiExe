import { NextResponse } from "next/server"

import { requirePermission, toErrorResponse } from "@/lib/authz"

export const dynamic = "force-dynamic"

import { pricingStore } from "@/lib/pricingStore"

const ACTOR = "admin:demo"

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requirePermission("packages.manage")
    return NextResponse.json(await pricingStore.setDefault(params.id, ACTOR))
  } catch (e) {
    const err = e as Error & { status?: number }
    return NextResponse.json({ error: err.message }, { status: err.status ?? 400 })
  }
}
