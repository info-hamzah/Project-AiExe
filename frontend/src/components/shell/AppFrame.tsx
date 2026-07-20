"use client"

import {
  AppstoreOutlined,
  BarChartOutlined,
  BgColorsOutlined,
  DollarOutlined,
  FileSearchOutlined,
  FundOutlined,
  PartitionOutlined,
  ShopOutlined,
  TeamOutlined,
} from "@ant-design/icons"
import { Avatar, Select, Space, Tag, Typography } from "antd"
import { usePathname, useRouter } from "next/navigation"
import React from "react"

import AppShell from "@/components/shell/AppShell"
import { devAuthEnabled, useSession } from "@/components/session/SessionContext"
import { brand } from "@/theme/tokens"

const { Text } = Typography

interface MenuEntry {
  key: string
  icon: React.ReactNode
  label: string
  permission: string | null
  title: string
  description: string
}

/** Menu registry grouped by audience; permission `null` = visible to everyone. */
const GROUPS: { label: string; items: MenuEntry[] }[] = [
  {
    label: "Workspace",
    items: [
      { key: "/", icon: <AppstoreOutlined />, label: "Overview", permission: null, title: "Overview", description: "Your entities, reports, and alerts at a glance" },
      { key: "/search", icon: <FileSearchOutlined />, label: "Search & Reports", permission: "reports.search", title: "Search & Reports", description: "Find an entity and buy its reports" },
      { key: "/dashboards", icon: <BarChartOutlined />, label: "Dashboards", permission: "dashboards.view", title: "Dashboards", description: "Compose views with Mina or by hand" },
      { key: "/graph", icon: <PartitionOutlined />, label: "Relationship Graph", permission: "graph.view", title: "Relationship Graph", description: "Ownership and directorship connections" },
      { key: "/partner", icon: <ShopOutlined />, label: "Partner Portal", permission: "partner.portal", title: "Partner Portal", description: "Your onboarded customers and earnings" },
    ],
  },
  {
    label: "Administration",
    items: [
      { key: "/roles", icon: <TeamOutlined />, label: "Roles & Access", permission: "roles.view", title: "Roles & Access", description: "Who can do what — changes apply instantly" },
      { key: "/packages", icon: <DollarOutlined />, label: "Packages & Pricing", permission: "packages.view", title: "Packages & Pricing", description: "Tiers, per-report prices, and versions" },
      { key: "/partners", icon: <ShopOutlined />, label: "Partners & Resellers", permission: "partners.view", title: "Partners & Resellers", description: "Channel organisations, terms, and commissions" },
      { key: "/finance", icon: <FundOutlined />, label: "Finance", permission: "finance.view", title: "Finance", description: "Revenue by channel, transactions, vouchers" },
    ],
  },
  {
    label: "System",
    items: [
      { key: "/design", icon: <BgColorsOutlined />, label: "Design System", permission: null, title: "Design System", description: "Component and token reference" },
    ],
  },
]

const ALL_ITEMS = GROUPS.flatMap((g) => g.items)

/**
 * Session-aware shell: grouped menu filtered through the central resolver,
 * page title in the header, persona switcher (dev) + tier chip on the right.
 */
const AppFrame: React.FC<React.PropsWithChildren> = ({ children }) => {
  const pathname = usePathname()
  const router = useRouter()
  const { session, users, switchUser } = useSession()

  const perms = new Set(session?.permissions ?? [])
  const menuItems = GROUPS.map((g) => ({
    type: "group" as const,
    label: g.label,
    children: g.items
      .filter((m) => m.permission === null || perms.has(m.permission))
      .map(({ key, icon, label }) => ({ key, icon, label })),
  })).filter((g) => g.children.length > 0)

  const current =
    ALL_ITEMS.find((m) => m.key !== "/" && pathname?.startsWith(m.key)) ??
    ALL_ITEMS.find((m) => m.key === pathname)

  return (
    <AppShell
      menuItems={menuItems}
      selectedKey={current?.key ?? pathname ?? undefined}
      onMenuSelect={({ key }) => router.push(String(key))}
      logo={
        <Space size={8} align="center">
          <span
            aria-hidden
            style={{
              width: 10, height: 10, borderRadius: 3,
              background: brand.cyan, display: "inline-block",
              boxShadow: "0 0 12px rgba(0, 161, 228, 0.8)",
            }}
          />
          <span>
            <Text strong style={{ color: "#FFFFFF", fontSize: 18, letterSpacing: 0.2 }}>AiExe</Text>
            <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, display: "block", marginTop: -4 }}>
              by Infomina
            </Text>
          </span>
        </Space>
      }
      headerLeft={
        current && (
          <span>
            <Text strong style={{ fontSize: 15 }}>{current.title}</Text>
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: -2 }}>
              {current.description}
            </Text>
          </span>
        )
      }
      headerRight={
        <Space>
          {session && (
            <Tag color={session.packageName === "Explorer" ? "default" : "processing"} style={{ marginInlineEnd: 0 }}>
              {session.packageName}
            </Tag>
          )}
          {devAuthEnabled && users.length > 0 && (
            <Select
              size="small"
              style={{ minWidth: 170 }}
              value={session?.user.id}
              options={users.map((u) => ({ label: u.name, value: u.id }))}
              onChange={(id) => { void switchUser(id).then(() => router.refresh()) }}
            />
          )}
          <Avatar style={{ backgroundColor: brand.cyan }}>
            {session?.user.name?.[0] ?? "?"}
          </Avatar>
        </Space>
      }
    >
      {children}
    </AppShell>
  )
}

export default AppFrame
