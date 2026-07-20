"use client"

import { Alert, Card, Select, Space } from "antd"
import { useSearchParams } from "next/navigation"
import React, { Suspense, useEffect, useState } from "react"

import SigmaGraph from "@/components/graph/SigmaGraph"
import type { DemoEntity } from "@/lib/demoData"

/**
 * Relationship graph explorer (PA-23/PA-11) — the headline competitive surface.
 * Page title lives in the shell header; this page is toolbar + canvas.
 */
function GraphPageInner() {
  const searchParams = useSearchParams()
  const [entities, setEntities] = useState<DemoEntity[]>([])
  const [root, setRoot] = useState(searchParams.get("root") ?? "whb")
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    void fetch("/api/companies?q=").then(async (r) => {
      if (r.ok) setEntities(await r.json())
    })
  }, [])

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      {!dismissed && (
        <Alert
          type="warning"
          showIcon
          closable
          onClose={() => setDismissed(true)}
          message="Beneficial-ownership change detected"
          description="Nusantara Agri Ventures Sdn Bhd — new UBO (Ahmad Faizal bin Omar, 20%) filed 3 days ago. Companies Act 2024 requires BO updates within 14 days."
          action={<a onClick={() => setRoot("nusantara")}>View in graph</a>}
        />
      )}
      <Card
        title="Explore connections"
        extra={
          <Select
            style={{ minWidth: 280 }}
            showSearch
            optionFilterProp="label"
            value={root}
            options={entities.filter((e) => e.type !== "person").map((e) => ({ label: e.name, value: e.key }))}
            onChange={setRoot}
          />
        }
      >
        <SigmaGraph rootKey={root} height={540} onNodeClick={setRoot} />
      </Card>
    </Space>
  )
}

export default function GraphPage() {
  return (
    <Suspense>
      <GraphPageInner />
    </Suspense>
  )
}
