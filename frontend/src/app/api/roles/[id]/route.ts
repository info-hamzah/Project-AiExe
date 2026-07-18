import { NextResponse } from "next/server"

import { rbacStore } from "@/lib/rbacStore"

const ACTOR = "admin:demo"

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    return NextResponse.json(rbacStore.updateRole(params.id, body, ACTOR))
  } catch (e) {
    const err = e as Error & { status?: number }
    return NextResponse.json({ error: err.message }, { status: err.status ?? 400 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    rbacStore.deleteRole(params.id, ACTOR)
    return NextResponse.json({ ok: true })
  } catch (e) {
    const err = e as Error & { status?: number }
    return NextResponse.json({ error: err.message }, { status: err.status ?? 400 })
  }
}
