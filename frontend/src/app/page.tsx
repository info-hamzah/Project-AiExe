"use client"

import { CheckCircleOutlined, ThunderboltOutlined } from "@ant-design/icons"
import { App as AntApp, Button, Card, Col, Row, Space, Statistic, Tag, Typography } from "antd"
import { useCallback, useEffect, useState } from "react"

import { useSession } from "@/components/session/SessionContext"
import StatCard from "@/components/ui/StatCard"
import LockedFeature from "@/components/shell/LockedFeature"
import { brand, status } from "@/theme/tokens"

const { Text, Title, Paragraph } = Typography

const postEvent = (entitlementKey: string, event: "impression" | "cta_click") =>
  fetch("/api/events/sneakpeek", { method: "POST", body: JSON.stringify({ entitlementKey, event }) })

interface FunnelRow { entitlement_key: string; event: string; n: number }

/**
 * Dashboard — Module 1 gating demo. The Mina AI card is entitlement-driven:
 * Explorer users get the sneak-peek + upsell; Pro/Elite (or bundle owners) get
 * the unlocked state. Tier-change buttons simulate checkout (real orders = Module 2).
 */
export default function Home() {
  const { message } = AntApp.useApp()
  const { session, refresh } = useSession()
  const [funnel, setFunnel] = useState<FunnelRow[]>([])

  const loadFunnel = useCallback(
    () => fetch("/api/events/sneakpeek").then((r) => r.json()).then(setFunnel),
    [],
  )
  useEffect(() => { void loadFunnel() }, [loadFunnel])

  const minaUnlocked = Boolean(session?.entitlements["mina_chat"])

  const act = async (path: string, body?: unknown, success?: string) => {
    const res = await fetch(path, { method: "POST", body: body ? JSON.stringify(body) : undefined })
    if (!res.ok) return void message.error((await res.json()).error ?? "Failed")
    if (success) message.success(success)
    await refresh()
    await loadFunnel()
  }

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="Monitored entities" value={128} hint="across your watchlists" accent={brand.navy.to} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="BO changes" value={7} hint="last 14 days · Companies Act window" delta={17} accent={status.warning} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="Reports this month" value={42} delta={-8} hint="vs June" accent={brand.cyan} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="Effective permissions" value={session?.permissions.length ?? 0} hint="via your roles and tier" accent={brand.purple} />
        </Col>

        <Col xs={24} lg={14}>
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
          {minaUnlocked ? (
            <Card
              title={<Space><ThunderboltOutlined style={{ color: brand.purple }} /> Mina AI — enabled</Space>}
              style={{ borderColor: brand.purple }}
            >
              <Paragraph>
                <CheckCircleOutlined style={{ color: status.success }} /> Executive summaries, visualization
                graph, Mina chat, BizInfo, Business Radius Scan, Stakeholder Insights, E-court links, TIN.
              </Paragraph>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Unlocked via {session?.packageName === "Explorer" ? "RM10 top-up (persists after downgrade)" : `${session?.packageName} tier`}.
              </Text>
            </Card>
          ) : (
            <LockedFeature
              entitlementKey="mina_chat"
              featureName="Mina AI suite"
              benefit="Executive summaries, AI chat, visualization graph and more — included in Pro, or unlock on Explorer with the RM10 bundle."
              preview={
                <div style={{ padding: 24 }}>
                  <Paragraph>“Summarise this company's risk profile” → Mina responds…</Paragraph>
                  <div style={{ height: 120, background: "#F3F4F6", borderRadius: 12 }} />
                </div>
              }
              onImpression={(k) => void postEvent(k, "impression")}
              onUpgradeClick={(k) => {
                void postEvent(k, "cta_click")
                void act("/api/session/upgrade", { packageName: "Pro" }, "Upgraded to Pro — features unlocked, zero deploys")
              }}
            />
          )}
            <Card title="Sneak-peek funnel (live)">
              {funnel.length === 0 ? (
                <Text type="secondary">No events yet — visit a locked feature as an Explorer user.</Text>
              ) : (
                <Space direction="vertical" size={2}>
                  {funnel.map((f) => (
                    <Text key={`${f.entitlement_key}-${f.event}`} style={{ fontSize: 13 }}>
                      <Tag color={f.event === "cta_click" ? "processing" : "default"}>{f.event}</Tag>
                      {f.entitlement_key}: <Text strong>{f.n}</Text>
                    </Text>
                  ))}
                </Space>
              )}
            </Card>
          </Space>
        </Col>

        <Col xs={24} lg={10}>
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Card title="Your plan" size="small">
              <Text type="secondary" style={{ fontSize: 13 }}>
                {session?.user.name} · {session?.packageName} v{session?.packageVersion}
              </Text>
            </Card>
            <Card title="Tier controls (simulated checkout — Module 2 wires real orders)">
              <Space wrap>
                <Button type="primary" onClick={() => act("/api/session/upgrade", { packageName: "Pro" }, "Moved to Pro")}>Upgrade to Pro</Button>
                <Button onClick={() => act("/api/session/upgrade", { packageName: "Elite" }, "Moved to Elite")}>Elite</Button>
                <Button danger onClick={() => act("/api/session/upgrade", { packageName: "Explorer" }, "Downgraded to Explorer")}>Downgrade to Explorer</Button>
                <Button style={{ borderColor: brand.purple, color: brand.purple }} onClick={() => act("/api/session/topup", undefined, "RM10 bundle granted — persists after downgrade")}>
                  Buy RM10 bundle
                </Button>
              </Space>
            </Card>
          </Space>
        </Col>
      </Row>
    </div>
  )
}
