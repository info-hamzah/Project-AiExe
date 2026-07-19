"use client"

import { TeamOutlined, UserAddOutlined } from "@ant-design/icons"
import {
  App as AntApp,
  Button,
  Card,
  Col,
  Form,
  Input,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd"
import React, { useCallback, useEffect, useState } from "react"

import { brand, status as statusColors } from "@/theme/tokens"

const { Text, Title } = Typography
const rm = (cents: number) => `RM ${(cents / 100).toFixed(2)}`

interface PortalData {
  org: { id: string; name: string; type: "partner" | "reseller"; terms: { discountPct: number | null; commissionPct: number | null; version: number } | null }
  users: { id: string; name: string; email: string; joined_at: string; package: string | null }[]
  ledger: {
    entries: { id: string; grossCents: number; marginCents: number; commissionPct: number; commissionCents: number; state: string; createdAt: string }[]
    totals: { settledCents: number; paidCents: number }
  } | null
}

/**
 * Partner Portal (PA-6 rep view): onboard + manage own users, read-only earnings.
 * No pricing controls here by design — rates are admin-set (guardrail).
 */
export default function PartnerPortalPage() {
  const { message } = AntApp.useApp()
  const [data, setData] = useState<PortalData | null>(null)
  const [error, setError] = useState<string>()
  const [form] = Form.useForm()

  const reload = useCallback(async () => {
    const res = await fetch("/api/partner/me")
    if (!res.ok) {
      setError((await res.json()).error ?? "no access")
      return
    }
    setData(await res.json())
  }, [])
  useEffect(() => { void reload() }, [reload])

  const onboard = async () => {
    const v = await form.validateFields()
    const res = await fetch("/api/partner/onboard", { method: "POST", body: JSON.stringify(v) })
    if (!res.ok) return void message.error((await res.json()).error ?? "Failed")
    message.success(`${v.name} onboarded through ${data?.org.name}`)
    form.resetFields()
    await reload()
  }

  if (error) return <Card><Text type="secondary">Partner Portal: {error}</Text></Card>
  if (!data) return null
  const { org, users, ledger } = data

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card>
        <Space align="baseline" wrap style={{ justifyContent: "space-between", width: "100%" }}>
          <div>
            <Title level={3} style={{ margin: 0 }}><TeamOutlined /> {org.name}</Title>
            <Tag color={org.type === "reseller" ? "processing" : "purple"}>{org.type}</Tag>
            {org.terms && (
              <Text type="secondary">
                {org.type === "reseller"
                  ? ` Earning ${org.terms.commissionPct}% commission on the margin of every purchase by your users (terms v${org.terms.version}, set by AiExe admin)`
                  : ` Your users get ${org.terms.discountPct}% off service fees (terms v${org.terms.version}, set by AiExe admin)`}
              </Text>
            )}
          </div>
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={ledger ? 14 : 24}>
          <Card title={`Onboarded users (${users.length})`}>
            <Form form={form} layout="inline" style={{ marginBottom: 16, rowGap: 8 }}>
              <Form.Item name="name" rules={[{ required: true }]}><Input placeholder="Customer name" /></Form.Item>
              <Form.Item name="email" rules={[{ required: true, type: "email" }]}><Input placeholder="Email" /></Form.Item>
              <Button type="primary" icon={<UserAddOutlined />} onClick={onboard}>Onboard</Button>
            </Form>
            <Table
              rowKey="id"
              size="small"
              dataSource={users}
              pagination={{ pageSize: 6 }}
              columns={[
                { title: "User", render: (_: unknown, u: PortalData["users"][0]) => (
                  <Space direction="vertical" size={0}>
                    <Text strong style={{ fontSize: 13 }}>{u.name}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{u.email}</Text>
                  </Space>
                )},
                { title: "Package", dataIndex: "package", render: (p: string | null) => <Tag>{p ?? "—"}</Tag> },
                { title: "Joined", dataIndex: "joined_at", render: (d: string) => new Date(d).toLocaleDateString() },
              ]}
            />
          </Card>
        </Col>
        {ledger && (
          <Col xs={24} lg={10}>
            <Card title="My earnings (read-only)">
              <Row gutter={16} style={{ marginBottom: 12 }}>
                <Col span={12}><Statistic title="Pending payout" value={rm(ledger.totals.settledCents)} valueStyle={{ color: statusColors.warning, fontSize: 20 }} /></Col>
                <Col span={12}><Statistic title="Paid to date" value={rm(ledger.totals.paidCents)} valueStyle={{ color: statusColors.success, fontSize: 20 }} /></Col>
              </Row>
              <Table
                rowKey="id"
                size="small"
                dataSource={ledger.entries}
                pagination={{ pageSize: 6 }}
                columns={[
                  { title: "Date", dataIndex: "createdAt", render: (d: string) => new Date(d).toLocaleDateString() },
                  { title: "Margin", render: (_: unknown, e: NonNullable<PortalData["ledger"]>["entries"][0]) => rm(e.marginCents) },
                  { title: "Commission", render: (_: unknown, e: NonNullable<PortalData["ledger"]>["entries"][0]) => <Text strong style={{ color: brand.blue }}>{rm(e.commissionCents)}</Text> },
                  { title: "", dataIndex: "state", render: (s: string) => <Tag color={s === "paid" ? "success" : "warning"}>{s}</Tag> },
                ]}
              />
            </Card>
          </Col>
        )}
      </Row>
    </Space>
  )
}
