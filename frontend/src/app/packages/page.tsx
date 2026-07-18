"use client"

import { CrownOutlined, EditOutlined } from "@ant-design/icons"
import {
  App as AntApp,
  Button,
  Card,
  Col,
  Drawer,
  Form,
  InputNumber,
  List,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd"
import React, { useCallback, useEffect, useMemo, useState } from "react"

import { TOPUP_BUNDLE } from "@/types/pricing"
import { brand, neutral } from "@/theme/tokens"
import type { CatalogItem, Package, PriceBreakdown } from "@/types/pricing"

const { Text, Title } = Typography

const rm = (cents: number) => `RM ${(cents / 100).toFixed(2)}`

const api = {
  packages: () => fetch("/api/packages").then((r) => r.json()) as Promise<Package[]>,
  catalog: () => fetch("/api/catalog").then((r) => r.json()) as Promise<CatalogItem[]>,
  audit: () => fetch("/api/audit").then((r) => r.json()),
  quote: (packageId: string, itemKey: string) =>
    fetch(`/api/quote?packageId=${packageId}&itemKey=${itemKey}`).then((r) => r.json()) as Promise<PriceBreakdown>,
  publishVersion: (id: string, body: unknown) =>
    fetch(`/api/packages/${id}/versions`, { method: "POST", body: JSON.stringify(body) }),
  setDefault: (id: string) => fetch(`/api/packages/${id}/default`, { method: "POST" }),
  setItemPrice: (key: string, body: unknown) =>
    fetch(`/api/catalog/${key}/price`, { method: "POST", body: JSON.stringify(body) }),
}

export default function PackagesPage() {
  const { message } = AntApp.useApp()
  const [packages, setPackages] = useState<Package[]>([])
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [editPkg, setEditPkg] = useState<Package | null>(null)
  const [quote, setQuote] = useState<PriceBreakdown | null>(null)
  const [quotePkg, setQuotePkg] = useState<string>()
  const [quoteItem, setQuoteItem] = useState<string>()
  const [form] = Form.useForm()

  const reload = useCallback(async () => {
    const [p, c] = await Promise.all([api.packages(), api.catalog()])
    setPackages(p)
    setCatalog(c)
  }, [])
  useEffect(() => { void reload() }, [reload])

  useEffect(() => {
    if (quotePkg && quoteItem) {
      void api.quote(quotePkg, quoteItem).then(setQuote)
    }
  }, [quotePkg, quoteItem])

  const openEdit = (pkg: Package) => {
    setEditPkg(pkg)
    form.setFieldsValue({
      platformFee: pkg.currentVersion.platformFeeCents / 100,
      promoFee: pkg.currentVersion.promoFeeCents != null ? pkg.currentVersion.promoFeeCents / 100 : null,
      rocRobCredits: pkg.currentVersion.creditAllowances["ssm_roc_rob"] ?? 0,
      bundleIncluded: TOPUP_BUNDLE.every((k) => pkg.currentVersion.entitlementMap[k]),
    })
  }

  const publish = async () => {
    if (!editPkg) return
    const v = await form.validateFields()
    const res = await api.publishVersion(editPkg.id, {
      platformFeeCents: Math.round(v.platformFee * 100),
      promoFeeCents: v.promoFee != null ? Math.round(v.promoFee * 100) : null,
      entitlementMap: Object.fromEntries(TOPUP_BUNDLE.map((k) => [k, Boolean(v.bundleIncluded)])),
      creditAllowances: v.rocRobCredits ? { ssm_roc_rob: v.rocRobCredits } : {},
    })
    if (!res.ok) return void message.error((await res.json()).error ?? "Failed")
    message.success(`Published ${editPkg.name} v${editPkg.currentVersion.version + 1} — existing subscribers keep v${editPkg.currentVersion.version}`)
    setEditPkg(null)
    await reload()
  }

  const priceColumns = useMemo(() => {
    const pkgName = (id: string | null) =>
      id === null ? "Default" : packages.find((p) => p.id === id)?.name ?? "?"
    return [
      { title: "Item", dataIndex: "name", fixed: "left" as const },
      { title: "Category", dataIndex: "category", render: (c: string) => <Tag>{c}</Tag>, responsive: ["md" as const] },
      {
        title: "Current prices (cost + fee + SST)",
        render: (_: unknown, item: CatalogItem) => {
          const seen = new Set<string>()
          const current = item.prices.filter((p) => {
            const k = String(p.packageId)
            if (seen.has(k)) return false
            seen.add(k)
            return true
          })
          return (
            <Space direction="vertical" size={2}>
              {current.map((p) => (
                <Text key={p.id} style={{ fontSize: 13 }}>
                  <Tag color={p.packageId ? "processing" : "default"}>{pkgName(p.packageId)}</Tag>
                  {rm(p.dataCostCents + p.serviceFeeCents + p.sstCents)}
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {" "}= {rm(p.dataCostCents)} data + {rm(p.serviceFeeCents)} fee + {rm(p.sstCents)} SST
                  </Text>
                </Text>
              ))}
            </Space>
          )
        },
      },
    ]
  }, [packages])

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Row gutter={[16, 16]}>
        {packages.map((pkg) => (
          <Col xs={24} md={8} key={pkg.id}>
            <Card
              title={
                <Space>
                  {pkg.name}
                  {pkg.isDefault && <Tag icon={<CrownOutlined />} color="processing">Global Default</Tag>}
                </Space>
              }
              extra={<Button size="small" icon={<EditOutlined />} onClick={() => openEdit(pkg)}>Edit</Button>}
            >
              <Title level={3} style={{ marginTop: 0, color: brand.navy.to }}>
                {pkg.currentVersion.platformFeeCents === 0 ? "FOC" : `${rm(pkg.currentVersion.platformFeeCents)}/mo`}
              </Title>
              {pkg.currentVersion.promoFeeCents != null && (
                <Text type="secondary">Promo: {rm(pkg.currentVersion.promoFeeCents)}/mo</Text>
              )}
              <List
                size="small"
                dataSource={[
                  `Version ${pkg.currentVersion.version} (${pkg.versions.length} total)`,
                  `ROC/ROB credits: ${pkg.currentVersion.creditAllowances["ssm_roc_rob"] ?? 0}/yr`,
                  TOPUP_BUNDLE.every((k) => pkg.currentVersion.entitlementMap[k])
                    ? "Premium bundle included"
                    : "Premium bundle via RM10 top-up",
                ]}
                renderItem={(t) => <List.Item style={{ padding: "4px 0", border: "none" }}><Text style={{ fontSize: 13 }}>{t}</Text></List.Item>}
              />
              {!pkg.isDefault && (
                <Button
                  size="small"
                  type="text"
                  onClick={async () => {
                    await api.setDefault(pkg.id)
                    message.success(`"${pkg.name}" is now the Global Default`)
                    await reload()
                  }}
                >
                  Make default
                </Button>
              )}
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card title="Per-report price menu">
            <Table
              rowKey="id"
              size="small"
              columns={priceColumns}
              dataSource={catalog}
              pagination={false}
              scroll={{ x: 640 }}
            />
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card title="Price quote (pure pricing function)">
            <Space direction="vertical" style={{ width: "100%" }}>
              <Select
                placeholder="Package"
                style={{ width: "100%" }}
                options={packages.map((p) => ({ label: p.name, value: p.id }))}
                onChange={setQuotePkg}
              />
              <Select
                placeholder="Report / item"
                style={{ width: "100%" }}
                showSearch
                optionFilterProp="label"
                options={catalog.map((c) => ({ label: c.name, value: c.key }))}
                onChange={setQuoteItem}
              />
              {quote && !("error" in quote) && (
                <Card size="small" style={{ background: neutral.bgLayout }}>
                  <Space direction="vertical" size={2}>
                    <Title level={4} style={{ margin: 0 }}>{rm(quote.totalCents)}</Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {rm(quote.dataCostCents)} data cost (non-discountable) + {rm(quote.serviceFeeCents)} service fee + {rm(quote.sstCents)} SST
                    </Text>
                    <Tag color={quote.source === "member" ? "processing" : "default"}>
                      {quote.source === "member" ? `${quote.packageName} member price` : "default price"}
                    </Tag>
                  </Space>
                </Card>
              )}
            </Space>
          </Card>
        </Col>
      </Row>

      <Drawer
        title={editPkg ? `Edit ${editPkg.name} — publishes v${editPkg.currentVersion.version + 1}` : ""}
        open={editPkg !== null}
        onClose={() => setEditPkg(null)}
        width={420}
        extra={<Button type="primary" onClick={publish}>Publish new version</Button>}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="platformFee" label="Platform fee (RM/month)" rules={[{ required: true }]}>
            <InputNumber min={0} step={1} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="promoFee" label="Promo fee (RM/month, optional)">
            <InputNumber min={0} step={1} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="rocRobCredits" label="Free ROC/ROB reports per year">
            <InputNumber min={0} step={1} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="bundleIncluded" label="Premium bundle included (Mina, graph, chat, BizInfo…)" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Publishing creates an immutable new version. Existing subscribers stay on their current
            version until migrated (ADR-001 §2 / PA-4).
          </Text>
        </Form>
      </Drawer>
    </Space>
  )
}
