import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

import { voucherService } from "@/lib/adminOps"
import { requirePermission, toErrorResponse } from "@/lib/authz"

export async function GET() {
  try {
    await requirePermission("packages.view")
    return NextResponse.json(await voucherService.list())
  } catch (e) {
    return toErrorResponse(e)
  }
}

export async function POST(req: Request) {
  try {
    const session = await requirePermission("packages.manage")
    await voucherService.create(await req.json(), session.user.id)
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (e) {
    return toErrorResponse(e)
  }
}
