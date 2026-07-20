"use client"

import { CloseOutlined } from "@ant-design/icons"
import { Button, Card, Spin, Statistic, Table, Tag, Typography } from "antd"
import Link from "next/link"
import React, { useEffect, useState } from "react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import SigmaGraph from "@/components/graph/SigmaGraph"
import { rechartsTheme, seriesColor } from "@/theme/charts"
import { brand } from "@/theme/tokens"

const { Text } = Typography

interface WidgetInstance {
  key: string
  params?: Record<string, unknown>
}

/**
 * Registry-driven widget renderer (PA-22 scaling rule): renders whatever the
 * catalog declares — adding a widget type = one case here + a catalog entry.
 * Each widget fetches independently; a slow widget never stalls the page.
 */
const WidgetRenderer: React.FC<{ instance: WidgetInstance; onRemove?: () => void }> = ({ instance, onRemove }) => {
  const [payload, setPayload] = useState<{ widget: { name: string; widgetType: string }; data: never } | null>(null)
  const [error, setError] = useState<string>()

  useEffect(() => {
    setPayload(null)
    const qs = new URLSearchParams({ key: instance.key, params: JSON.stringify(instance.params ?? {}) })
    fetch(`/api/widgets/data?${qs}`).then(async (r) => {
      if (!r.ok) setError((await r.json()).error ?? "failed")
      else setPayload(await r.json())
    })
  }, [instance.key, JSON.stringify(instance.params)])

  const removeBtn = onRemove && (
    <Button size="small" type="text" icon={<CloseOutlined />} onClick={onRemove} aria-label="Remove widget" />
  )

  if (error) return <Card size="small" extra={removeBtn}><Text type="danger">{error}</Text></Card>
  if (!payload) return <Card size="small" style={{ minHeight: 120 }}><Spin /></Card>

  const { widget, data } = payload as { widget: { name: string; widgetType: string }; data: Record<string, never> }

  switch (widget.widgetType) {
    case "stat":
      return (
        <Card size="small" title={widget.name} extra={removeBtn}>
          <Statistic value={data.value} prefix={data.prefix} suffix={data.suffix} valueStyle={{ color: brand.navy.to }} />
        </Card>
      )
    case "bar_chart": {
      const rows = (data.rows ?? []) as { name: string; value: number }[]
      return (
        <Card size="small" title={widget.name} extra={removeBtn}>
          {rows.length === 0 ? <Text type="secondary">No data yet</Text> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={rows}>
                <CartesianGrid stroke={rechartsTheme.gridStroke} vertical={false} />
                <XAxis dataKey="name" stroke={rechartsTheme.axisStroke} tick={{ fill: rechartsTheme.tickFill, fontSize: 12 }} />
                <YAxis stroke={rechartsTheme.axisStroke} tick={{ fill: rechartsTheme.tickFill, fontSize: 12 }} width={44} />
                <Tooltip contentStyle={rechartsTheme.tooltipStyle} />
                <Bar dataKey="value" fill={seriesColor(0)} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      )
    }
    case "table": {
      const cols = ((data.columns ?? []) as { title: string; dataIndex: string; tag?: boolean; linkTo?: string }[]).map((c) => ({
        title: c.title,
        dataIndex: c.dataIndex,
        render: (v: string, row: Record<string, string>) => {
          if (c.tag) return <Tag color={v === "fulfilled" ? "success" : "warning"}>{v}</Tag>
          if (c.linkTo === "graph" && row.companyKey) return <Link href={`/graph?root=${row.companyKey}`}>{v}</Link>
          return v
        },
      }))
      return (
        <Card size="small" title={widget.name} extra={removeBtn}>
          <Table size="small" columns={cols} dataSource={(data.rows ?? []) as never[]} rowKey={(_, i) => String(i)} pagination={{ pageSize: 5, hideOnSinglePage: true }} scroll={{ x: 400 }} />
        </Card>
      )
    }
    case "graph":
      return (
        <Card size="small" title={widget.name} extra={removeBtn}>
          <SigmaGraph rootKey={(data.root as string) ?? "whb"} height={300} />
        </Card>
      )
    default:
      return <Card size="small" extra={removeBtn}><Text type="secondary">Unknown widget type</Text></Card>
  }
}

export default WidgetRenderer
