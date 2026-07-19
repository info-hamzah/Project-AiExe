"use client"

import {
  AppstoreOutlined,
  BgColorsOutlined,
  DollarOutlined,
  FileSearchOutlined,
  ShopOutlined,
  PartitionOutlined,
  TeamOutlined,
} from "@ant-design/icons"
import { Avatar, Select, Space, Tag, Typography } from "antd"
import { usePathname, useRouter } from "next/navigation"
import React from "react"

import AppShell from "@/components/shell/AppShell"
import { devAuthEnabled, useSession } from "@/components/session/SessionContext"
import { brand } from "@/theme/tokens"

/** Menu registry: permission `null` = visible to everyone. */
const MENU = [
  { key: "/", icon: <AppstoreOutlined />, label: "Dashboard", permission: null },
  { key: "/search", icon: <FileSearchOutlined />, label: "Search & Reports", permission: "reports.search" },
  { key: "/roles", icon: <TeamOutlined />, label: "Roles & Access", permission: "roles.view" },
  { key: "/packages", icon: <DollarOutlined />, label: "Packages & Pricing", permission: "packages.view" },
  { key: "/partners", icon: <ShopOutlined />, label: "Partners & Resellers", permission: "partners.view" },
  { key: "/partner", icon: <ShopOutlined />, label: "Partner Portal", permission: "partner.portal" },
  { key: "/graph", icon: <PartitionOutlined />, label: "Relationship Graph", permission: "graph.view" },
  { key: "/design", icon: <BgColorsOutlined />, label: "Design System", permission: null },
]

/**
 * Session-aware shell: menu filtered through the central resolver's output,
 * header shows the persona switcher (dev) + current package tier.
 */
const AppFrame: React.FC<React.PropsWithChildren> = ({ children }) => {
  const pathname = usePathname()
  const router = useRouter()
  const { session, users, switchUser } = useSession()

  const perms = new Set(session?.permissions ?? [])
  const menuItems = MENU.filter((m) => m.permission === null || perms.has(m.permission)).map(
    ({ key, icon, label }) => ({ key, icon, label }),
  )

  return (
    <AppShell
      menuItems={menuItems}
      selectedKey={pathname ?? undefined}
      onMenuSelect={({ key }) => router.push(String(key))}
      logo={
        <Typography.Text strong style={{ color: "#FFFFFF", fontSize: 18 }}>
          AiExe
        </Typography.Text>
      }
      headerRight={
        <Space>
          {session && <Tag color={session.packageName === "Explorer" ? "default" : "processing"}>{session.packageName}</Tag>}
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
