"use client"

import {
  AppstoreOutlined,
  BgColorsOutlined,
  DollarOutlined,
  PartitionOutlined,
  TeamOutlined,
} from "@ant-design/icons"
import { AntdRegistry } from "@ant-design/nextjs-registry"
import { Avatar, ConfigProvider, Typography } from "antd"
import en_US from "antd/locale/en_US"
import { Inter } from "next/font/google"
import { usePathname, useRouter } from "next/navigation"
import React from "react"

import AppShell from "@/components/shell/AppShell"
import { infominaTheme } from "@/theme/antd-theme"
import { brand } from "@/theme/tokens"

import "./globals.css"

const inter = Inter({ subsets: ["latin"], display: "swap" })

/**
 * UI revamp feature flag (PA-15). Defaults ON in this greenfield app;
 * set NEXT_PUBLIC_UI_REVAMP=0 to fall back to a bare layout (parity harness
 * for embedding these screens into the legacy FE incrementally).
 */
const uiRevampEnabled = process.env.NEXT_PUBLIC_UI_REVAMP !== "0"

const menuItems = [
  { key: "/", icon: <AppstoreOutlined />, label: "Dashboard" },
  { key: "/roles", icon: <TeamOutlined />, label: "Roles & Access" },
  { key: "/packages", icon: <DollarOutlined />, label: "Packages & Pricing" },
  { key: "/graph", icon: <PartitionOutlined />, label: "Relationship Graph" },
  { key: "/design", icon: <BgColorsOutlined />, label: "Design System" },
]

const RootLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <html lang="en" className={inter.className}>
      <body>
        <AntdRegistry>
          <ConfigProvider theme={infominaTheme} locale={en_US}>
            {uiRevampEnabled ? (
              <AppShell
                menuItems={menuItems}
                selectedKey={pathname ?? undefined}
                onMenuSelect={({ key }) => router.push(String(key))}
                logo={
                  <Typography.Text strong style={{ color: "#FFFFFF", fontSize: 18 }}>
                    AiExe
                  </Typography.Text>
                }
                headerRight={<Avatar style={{ backgroundColor: brand.cyan }}>H</Avatar>}
              >
                {children}
              </AppShell>
            ) : (
              children
            )}
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  )
}

export default RootLayout
