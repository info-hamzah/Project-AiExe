import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

import { PERMISSIONS } from "@/lib/rbacStore"

export async function GET() {
  return NextResponse.json(PERMISSIONS)
}
