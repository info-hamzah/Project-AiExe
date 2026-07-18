import { NextResponse } from "next/server"

import { resolveSession, type SessionInfo } from "@/lib/session"

/**
 * Server-side permission enforcement (PA-2): API routes call requirePermission —
 * the missing half of gating (menus/pages alone are cosmetic). Every check flows
 * through the session's resolved permission set; no inline role comparisons.
 */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export async function requireSession(): Promise<SessionInfo> {
  const session = await resolveSession()
  if (!session) throw new HttpError(401, "not authenticated")
  return session
}

export async function requirePermission(key: string): Promise<SessionInfo> {
  const session = await requireSession()
  if (!session.permissions.includes(key)) {
    throw new HttpError(403, `missing permission: ${key}`)
  }
  return session
}

/** Uniform error → response mapping for route handlers. */
export function toErrorResponse(e: unknown): NextResponse {
  const err = e as Error & { status?: number }
  return NextResponse.json({ error: err.message ?? "error" }, { status: err.status ?? 400 })
}
