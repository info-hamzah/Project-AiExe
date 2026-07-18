"use client"

import { Card, Col, Row, Statistic, Typography } from "antd"

import LockedFeature from "@/components/shell/LockedFeature"
import { brand, status } from "@/theme/tokens"

/**
 * Placeholder dashboard — demonstrates the shell + a live sneak-peek example.
 * Replaced by real widgets once the catalog (PA-9) lands; numbers are dummy data
 * per the PA-24 seeding plan.
 */
export default function Home() {
  return (
    <div>
      <Typography.Title level={3}>Overview</Typography.Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Monitored entities" value={128} valueStyle={{ color: brand.navy.to }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="BO changes (14d)" value={7} valueStyle={{ color: status.warning }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Reports this month" value={42} valueStyle={{ color: brand.cyan }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Report credits left" value={8} suffix="/ 10" />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <LockedFeature
            entitlementKey="dashboards.ai_generate"
            featureName="AI Dashboard Generation"
            benefit="Describe the view you need — Mina builds it from your monitored data. Included in Pro."
            preview={
              <div style={{ padding: 24 }}>
                <Typography.Paragraph>
                  “Show my monitored companies with recent BO changes” → chart + table + graph
                </Typography.Paragraph>
                <div style={{ height: 140, background: "#F3F4F6", borderRadius: 12 }} />
              </div>
            }
            onUpgradeClick={(key) => console.log("[sneakpeek] cta_click", key)}
            onImpression={(key) => console.log("[sneakpeek] impression", key)}
          />
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Recent activity" style={{ height: "100%" }}>
            <Typography.Text type="secondary">
              Dummy data lands here via the PA-24 seeding harness.
            </Typography.Text>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
