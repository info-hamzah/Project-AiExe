import { NextResponse } from "next/server"

import { requirePermission, toErrorResponse } from "@/lib/authz"

import { rbacStore } from "@/lib/rbacStore"

const ACTOR = "admin:demo"

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requirePermission("roles.manage")
    const body = await req.json()
    return NextResponse.json(await rbacStore.setUserRoles(params.id, body.roleIds ?? [], ACTOR))
  } catch (e) {
    const err = e as Error & { status?: number }
    return NextResponse.json({ error: err.message }, { status: err.status ?? 400 })
  }
}
