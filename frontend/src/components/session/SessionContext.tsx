"use client"

import React, { createContext, useCallback, useContext, useEffect, useState } from "react"

import type { RbacUser } from "@/types/rbac"

export interface SessionInfo {
  user: { id: string; name: string; email: string }
  permissions: string[]
  entitlements: Record<string, boolean>
  packageName: string
  packageVersion: number
}

interface SessionContextValue {
  session: SessionInfo | null
  users: RbacUser[]
  loading: boolean
  refresh: () => Promise<void>
  switchUser: (userId: string) => Promise<void>
}

const SessionContext = createContext<SessionContextValue>({
  session: null,
  users: [],
  loading: true,
  refresh: async () => undefined,
  switchUser: async () => undefined,
})

export const devAuthEnabled = process.env.NEXT_PUBLIC_DEV_AUTH === "1"

export const SessionProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [users, setUsers] = useState<RbacUser[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const [s, u] = await Promise.all([
      fetch("/api/session").then((r) => (r.ok ? r.json() : null)),
      devAuthEnabled ? fetch("/api/users").then((r) => r.json()) : Promise.resolve([]),
    ])
    setSession(s)
    setUsers(u)
    setLoading(false)
  }, [])

  const switchUser = useCallback(
    async (userId: string) => {
      await fetch("/api/session/switch", { method: "POST", body: JSON.stringify({ userId }) })
      await refresh()
    },
    [refresh],
  )

  useEffect(() => { void refresh() }, [refresh])

  return (
    <SessionContext.Provider value={{ session, users, loading, refresh, switchUser }}>
      {children}
    </SessionContext.Provider>
  )
}

export const useSession = () => useContext(SessionContext)
