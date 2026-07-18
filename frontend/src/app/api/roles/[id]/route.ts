import { NextResponse } from "next/server"

import { requirePermission, toErrorResponse } from "@/lib/authz"

import { rbacStore } from "@/lib/rbacStore"

const ACTOR = "admin:demo"

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requirePermission("roles.manage")
    const body = await req.json()
    return NextResponse.json(await rbacStore.updateRole(params.id, body, ACTOR))
  } catch (e) {
    const err = e as Error & { status?: number }
    return NextResponse.json({ error: err.message }, { status: err.status ?? 400 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requirePermission("roles.manage")
    await rbacStore.deleteRole(params.id, ACTOR)
    return NextResponse.json({ ok: true })
  } catch (e) {
    const err = e as Error & { status?: number }
    return NextResponse.json({ error: err.message }, { status: err.status ?? 400 })
  }
}
