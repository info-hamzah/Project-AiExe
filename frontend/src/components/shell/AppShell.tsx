"use client"

import { Drawer, Grid, Layout, Menu, type MenuProps } from "antd"
import React, { useState } from "react"

import { navyGradient } from "@/theme/tokens"

const { Sider, Header, Content } = Layout
const { useBreakpoint } = Grid

export interface AppShellProps {
  /** Menu items — built by the caller from the permission resolver (PA-2/PA-16). */
  menuItems: MenuProps["items"]
  selectedKey?: string
  onMenuSelect?: MenuProps["onSelect"]
  logo?: React.ReactNode
  headerRight?: React.ReactNode // user menu, notifications
  children: React.ReactNode
}

/**
 * Revamped app shell (PA-15): navy-gradient sidebar (the landing page's signature
 * element), light content area, responsive — sidebar collapses to a Drawer below md.
 * Ships behind a feature flag; screens adopt it as they are revamped.
 */
const AppShell: React.FC<AppShellProps> = ({
  menuItems,
  selectedKey,
  onMenuSelect,
  logo,
  headerRight,
  children,
}) => {
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const menu = (
    <Menu
      theme="dark"
      mode="inline"
      style={{ background: "transparent", borderInlineEnd: "none" }}
      items={menuItems}
      selectedKeys={selectedKey ? [selectedKey] : undefined}
      onSelect={(info) => {
        onMenuSelect?.(info)
        if (isMobile) setDrawerOpen(false)
      }}
    />
  )

  const sidebarStyle: React.CSSProperties = {
    background: navyGradient,
    minHeight: "100vh",
  }

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {isMobile ? (
        <Drawer
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={264}
          styles={{ body: { ...sidebarStyle, padding: 0 } }}
          closable={false}
        >
          <div style={{ padding: 16 }}>{logo}</div>
          {menu}
        </Drawer>
      ) : (
        <Sider
          width={240}
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          style={sidebarStyle}
        >
          <div style={{ padding: 16 }}>{logo}</div>
          {menu}
        </Sider>
      )}

      <Layout>
        <Header
          style={{
            background: "#FFFFFF",
            padding: "0 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #E5E7EB",
          }}
        >
          {isMobile ? (
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setDrawerOpen(true)}
              style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }}
            >
              ☰
            </button>
          ) : (
            <span />
          )}
          {headerRight}
        </Header>
        <Content style={{ padding: isMobile ? 12 : 24 }}>{children}</Content>
      </Layout>
    </Layout>
  )
}

export default AppShell
