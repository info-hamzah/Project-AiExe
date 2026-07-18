import { describe, expect, it } from "vitest"

import { effectiveAccess, hasPermission } from "@/lib/access"
import type { RbacUser, Role } from "@/types/rbac"

const role = (id: string, keys: string[]): Role => ({
  id, name: id, description: "", isSystem: false, permissionKeys: keys,
  createdAt: "", updatedAt: "",
})
const user = (roleIds: string[]): RbacUser => ({ id: "u1", name: "U", email: "u@x", roleIds })

describe("effectiveAccess (central resolver — PRD FR-1.4)", () => {
  const roles = [role("a", ["reports.search", "graph.view"]), role("b", ["graph.view", "finance.view"])]

  it("unions permissions across multiple roles", () => {
    expect([...effectiveAccess(user(["a", "b"]), roles)].sort()).toEqual([
      "finance.view", "graph.view", "reports.search",
    ])
  })

  it("returns empty for a user with no roles", () => {
    expect(effectiveAccess(user([]), roles).size).toBe(0)
  })

  it("ignores unknown role ids", () => {
    expect(effectiveAccess(user(["ghost"]), roles).size).toBe(0)
  })

  it("intersects with tier entitlements when provided", () => {
    const access = effectiveAccess(user(["a", "b"]), roles, new Set(["graph.view"]))
    expect([...access]).toEqual(["graph.view"])
  })

  it("hasPermission reads the resolved set only", () => {
    const access = effectiveAccess(user(["a"]), roles)
    expect(hasPermission(access, "reports.search")).toBe(true)
    expect(hasPermission(access, "finance.view")).toBe(false)
  })
})
