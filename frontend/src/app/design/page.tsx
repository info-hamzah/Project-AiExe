"use client"

import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Row,
  Space,
  Table,
  Tag,
  Typography,
} from "antd"

import LockedFeature from "@/components/shell/LockedFeature"
import { brand, categorical, neutral, status } from "@/theme/tokens"

const { Title, Text, Paragraph } = Typography

/**
 * Internal design-system reference (PA-15): every themed component state on one page.
 * Doubles as the visual-regression target and the stakeholder before/after demo.
 * Review at 375 / 768 / 1280 px before merging component changes (NFR-1).
 */

const Swatch: React.FC<{ name: string; value: string; dark?: boolean }> = ({
  name,
  value,
  dark,
}) => (
  <div
    style={{
      background: value,
      borderRadius: 12,
      padding: "16px 12px",
      minWidth: 120,
      border: `1px solid ${neutral.border}`,
    }}
  >
    <Text strong style={{ color: dark ? "#FFF" : neutral.textPrimary, display: "block" }}>
      {name}
    </Text>
    <Text style={{ color: dark ? "rgba(255,255,255,0.75)" : neutral.textSecondary, fontSize: 12 }}>
      {value}
    </Text>
  </div>
)

const sampleColumns = [
  { title: "Company", dataIndex: "company" },
  { title: "Status", dataIndex: "status", render: (s: string) => <Tag color={s === "Active" ? "success" : "warning"}>{s}</Tag> },
  { title: "BO changes", dataIndex: "bo" },
]
const sampleData = [
  { key: 1, company: "Wai Hong Brothers Sdn Bhd", status: "Active", bo: 2 },
  { key: 2, company: "Turbo Jewellery Sdn Bhd", status: "Monitoring", bo: 0 },
  { key: 3, company: "KS Lim Holdings Bhd", status: "Active", bo: 1 },
]

export default function DesignPage() {
  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <div>
        <Title level={2}>AiExe Design System</Title>
        <Paragraph type="secondary">
          Infomina brand tokens (docs/ui-design-system.md, approved 2026-07-18). Semantic rule:
          cyan = action · navy = structure · purple = AI · red = danger.
        </Paragraph>
      </div>

      <Card title="Brand palette">
        <Space wrap>
          <Swatch name="Primary / cyan" value={brand.cyan} dark />
          <Swatch name="Secondary / blue" value={brand.blue} dark />
          <Swatch name="Navy from" value={brand.navy.from} dark />
          <Swatch name="Navy to" value={brand.navy.to} dark />
          <Swatch name="AI / purple" value={brand.purple} dark />
          <Swatch name="Danger / red" value={brand.red} dark />
          <Swatch name="Success" value={status.success} dark />
          <Swatch name="Warning" value={status.warning} dark />
        </Space>
        <Divider />
        <Text type="secondary">Categorical (charts/graph): </Text>
        <Space>
          {categorical.map((c) => (
            <span key={c} style={{ display: "inline-block", width: 24, height: 24, background: c, borderRadius: 6 }} />
          ))}
        </Space>
      </Card>

      <Card title="Typography">
        <Title level={1} style={{ marginTop: 0 }}>H1 — Corporate intelligence</Title>
        <Title level={3}>H3 — Relationship graph</Title>
        <Paragraph>Body — Inter, 14px base, 1.5 line height. Secondary text below.</Paragraph>
        <Text type="secondary">Secondary — supporting copy and table headers.</Text>
      </Card>

      <Card title="Buttons & feedback">
        <Space wrap>
          <Button type="primary" shape="round" size="large">Primary CTA (pill)</Button>
          <Button type="primary">Primary</Button>
          <Button>Default</Button>
          <Button type="text">Text</Button>
          <Button danger>Destructive</Button>
          <Button type="primary" style={{ background: brand.purple }}>AI action</Button>
        </Space>
        <Divider />
        <Space direction="vertical" style={{ width: "100%" }}>
          <Alert type="info" showIcon message="Info — SSM data refreshed 5 minutes ago." />
          <Alert type="warning" showIcon message="Warning — 7 monitored entities have BO changes." />
          <Alert type="error" showIcon message="Error — payment gateway unreachable, order queued for reconciliation." />
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title="Table">
            <Table columns={sampleColumns} dataSource={sampleData} pagination={false} size="middle" scroll={{ x: 480 }} />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <LockedFeature
            entitlementKey="design.demo"
            featureName="Sneak-peek pattern"
            benefit="Locked features preview + upsell instead of a dead-end 403."
            preview={<div style={{ height: 180, background: "#F3F4F6" }} />}
            onUpgradeClick={() => undefined}
          />
        </Col>
      </Row>
    </Space>
  )
}
