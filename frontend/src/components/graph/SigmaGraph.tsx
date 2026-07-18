"use client"

import { Space, Spin, Tag, Typography } from "antd"
import React, { useEffect, useRef, useState } from "react"

import { graphDefaults, graphEdgeColors, graphNodeColors } from "@/theme/sigma"
import type { DemoEdge, DemoEntity } from "@/lib/demoData"

const { Text } = Typography

interface SigmaGraphProps {
  rootKey: string
  height?: number
  onNodeClick?: (key: string) => void
}

/**
 * Sigma relationship graph (PA-23 base). Touch pan/zoom come free with Sigma;
 * data loads via server-side neighborhood queries (never the full graph — scaling rule).
 * BO edges purple; recent BO changes amber (the PA-12 compliance hook).
 */
const SigmaGraph: React.FC<SigmaGraphProps> = ({ rootKey, height = 420, onNodeClick }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()

  useEffect(() => {
    let disposed = false
    let renderer: { kill: () => void } | undefined

    async function load() {
      setLoading(true)
      setError(undefined)
      const res = await fetch(`/api/graph?root=${encodeURIComponent(rootKey)}`)
      if (!res.ok) {
        setError((await res.json()).error ?? "failed to load graph")
        setLoading(false)
        return
      }
      const data: { nodes: DemoEntity[]; edges: DemoEdge[] } = await res.json()
      if (disposed || !containerRef.current) return

      const [{ default: Graph }, { default: Sigma }] = await Promise.all([
        import("graphology"),
        import("sigma"),
      ])
      if (disposed || !containerRef.current) return

      const graph = new Graph()
      const others = data.nodes.filter((n) => n.key !== rootKey)
      data.nodes.forEach((n) => {
        const idx = others.indexOf(n)
        const isRoot = n.key === rootKey
        const angle = (2 * Math.PI * idx) / Math.max(others.length, 1)
        graph.addNode(n.key, {
          label: n.name,
          x: isRoot ? 0 : Math.cos(angle),
          y: isRoot ? 0 : Math.sin(angle),
          size: isRoot ? 16 : n.type === "person" ? 8 : 11,
          color: n.flagged ? graphNodeColors.flagged : graphNodeColors[n.type] ?? graphNodeColors.company,
        })
      })
      data.edges.forEach((e, i) => {
        graph.addEdgeWithKey(`e${i}`, e.source, e.target, {
          label: e.label,
          size: e.type === "bo_changed" ? 3 : 1.5,
          color: graphEdgeColors[e.type] ?? graphEdgeColors.shareholding,
        })
      })

      renderer = new Sigma(graph, containerRef.current, {
        renderEdgeLabels: true,
        labelSize: graphDefaults.labelSize,
        labelColor: { color: graphDefaults.labelColor },
        edgeLabelSize: 10,
      })
      ;(renderer as unknown as { on: (ev: string, cb: (e: { node: string }) => void) => void }).on(
        "clickNode",
        (e) => onNodeClick?.(e.node),
      )
      setLoading(false)
    }

    void load()
    return () => {
      disposed = true
      renderer?.kill()
    }
  }, [rootKey, onNodeClick])

  return (
    <div>
      <div
        ref={containerRef}
        style={{ height, width: "100%", borderRadius: 12, background: "#FFFFFF", border: "1px solid #E5E7EB" }}
      />
      {loading && <Spin style={{ position: "relative", top: -height / 2, left: "50%" }} />}
      {error && <Text type="danger">{error}</Text>}
      <Space wrap style={{ marginTop: 8 }}>
        <Tag color={graphNodeColors.company}>Company</Tag>
        <Tag color={graphNodeColors.person}>Person</Tag>
        <Tag color={graphNodeColors.llp}>LLP</Tag>
        <Tag color={graphNodeColors.foreign_entity}>Foreign</Tag>
        <Tag color={graphNodeColors.flagged}>Flagged</Tag>
        <Tag color={graphEdgeColors.beneficial_ownership}>BO edge</Tag>
        <Tag color={graphEdgeColors.bo_changed}>BO changed</Tag>
      </Space>
    </div>
  )
}

export default SigmaGraph
