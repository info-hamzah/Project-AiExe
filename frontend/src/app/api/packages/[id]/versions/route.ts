import { NextResponse } from "next/server"

import { requirePermission, toErrorResponse } from "@/lib/authz"

export const dynamic = "force-dynamic"

import { pricingStore } from "@/lib/pricingStore"

const ACTOR = "admin:demo"

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await requirePermission("packages.manage")
    const body = await req.json()
    return NextResponse.json(await pricingStore.publishVersion(params.id, body, ACTOR), { status: 201 })
  } catch (e) {
    const err = e as Error & { status?: number }
    return NextResponse.json({ error: err.message }, { status: err.status ?? 400 })
  }
}
