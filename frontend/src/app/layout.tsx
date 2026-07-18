"use client"

import { AntdRegistry } from "@ant-design/nextjs-registry"
import { App as AntApp, ConfigProvider } from "antd"
import en_US from "antd/locale/en_US"
import { Inter } from "next/font/google"
import React from "react"

import { SessionProvider } from "@/components/session/SessionContext"
import AppFrame from "@/components/shell/AppFrame"
import { infominaTheme } from "@/theme/antd-theme"

import "./globals.css"

const inter = Inter({ subsets: ["latin"], display: "swap" })

/**
 * UI revamp feature flag (PA-15). Defaults ON in this greenfield app;
 * set NEXT_PUBLIC_UI_REVAMP=0 for a bare layout (legacy-embedding parity mode).
 */
const uiRevampEnabled = process.env.NEXT_PUBLIC_UI_REVAMP !== "0"

const RootLayout: React.FC<React.PropsWithChildren> = ({ children }) => (
  <html lang="en" className={inter.className}>
    <body>
      <AntdRegistry>
        <ConfigProvider theme={infominaTheme} locale={en_US}>
          <AntApp>
            <SessionProvider>
              {uiRevampEnabled ? <AppFrame>{children}</AppFrame> : children}
            </SessionProvider>
          </AntApp>
        </ConfigProvider>
      </AntdRegistry>
    </body>
  </html>
)

export default RootLayout
