"use client"

import { App as AntApp, Button, Card, Col, Descriptions, List, Row, Space, Statistic, Table, Tabs, Tag, Typography } from "antd"
import { useParams, useRouter } from "next/navigation"
import React, { useCallback, useEffect, useState } from "react"

import SigmaGraph from "@/components/graph/SigmaGraph"
import LockedFeature from "@/components/shell/LockedFeature"
import type { DemoEntity } from "@/lib/demoData"
import { brand, status as statusColors } from "@/theme/tokens"

const { Text, Title } = Typography

interface CompanyDetail {
  entity: DemoEntity
  edges: { source: string; target: string; type: string; label: string; sourceName: string; targetName: string }[]
  financials: { year: number; revenue: number; profit: number; currentRatio: number; gearing: number }[] | null
  purchased: boolean
}

const rmM = (v: number) => `RM ${(v / 1_000_000).toFixed(2)}M`

/** Company profile — full ROC/ROB report when purchased, sneak-peek + buy CTA otherwise. */
export default function CompanyPage() {
  const params = useParams<{ key: string }>()
  const router = useRouter()
  const { message } = AntApp.useApp()
  const [detail, setDetail] = useState<CompanyDetail | null>(null)
  const [buying, setBuying] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/companies/${params.key}`)
    if (res.ok) setDetail(await res.json())
  }, [params.key])
  useEffect(() => { void load() }, [load])

  const purchase = async () => {
    setBuying(true)
    const res = await fetch("/api/orders", {
      method: "POST",
      body: JSON.stringify({ itemKey: "ssm_roc_rob", companyKey: params.key }),
    })
    setBuying(false)
    if (!res.ok) return void message.error((await res.json()).error ?? "Purchase failed")
    const order = await res.json()
    message.success(order.priceBreakdown.creditUsed ? "Report unlocked with a package credit" : `Report purchased — RM ${(order.priceBreakdown.totalCents / 100).toFixed(2)}`)
    await load()
  }

  if (!detail) return null
  const { entity, edges, financials, purchased } = detail
  const officers = edges.filter((e) => e.target === entity.key)

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card>
        <Space align="baseline" wrap style={{ justifyContent: "space-between", width: "100%" }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>{entity.name}</Title>
            <Text type="secondary">{entity.regNo}</Text>
          </div>
          <Space>
            {entity.status && <Tag color={entity.status === "Active" ? "success" : "error"}>{entity.status}</Tag>}
            {entity.flagged && <Tag color="error">flagged</Tag>}
            {purchased ? (
              <Tag color="processing">ROC/ROB report owned</Tag>
            ) : (
              <Button type="primary" loading={buying} onClick={purchase}>Buy ROC/ROB report — RM 15.40</Button>
            )}
          </Space>
        </Space>
      </Card>

      <Tabs
        defaultActiveKey="report"
        items={[
          {
            key: "report",
            label: "Report",
            children: purchased ? (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <Card title="Company profile">
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="Registration No.">{entity.regNo}</Descriptions.Item>
                      <Descriptions.Item label="Incorporated">{entity.incorporated}</Descriptions.Item>
                      <Descriptions.Item label="MSIC">{entity.msic ?? "—"}</Descriptions.Item>
                      <Descriptions.Item label="Paid-up capital">{entity.paidUpCapital ? rmM(entity.paidUpCapital) : "—"}</Descriptions.Item>
                      <Descriptions.Item label="Registered address">{entity.address ?? "—"}</Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title="Officers & shareholders">
                    <List
                      size="small"
                      dataSource={officers}
                      renderItem={(e) => (
                        <List.Item>
                          <Space>
                            <Tag color={e.type === "beneficial_ownership" ? "purple" : e.type === "bo_changed" ? "warning" : "default"}>
                              {e.type.replace(/_/g, " ")}
                            </Tag>
                            <Text>{e.sourceName}</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>{e.label}</Text>
                          </Space>
                        </List.Item>
                      )}
                    />
                  </Card>
                </Col>
                <Col xs={24}>
                  <Card title="Financials (3-year)">
                    <Row gutter={[16, 16]}>
                      {financials?.map((f) => (
                        <Col xs={24} sm={8} key={f.year}>
                          <Card size="small" style={{ background: "#F9FAFB" }}>
                            <Statistic title={`FY${f.year} revenue`} value={rmM(f.revenue)} valueStyle={{ fontSize: 18, color: brand.navy.to }} />
                            <Statistic
                              title="Profit"
                              value={rmM(f.profit)}
                              valueStyle={{ fontSize: 15, color: f.profit >= 0 ? statusColors.success : statusColors.error }}
                            />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Current ratio {f.currentRatio} · Gearing {f.gearing}
                            </Text>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Metric definitions are server-side (widget catalog rule) — dummy data via PA-24 harness.
                    </Text>
                  </Card>
                </Col>
              </Row>
            ) : (
              <LockedFeature
                entitlementKey="report.ssm_roc_rob"
                featureName="Full ROC/ROB report"
                benefit="Company profile, officers & shareholders, beneficial owners, and 3-year financials. RM 15.40 — free with Pro/Elite credits."
                preview={
                  <div style={{ padding: 24 }}>
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="Registration No.">{entity.regNo}</Descriptions.Item>
                      <Descriptions.Item label="Incorporated">{entity.incorporated}</Descriptions.Item>
                      <Descriptions.Item label="MSIC">████████████</Descriptions.Item>
                      <Descriptions.Item label="Paid-up capital">████████</Descriptions.Item>
                    </Descriptions>
                    <div style={{ height: 80, background: "#F3F4F6", borderRadius: 12, marginTop: 12 }} />
                  </div>
                }
                onImpression={(k) => void fetch("/api/events/sneakpeek", { method: "POST", body: JSON.stringify({ entitlementKey: k, event: "impression" }) })}
                onUpgradeClick={() => void purchase()}
              />
            ),
          },
          {
            key: "graph",
            label: "Relationship graph",
            children: (
              <Card>
                <SigmaGraph rootKey={entity.key} onNodeClick={(k) => router.push(`/company/${k}`)} />
              </Card>
            ),
          },
        ]}
      />
    </Space>
  )
}
