import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

import { resolveSession } from "@/lib/session"

export async function GET() {
  const session = await resolveSession()
  if (!session) return NextResponse.json({ error: "no user" }, { status: 401 })
  return NextResponse.json(session)
}
