"use client"

import { DownloadOutlined, SyncOutlined } from "@ant-design/icons"
import {
  App as AntApp,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd"
import React, { useCallback, useEffect, useState } from "react"

import { useSession } from "@/components/session/SessionContext"
import { brand } from "@/theme/tokens"

const { Text, Title } = Typography
const rm = (cents: number) => `RM ${(cents / 100).toFixed(2)}`

interface Tx { id: string; state: string; created_at: string; buyer: string; source: string; item: string; total_cents: number; credit_used: boolean; company: string | null }
interface Voucher { id: string; code: string; name: string; scopeItemKeys: string[]; feeDiscountPct: number; maxRedemptions: number; redeemed: number }

/** Finance console (PA-20): revenue by channel, transactions, reconciler, vouchers. */
export default function FinancePage() {
  const { message } = AntApp.useApp()
  const { session } = useSession()
  const [txs, setTxs] = useState<Tx[]>([])
  const [totals, setTotals] = useState<{ source: string; cents: number; n: number }[]>([])
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [catalog, setCatalog] = useState<{ key: string; name: string }[]>([])
  const [vForm] = Form.useForm()
  const canManagePkg = session?.permissions.includes("packages.manage")
  const canReconcile = session?.permissions.includes("finance.reconcile")

  const reload = useCallback(async () => {
    const res = await fetch("/api/finance/transactions")
    if (res.ok) {
      const d = await res.json()
      setTxs(d.transactions)
      setTotals(d.totals)
    }
    const v = await fetch("/api/vouchers")
    if (v.ok) setVouchers(await v.json())
    const c = await fetch("/api/catalog")
    if (c.ok) setCatalog(await c.json())
  }, [])
  useEffect(() => { void reload() }, [reload])

  const runReconciler = async () => {
    const res = await fetch("/api/admin/reconcile", { method: "POST", body: JSON.stringify({ thresholdSeconds: 60 }) })
    if (!res.ok) return void message.error("Reconciler failed")
    const d = await res.json()
    message.success(`Reconciler: ${d.expired} expired, ${d.recovered} recovered`)
    await reload()
  }

  const createVoucher = async () => {
    const v = await vForm.validateFields()
    const res = await fetch("/api/vouchers", {
      method: "POST",
      body: JSON.stringify({ code: v.code, name: v.name, scopeItemKeys: v.scope, feeDiscountPct: v.pct, maxRedemptions: v.max }),
    })
    if (!res.ok) return void message.error((await res.json()).error ?? "Failed")
    message.success(`Voucher ${v.code.toUpperCase()} created`)
    vForm.resetFields()
    await reload()
  }

  const exportCsv = () => {
    const head = "date,buyer,source,item,company,state,total_rm,credit"
    const rows = txs.map((t) => [t.created_at, t.buyer, t.source, t.item, t.company ?? "", t.state, (t.total_cents / 100).toFixed(2), t.credit_used].join(","))
    const blob = new Blob([[head, ...rows].join("\n")], { type: "text/csv" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "aiexe-transactions.csv"
    a.click()
  }

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Row gutter={[16, 16]}>
        {totals.map((t) => (
          <Col xs={12} md={8} key={t.source}>
            <Card size="small">
              <Statistic title={`${t.source} revenue (${t.n} orders)`} value={rm(Number(t.cents))} valueStyle={{ color: brand.navy.to, fontSize: 20 }} />
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        title="Transactions"
        extra={
          <Space>
            {canReconcile && <Button icon={<SyncOutlined />} onClick={runReconciler}>Run reconciler</Button>}
            <Button icon={<DownloadOutlined />} onClick={exportCsv}>CSV</Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          size="small"
          dataSource={txs}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 720 }}
          columns={[
            { title: "Date", dataIndex: "created_at", render: (d: string) => new Date(d).toLocaleString() },
            { title: "Buyer", dataIndex: "buyer" },
            { title: "Channel", dataIndex: "source", render: (s: string) => <Tag color={s === "direct" ? "default" : "processing"}>{s}</Tag> },
            { title: "Item", dataIndex: "item" },
            { title: "Company", dataIndex: "company" },
            { title: "State", dataIndex: "state", render: (s: string) => <Tag color={s === "fulfilled" ? "success" : s === "expired" ? "error" : "warning"}>{s}</Tag> },
            { title: "Total", render: (_: unknown, t: Tx) => t.credit_used ? <Tag color="processing">credit</Tag> : rm(Number(t.total_cents)) },
          ]}
        />
      </Card>

      <Card title="Vouchers (scope-enforced, fee component only)">
        {canManagePkg && (
          <Form form={vForm} layout="inline" style={{ marginBottom: 16, rowGap: 8 }} initialValues={{ pct: 50, max: 10 }}>
            <Form.Item name="code" rules={[{ required: true }]}><Input placeholder="CODE" style={{ width: 110 }} /></Form.Item>
            <Form.Item name="name" rules={[{ required: true }]}><Input placeholder="Name" style={{ width: 160 }} /></Form.Item>
            <Form.Item name="scope" rules={[{ required: true }]}>
              <Select mode="multiple" placeholder="Scoped products" style={{ minWidth: 220 }} options={catalog.map((c) => ({ label: c.name, value: c.key }))} />
            </Form.Item>
            <Form.Item name="pct" rules={[{ required: true }]}><InputNumber min={1} max={100} addonAfter="% off fee" /></Form.Item>
            <Form.Item name="max" rules={[{ required: true }]}><InputNumber min={1} addonAfter="uses" /></Form.Item>
            <Button type="primary" onClick={createVoucher}>Create</Button>
          </Form>
        )}
        <Table
          rowKey="id"
          size="small"
          dataSource={vouchers}
          pagination={false}
          columns={[
            { title: "Code", dataIndex: "code", render: (c: string) => <Text code>{c}</Text> },
            { title: "Name", dataIndex: "name" },
            { title: "Scope", dataIndex: "scopeItemKeys", render: (k: string[]) => k.map((x) => <Tag key={x}>{x}</Tag>) },
            { title: "Value", dataIndex: "feeDiscountPct", render: (p: number) => `${p}% off fee` },
            { title: "Used", render: (_: unknown, v: Voucher) => `${v.redeemed}/${v.maxRedemptions}` },
          ]}
        />
        <Text type="secondary" style={{ fontSize: 12 }}>
          A voucher can never apply outside its scoped products (the AE-261 bug class, fixed structurally). Use the code at purchase on Search & Reports.
        </Text>
      </Card>
    </Space>
  )
}
