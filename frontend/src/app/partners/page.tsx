"use client"

import { PlusOutlined, ShopOutlined } from "@ant-design/icons"
import {
  App as AntApp,
  Button,
  Card,
  Col,
  Drawer,
  Form,
  Input,
  InputNumber,
  Radio,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd"
import React, { useCallback, useEffect, useState } from "react"

import { useSession } from "@/components/session/SessionContext"
import { brand, status as statusColors } from "@/theme/tokens"

const { Text, Title } = Typography
const rm = (cents: number) => `RM ${(cents / 100).toFixed(2)}`

interface OrgView {
  id: string
  name: string
  type: "partner" | "reseller"
  status: string
  repName: string | null
  terms: { version: number; discountPct: number | null; commissionPct: number | null } | null
  termsHistory: { version: number; discountPct: number | null; commissionPct: number | null; effectiveFrom: string }[]
  userCount: number
}

interface LedgerData {
  entries: { id: string; resellerName: string; grossCents: number; marginCents: number; commissionPct: number; commissionCents: number; state: string; createdAt: string }[]
  totals: { settledCents: number; paidCents: number }
}

/** Admin B2B2B console (PA-6/PA-7/PA-20 slice): orgs, terms, ledger, payouts. */
export default function PartnersPage() {
  const { message } = AntApp.useApp()
  const { session } = useSession()
  const [orgs, setOrgs] = useState<OrgView[]>([])
  const [ledger, setLedger] = useState<LedgerData | null>(null)
  const [creating, setCreating] = useState(false)
  const [form] = Form.useForm()
  const canManage = session?.permissions.includes("partners.manage")
  const canReconcile = session?.permissions.includes("finance.reconcile")

  const reload = useCallback(async () => {
    const res = await fetch("/api/partners")
    if (res.ok) setOrgs(await res.json())
    const led = await fetch("/api/ledger")
    if (led.ok) setLedger(await led.json())
    else setLedger(null)
  }, [])
  useEffect(() => { void reload() }, [reload])

  const create = async () => {
    const v = await form.validateFields()
    const res = await fetch("/api/partners", {
      method: "POST",
      body: JSON.stringify({
        name: v.name, type: v.type,
        discountPct: v.type === "partner" ? v.rate : undefined,
        commissionPct: v.type === "reseller" ? v.rate : undefined,
        repName: v.repName, repEmail: v.repEmail,
      }),
    })
    if (!res.ok) return void message.error((await res.json()).error ?? "Failed")
    message.success("Org created — rep can now use the Partner Portal")
    setCreating(false)
    form.resetFields()
    await reload()
  }

  const updateRate = async (org: OrgView, rate: number) => {
    const res = await fetch(`/api/partners/${org.id}/terms`, {
      method: "POST",
      body: JSON.stringify(org.type === "partner" ? { discountPct: rate } : { commissionPct: rate }),
    })
    if (!res.ok) return void message.error((await res.json()).error ?? "Failed")
    message.success(`Terms v${(org.terms?.version ?? 0) + 1} published`)
    await reload()
  }

  const markPaid = async (orgId: string) => {
    const res = await fetch(`/api/ledger/${orgId}/payout`, { method: "POST" })
    if (!res.ok) return void message.error((await res.json()).error ?? "Failed")
    message.success(`Marked ${(await res.json()).marked} entries paid`)
    await reload()
  }

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card
        title={<Space><ShopOutlined /> Partner & Reseller Organisations</Space>}
        extra={canManage && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>New org</Button>
        )}
      >
        <Table
          rowKey="id"
          dataSource={orgs}
          pagination={false}
          scroll={{ x: 700 }}
          columns={[
            { title: "Organisation", dataIndex: "name", render: (n: string, o: OrgView) => (
              <Space direction="vertical" size={0}>
                <Text strong>{n}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>Rep: {o.repName ?? "—"}</Text>
              </Space>
            )},
            { title: "Type", dataIndex: "type", render: (t: string) => (
              <Tag color={t === "reseller" ? "processing" : "purple"}>{t}</Tag>
            )},
            { title: "Terms", render: (_: unknown, o: OrgView) => o.terms ? (
              <Space direction="vertical" size={0}>
                <Text>{o.type === "partner" ? `${o.terms.discountPct}% discount (fee only)` : `${o.terms.commissionPct}% commission (margin only)`}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>v{o.terms.version} · {o.termsHistory.length} version(s)</Text>
              </Space>
            ) : "—"},
            { title: "Users", dataIndex: "userCount" },
            ...(canManage ? [{
              title: "",
              render: (_: unknown, o: OrgView) => (
                <InputNumber
                  size="small"
                  min={0} max={100}
                  placeholder="new %"
                  style={{ width: 100 }}
                  onPressEnter={(e) => {
                    const v = Number((e.target as HTMLInputElement).value)
                    if (v >= 0) void updateRate(o, v)
                  }}
                />
              ),
            }] : []),
          ]}
        />
        {canManage && <Text type="secondary" style={{ fontSize: 12 }}>Type a new rate and press Enter — publishes a new attributed terms version.</Text>}
      </Card>

      {ledger && (
        <Card title="Commission ledger (settled-only entries, margin component)">
          <Row gutter={[16, 16]} style={{ marginBottom: 12 }}>
            <Col xs={12} md={6}><Statistic title="Owed (settled)" value={rm(ledger.totals.settledCents)} valueStyle={{ color: statusColors.warning }} /></Col>
            <Col xs={12} md={6}><Statistic title="Paid out" value={rm(ledger.totals.paidCents)} valueStyle={{ color: statusColors.success }} /></Col>
          </Row>
          <Table
            rowKey="id"
            size="small"
            dataSource={ledger.entries}
            pagination={{ pageSize: 8 }}
            scroll={{ x: 620 }}
            columns={[
              { title: "Reseller", dataIndex: "resellerName" },
              { title: "Gross", render: (_: unknown, e: LedgerData["entries"][0]) => rm(e.grossCents) },
              { title: "Margin", render: (_: unknown, e: LedgerData["entries"][0]) => rm(e.marginCents) },
              { title: "Rate", render: (_: unknown, e: LedgerData["entries"][0]) => `${e.commissionPct}%` },
              { title: "Commission", render: (_: unknown, e: LedgerData["entries"][0]) => <Text strong style={{ color: brand.blue }}>{rm(e.commissionCents)}</Text> },
              { title: "State", dataIndex: "state", render: (s: string) => <Tag color={s === "paid" ? "success" : "warning"}>{s}</Tag> },
            ]}
          />
          {canReconcile && orgs.filter((o) => o.type === "reseller").map((o) => (
            <Button key={o.id} size="small" onClick={() => markPaid(o.id)} style={{ marginRight: 8 }}>
              Mark {o.name} settled → paid
            </Button>
          ))}
        </Card>
      )}

      <Drawer
        title="New partner / reseller organisation"
        open={creating}
        onClose={() => setCreating(false)}
        width={420}
        extra={<Button type="primary" onClick={create}>Create</Button>}
      >
        <Form form={form} layout="vertical" initialValues={{ type: "reseller", rate: 20 }}>
          <Form.Item name="name" label="Organisation name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Xmartalex" />
          </Form.Item>
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Radio.Group>
              <Radio.Button value="reseller">Reseller (earns commission)</Radio.Button>
              <Radio.Button value="partner">Partner (gets discount)</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="rate" label="Rate % (commission on margin / discount on service fee)" rules={[{ required: true }]}>
            <InputNumber min={0} max={100} style={{ width: "100%" }} />
          </Form.Item>
          <Title level={5}>Representative account</Title>
          <Form.Item name="repName" label="Rep name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Rina Yusof" />
          </Form.Item>
          <Form.Item name="repEmail" label="Rep email" rules={[{ required: true, type: "email" }]}>
            <Input placeholder="rina@xmartalex.my" />
          </Form.Item>
          <Text type="secondary" style={{ fontSize: 12 }}>
            The rep gets Partner Portal access and can onboard customers; pricing stays admin-controlled (guardrail).
          </Text>
        </Form>
      </Drawer>
    </Space>
  )
}
