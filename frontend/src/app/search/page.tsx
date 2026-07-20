"use client"

import { FileDoneOutlined, SearchOutlined } from "@ant-design/icons"
import {
  App as AntApp,
  Button,
  Card,
  Col,
  Input,
  Modal,
  Row,
  Space,
  Steps,
  Table,
  Tag,
  Typography,
} from "antd"
import Link from "next/link"
import React, { useCallback, useEffect, useState } from "react"

import { useSession } from "@/components/session/SessionContext"
import type { DemoEntity } from "@/lib/demoData"
import { brand, status as statusColors } from "@/theme/tokens"

const { Text, Title } = Typography

const rm = (cents: number) => `RM ${(cents / 100).toFixed(2)}`

interface OrderView {
  id: string
  itemName: string
  companyKey: string
  companyName: string
  state: string
  priceBreakdown: { totalCents: number; dataCostCents: number; serviceFeeCents: number; sstCents: number; creditUsed?: boolean }
  events: { from: string | null; to: string; actor: string }[]
  createdAt: string
}

const STATE_ORDER = ["draft", "pending_payment", "paid", "fulfilling", "fulfilled"]

/** Search & report purchase — the core AiExe flow, simulated end-to-end (PA-24). */
export default function SearchPage() {
  const { message } = AntApp.useApp()
  const { session } = useSession()
  const [q, setQ] = useState("")
  const [results, setResults] = useState<DemoEntity[]>([])
  const [orders, setOrders] = useState<OrderView[]>([])
  const [buying, setBuying] = useState<string | null>(null)
  const [voucher, setVoucher] = useState("")
  const [lastOrder, setLastOrder] = useState<OrderView | null>(null)

  const search = useCallback(async (query: string) => {
    const res = await fetch(`/api/companies?q=${encodeURIComponent(query)}`)
    if (res.ok) setResults(await res.json())
  }, [])
  const loadOrders = useCallback(async () => {
    const res = await fetch("/api/orders")
    if (res.ok) setOrders(await res.json())
  }, [])

  useEffect(() => { void search(""); void loadOrders() }, [search, loadOrders])

  const purchase = async (companyKey: string) => {
    setBuying(companyKey)
    const res = await fetch("/api/orders", {
      method: "POST",
      body: JSON.stringify({ itemKey: "ssm_roc_rob", companyKey, voucherCode: voucher || undefined }),
    })
    setBuying(null)
    if (!res.ok) return void message.error((await res.json()).error ?? "Purchase failed")
    const order: OrderView = await res.json()
    setLastOrder(order)
    await loadOrders()
  }

  const owned = new Set(orders.filter((o) => o.state === "fulfilled").map((o) => o.companyKey))

  const columns = [
    {
      title: "Entity",
      render: (_: unknown, e: DemoEntity) => (
        <Space direction="vertical" size={0}>
          <Link href={`/company/${e.key}`}><Text strong style={{ color: brand.blue }}>{e.name}</Text></Link>
          <Text type="secondary" style={{ fontSize: 12 }}>{e.regNo ?? "—"}</Text>
        </Space>
      ),
    },
    {
      title: "Type",
      dataIndex: "type",
      responsive: ["md" as const],
      render: (t: string) => <Tag>{t.replace("_", " ")}</Tag>,
    },
    {
      title: "Status",
      responsive: ["md" as const],
      render: (_: unknown, e: DemoEntity) => (
        <Space>
          {e.status && <Tag color={e.status === "Active" ? "success" : "error"}>{e.status}</Tag>}
          {e.flagged && <Tag color="error">flagged</Tag>}
        </Space>
      ),
    },
    {
      title: "",
      render: (_: unknown, e: DemoEntity) =>
        e.type === "person" ? null : owned.has(e.key) ? (
          <Link href={`/company/${e.key}`}><Button size="small" icon={<FileDoneOutlined />}>View report</Button></Link>
        ) : (
          <Button
            size="small"
            type="primary"
            loading={buying === e.key}
            onClick={() => purchase(e.key)}
          >
            Buy ROC/ROB report
          </Button>
        ),
    },
  ]

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card>
        <Space direction="vertical" style={{ width: "100%" }}>
          <Title level={4} style={{ margin: 0 }}>Entity search</Title>
          <Input.Search
            size="large"
            placeholder="Company name or registration number…"
            prefix={<SearchOutlined />}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onSearch={(v) => void search(v)}
            allowClear
          />
          <Space wrap>
            <Input
              placeholder="Voucher code (optional)"
              style={{ width: 200 }}
              value={voucher}
              onChange={(e) => setVoucher(e.target.value)}
              allowClear
            />
          </Space>
          <Text type="secondary" style={{ fontSize: 12 }}>
            SSM ROC/ROB profile: RM 15.40 · {session?.packageName === "Explorer"
              ? "Explorer pays per report"
              : `${session?.packageName} includes free ROC/ROB credits per year — credits apply automatically`}
          </Text>
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card title="Results">
            <Table rowKey="key" columns={columns} dataSource={results} pagination={false} size="middle" scroll={{ x: 560 }} />
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card title="My reports">
            <Table
              rowKey="id"
              size="small"
              pagination={{ pageSize: 6 }}
              dataSource={orders}
              scroll={{ x: 420 }}
              columns={[
                {
                  title: "Report",
                  render: (_: unknown, o: OrderView) => (
                    <Space direction="vertical" size={0}>
                      <Link href={`/company/${o.companyKey}`}><Text strong style={{ fontSize: 13 }}>{o.companyName}</Text></Link>
                      <Text type="secondary" style={{ fontSize: 12 }}>{o.itemName}</Text>
                    </Space>
                  ),
                },
                {
                  title: "Paid",
                  render: (_: unknown, o: OrderView) =>
                    o.priceBreakdown.creditUsed ? <Tag color="processing">credit</Tag> : rm(o.priceBreakdown.totalCents),
                },
                {
                  title: "State",
                  dataIndex: "state",
                  render: (s: string) => <Tag color={s === "fulfilled" ? "success" : "warning"}>{s}</Tag>,
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        open={lastOrder !== null}
        onCancel={() => setLastOrder(null)}
        footer={
          <Space>
            <Button onClick={() => setLastOrder(null)}>Close</Button>
            <Link href={`/company/${lastOrder?.companyKey}`}>
              <Button type="primary">Open report</Button>
            </Link>
          </Space>
        }
        title="Order complete"
      >
        {lastOrder && (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <div>
              <Text strong>{lastOrder.itemName}</Text> — {lastOrder.companyName}
              <br />
              {lastOrder.priceBreakdown.creditUsed ? (
                <Tag color="processing" style={{ marginTop: 4 }}>Package credit used — RM 0.00</Tag>
              ) : (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {rm(lastOrder.priceBreakdown.totalCents)} = {rm(lastOrder.priceBreakdown.dataCostCents)} data
                  + {rm(lastOrder.priceBreakdown.serviceFeeCents)} fee + {rm(lastOrder.priceBreakdown.sstCents)} SST
                </Text>
              )}
            </div>
            <Steps
              size="small"
              direction="vertical"
              current={STATE_ORDER.indexOf(lastOrder.state)}
              items={lastOrder.events.map((e) => ({
                title: e.to.replace("_", " "),
                description: e.actor,
                status: "finish" as const,
              }))}
            />
            <Text type="secondary" style={{ fontSize: 12, color: statusColors.success }}>
              Every transition above is a row in order_events (ADR-002) — simulated gateway, real state machine.
            </Text>
          </Space>
        )}
      </Modal>
    </Space>
  )
}
