import { Pool, types } from "pg"

/**
 * Postgres pool (docker-compose local / RDS later). When DATABASE_URL is unset the
 * stores fall back to their in-memory demo implementations.
 * globalThis singleton: Next bundles each route separately.
 */

// bigint (int8) → number: all money is cents well below Number.MAX_SAFE_INTEGER
types.setTypeParser(20, (v) => parseInt(v, 10))

export const dbEnabled = Boolean(process.env.DATABASE_URL)

const g = globalThis as typeof globalThis & { __aiexePgPool?: Pool }

export function getPool(): Pool {
  g.__aiexePgPool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 5 })
  return g.__aiexePgPool
}

export const q = <T = Record<string, unknown>>(text: string, params?: unknown[]) =>
  getPool().query<T extends import("pg").QueryResultRow ? T : never>(text, params as never)

/** Run fn inside a transaction. */
export async function tx<T>(fn: (c: import("pg").PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect()
  try {
    await client.query("BEGIN")
    const out = await fn(client)
    await client.query("COMMIT")
    return out
  } catch (e) {
    await client.query("ROLLBACK")
    throw e
  } finally {
    client.release()
  }
}

/** Map Postgres errors to the HTTP-ish errors the routes expect. */
export function pgError(e: unknown): Error & { status?: number } {
  const err = e as { code?: string; message?: string }
  if (err.code === "23505") return Object.assign(new Error("already exists"), { status: 409 })
  if (err.message?.includes("cannot be deleted")) return Object.assign(new Error(err.message), { status: 403 })
  return Object.assign(new Error(err.message ?? "database error"), { status: 500 })
}

/** Unified audit write (audit_log table, ADR-001 §6). Summary kept in `after`. */
export async function writeAudit(
  actor: string,
  entityType: string,
  entityId: string,
  action: string,
  summary: string,
): Promise<void> {
  await q(
    `INSERT INTO audit_log (actor_id, entity_type, entity_id, action, after)
     VALUES (COALESCE(NULLIF($1,'')::uuid, '00000000-0000-0000-0000-000000000000'), $2, $3, $4, jsonb_build_object('summary', $5::text))`,
    [/^[0-9a-f-]{36}$/.test(actor) ? actor : "", entityType, entityId, action, summary],
  )
}
