import { NextResponse } from "next/server"

import { requirePermission, toErrorResponse } from "@/lib/authz"

export const dynamic = "force-dynamic"

import { rbacStore } from "@/lib/rbacStore"

const ACTOR = "admin:demo" // replaced by session identity when auth lands

export async function GET() {
  return NextResponse.json(await rbacStore.listRoles())
}

export async function POST(req: Request) {
  try {
    await requirePermission("roles.manage")
    const body = await req.json()
    return NextResponse.json(await rbacStore.createRole(body, ACTOR), { status: 201 })
  } catch (e) {
    const err = e as Error & { status?: number }
    return NextResponse.json({ error: err.message }, { status: err.status ?? 400 })
  }
}
