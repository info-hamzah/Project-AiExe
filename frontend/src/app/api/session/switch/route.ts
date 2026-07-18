import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

import { DEV_COOKIE } from "@/lib/session"

/** Dev-only persona switch — sets the dev cookie. Real auth replaces this. */
export async function POST(req: Request) {
  const { userId } = await req.json()
  const res = NextResponse.json({ ok: true })
  res.cookies.set(DEV_COOKIE, String(userId), { httpOnly: true, sameSite: "lax", path: "/" })
  return res
}
