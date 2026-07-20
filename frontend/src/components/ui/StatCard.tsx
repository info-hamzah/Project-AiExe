"use client"

import { ArrowDownOutlined, ArrowUpOutlined } from "@ant-design/icons"
import { Card, Typography } from "antd"
import React from "react"

import { neutral, status } from "@/theme/tokens"

const { Text } = Typography

export interface StatCardProps {
  label: string
  value: React.ReactNode
  /** small context line under the value ("of 18 permissions", "last 14 days") */
  hint?: string
  /** signed % change; renders arrow + status color */
  delta?: number
  accent?: string
}

/**
 * Stat tile per the dataviz spec: muted label, dominant value, optional delta
 * with direction icon (never color alone). Left accent bar is the only ornament.
 */
const StatCard: React.FC<StatCardProps> = ({ label, value, hint, delta, accent = "#00A1E4" }) => (
  <Card
    size="small"
    styles={{ body: { padding: "16px 20px", borderLeft: `3px solid ${accent}`, borderRadius: 12 } }}
  >
    <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4 }}>
      {label}
    </Text>
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 2 }}>
      <span style={{ fontSize: 28, fontWeight: 600, color: neutral.textPrimary, lineHeight: 1.2 }}>
        {value}
      </span>
      {delta !== undefined && (
        <Text style={{ fontSize: 13, color: delta >= 0 ? status.success : status.error }}>
          {delta >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {Math.abs(delta)}%
        </Text>
      )}
    </div>
    {hint && <Text type="secondary" style={{ fontSize: 12 }}>{hint}</Text>}
  </Card>
)

export default StatCard
