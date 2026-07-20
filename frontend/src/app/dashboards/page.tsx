"use client"

import { SaveOutlined, ThunderboltOutlined } from "@ant-design/icons"
import { App as AntApp, Button, Card, Col, Input, Row, Select, Space, Tag, Typography } from "antd"
import React, { useCallback, useEffect, useState } from "react"

import WidgetRenderer from "@/components/dashboard/WidgetRenderer"
import { useSession } from "@/components/session/SessionContext"
import { brand } from "@/theme/tokens"

const { Text, Title } = Typography

interface WidgetInstance { key: string; params?: Record<string, unknown> }
interface CatalogEntry { key: string; name: string; description: string }

/**
 * AI-composed dashboards (PA-10/PA-13/PA-22): Mina generates from the widget
 * catalog only; users edit + save personal; admins publish the default.
 */
export default function DashboardsPage() {
  const { message } = AntApp.useApp()
  const { session } = useSession()
  const [widgets, setWidgets] = useState<WidgetInstance[]>([])
  const [source, setSource] = useState<string>("")
  const [catalog, setCatalog] = useState<CatalogEntry[]>([])
  const [prompt, setPrompt] = useState("")
  const [generating, setGenerating] = useState(false)
  const [note, setNote] = useState<string>()

  useEffect(() => {
    void fetch("/api/dashboards/current").then(async (r) => {
      if (r.ok) {
        const d = await r.json()
        setWidgets(d.config.widgets)
        setSource(d.source)
      }
    })
    void fetch("/api/widgets").then(async (r) => { if (r.ok) setCatalog(await r.json()) })
  }, [])

  const generate = useCallback(async () => {
    if (!prompt.trim()) return
    setGenerating(true)
    setNote(undefined)
    const res = await fetch("/api/dashboards/generate", { method: "POST", body: JSON.stringify({ prompt }) })
    setGenerating(false)
    if (!res.ok) return void message.error("Generation failed")
    const out = await res.json()
    if (out.unsupported) {
      setNote(`${out.message} Try: ${out.suggestions.join(" · ")}`)
      return
    }
    setWidgets(out.widgets)
    setNote(out.explanation)
    setSource("unsaved")
  }, [prompt, message])

  const save = async () => {
    const res = await fetch("/api/dashboards", { method: "POST", body: JSON.stringify({ schemaVersion: 1, widgets }) })
    if (!res.ok) return void message.error((await res.json()).error ?? "Save failed")
    message.success("Saved as your personal dashboard")
    setSource("personal")
  }

  const publish = async () => {
    const res = await fetch("/api/dashboards/publish", { method: "POST", body: JSON.stringify({ schemaVersion: 1, widgets }) })
    if (!res.ok) return void message.error((await res.json()).error ?? "Publish failed")
    message.success("Published as the default dashboard for all users without a personal one")
  }

  const canPublish = session?.permissions.includes("dashboards.publish")

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card>
        <Space direction="vertical" style={{ width: "100%" }}>
          <Space align="baseline" wrap style={{ justifyContent: "space-between", width: "100%" }}>
            <Title level={3} style={{ margin: 0 }}>
              Dashboards <Tag>{source}</Tag>
            </Title>
            <Space wrap>
              <Select
                placeholder="Add widget…"
                style={{ minWidth: 220 }}
                options={catalog.map((c) => ({ label: c.name, value: c.key }))}
                value={null}
                onChange={(key) => key && setWidgets((w) => [...w, { key }])}
              />
              <Button icon={<SaveOutlined />} onClick={save}>Save personal</Button>
              {canPublish && <Button onClick={publish}>Publish as default</Button>}
            </Space>
          </Space>
          <Input.Search
            size="large"
            placeholder='Ask Mina — e.g. "show my monitored companies with recent BO changes"'
            prefix={<ThunderboltOutlined style={{ color: brand.purple }} />}
            enterButton="Generate"
            loading={generating}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onSearch={() => void generate()}
          />
          {note && <Text type="secondary" style={{ fontSize: 12 }}>{note}</Text>}
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        {widgets.map((w, i) => (
          <Col
            key={`${w.key}-${i}`}
            xs={24}
            md={["table", "graph"].some((t) => w.key.startsWith(t === "table" ? "table" : "graph")) ? 24 : 12}
            xl={w.key.startsWith("stat") ? 6 : w.key.startsWith("chart") ? 12 : 12}
          >
            <WidgetRenderer instance={w} onRemove={() => setWidgets((ws) => ws.filter((_, j) => j !== i))} />
          </Col>
        ))}
        {widgets.length === 0 && (
          <Col span={24}><Card><Text type="secondary">No widgets — ask Mina above or add from the catalog.</Text></Card></Col>
        )}
      </Row>
    </Space>
  )
}
