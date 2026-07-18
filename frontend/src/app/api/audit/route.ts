import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

import { rbacStore } from "@/lib/rbacStore"

export async function GET() {
  return NextResponse.json(await rbacStore.listAudit())
}
