"use client"

import { Alert, Card, Col, Row, Select, Space, Typography } from "antd"
import { useRouter } from "next/navigation"
import React, { useEffect, useState } from "react"

import SigmaGraph from "@/components/graph/SigmaGraph"
import type { DemoEntity } from "@/lib/demoData"

const { Text, Title } = Typography

/**
 * Relationship graph explorer (PA-23 base / PA-11 target) — the headline
 * competitive surface: Handshakes has no mobile story; this view must stay
 * usable on a phone. BO-change alerts deep-link here (PA-12).
 */
export default function GraphPage() {
  const router = useRouter()
  const [entities, setEntities] = useState<DemoEntity[]>([])
  const [root, setRoot] = useState("whb")

  useEffect(() => {
    void fetch("/api/companies?q=").then(async (r) => {
      if (r.ok) setEntities(await r.json())
    })
  }, [])

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Row gutter={[16, 16]} align="middle">
        <Col xs={24} md={12}>
          <Title level={3} style={{ margin: 0 }}>Relationship graph</Title>
          <Text type="secondary">Tap a node to recenter · double-click on a company opens its profile</Text>
        </Col>
        <Col xs={24} md={12}>
          <Select
            style={{ width: "100%" }}
            showSearch
            optionFilterProp="label"
            value={root}
            options={entities.filter((e) => e.type !== "person").map((e) => ({ label: e.name, value: e.key }))}
            onChange={setRoot}
          />
        </Col>
      </Row>

      <Alert
        type="warning"
        showIcon
        message="Beneficial-ownership change detected"
        description="Nusantara Agri Ventures Sdn Bhd — new UBO (Ahmad Faizal bin Omar, 20%) filed 3 days ago. Companies Act 2024 requires BO updates within 14 days."
        action={<a onClick={() => setRoot("nusantara")}>View in graph</a>}
      />

      <Card>
        <SigmaGraph rootKey={root} height={520} onNodeClick={setRoot} />
      </Card>
    </Space>
  )
}
