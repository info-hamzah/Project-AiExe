"use client"

import { AimOutlined, MinusOutlined, PlusOutlined } from "@ant-design/icons"
import { Button, Space, Spin, Typography } from "antd"
import React, { useEffect, useRef, useState } from "react"

import { graphDefaults, graphEdgeColors, graphNodeColors } from "@/theme/sigma"
import type { DemoEdge, DemoEntity } from "@/lib/demoData"

const { Text } = Typography

interface SigmaGraphProps {
  rootKey: string
  height?: number
  onNodeClick?: (key: string) => void
}

interface SigmaLike {
  kill: () => void
  getCamera: () => { animatedZoom: (o?: object) => void; animatedUnzoom: (o?: object) => void; animatedReset: (o?: object) => void }
  on: (ev: string, cb: (e: { node?: string; edge?: string }) => void) => void
  refresh: () => void
}

const LEGEND: { label: string; color: string; shape?: "line" }[] = [
  { label: "Company", color: graphNodeColors.company },
  { label: "Person", color: graphNodeColors.person },
  { label: "LLP", color: graphNodeColors.llp },
  { label: "Foreign", color: graphNodeColors.foreign_entity },
  { label: "Flagged", color: graphNodeColors.flagged },
  { label: "Beneficial ownership", color: graphEdgeColors.beneficial_ownership, shape: "line" },
  { label: "BO changed", color: graphEdgeColors.bo_changed, shape: "line" },
]

/**
 * Sigma relationship graph (PA-23/PA-11): force-directed layout, hover-detail
 * edges (labels only on hover — no spider-web of text), white node rings,
 * zoom toolbar. Server caps the neighborhood; the client never lays out
 * the full graph.
 */
const SigmaGraph: React.FC<SigmaGraphProps> = ({ rootKey, height = 460, onNodeClick }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<SigmaLike | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [counts, setCounts] = useState<{ nodes: number; edges: number }>()

  useEffect(() => {
    let disposed = false

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

      const [{ default: Graph }, { default: Sigma }, { default: fa2 }] = await Promise.all([
        import("graphology"),
        import("sigma"),
        import("graphology-layout-forceatlas2"),
      ])
      if (disposed || !containerRef.current) return

      const graph = new Graph()
      data.nodes.forEach((n, i) => {
        const isRoot = n.key === rootKey
        // seeded ring start positions; ForceAtlas2 relaxes them into an organic layout
        const angle = (2 * Math.PI * i) / Math.max(data.nodes.length, 1)
        graph.addNode(n.key, {
          label: n.name,
          x: isRoot ? 0 : Math.cos(angle) * (1 + (i % 3) * 0.3),
          y: isRoot ? 0 : Math.sin(angle) * (1 + (i % 2) * 0.4),
          size: isRoot ? 15 : n.type === "person" ? 7 : 10,
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
      fa2.assign(graph, {
        iterations: 200,
        settings: { gravity: 1, scalingRatio: 4, slowDown: 5, adjustSizes: true },
      })

      rendererRef.current?.kill()
      const renderer = new Sigma(graph, containerRef.current, {
        renderEdgeLabels: false, // labels appear on hover only
        labelSize: graphDefaults.labelSize,
        labelColor: { color: graphDefaults.labelColor },
        labelDensity: 1,
        labelRenderedSizeThreshold: 5,
        edgeLabelSize: 11,
        allowInvalidContainer: true,
      }) as unknown as SigmaLike

      // hover: reveal the hovered edge's label
      renderer.on("enterEdge", ({ edge }) => {
        if (!edge) return
        graph.setEdgeAttribute(edge, "forceLabel", true)
        renderer.refresh()
      })
      renderer.on("leaveEdge", ({ edge }) => {
        if (!edge) return
        graph.setEdgeAttribute(edge, "forceLabel", false)
        renderer.refresh()
      })
      renderer.on("clickNode", ({ node }) => node && onNodeClick?.(node))

      rendererRef.current = renderer
      setCounts({ nodes: data.nodes.length, edges: data.edges.length })
      setLoading(false)
    }

    void load().catch((e) => { setError(String(e)); setLoading(false) })
    return () => {
      disposed = true
      rendererRef.current?.kill()
      rendererRef.current = null
    }
  }, [rootKey, onNodeClick])

  const cam = () => rendererRef.current?.getCamera()

  return (
    <div>
      <div style={{ position: "relative" }}>
        <div
          ref={containerRef}
          style={{
            height,
            width: "100%",
            borderRadius: 12,
            background:
              "radial-gradient(circle at 1px 1px, #E8ECF1 1px, transparent 0) 0 0 / 22px 22px, #FBFCFE",
            border: "1px solid #E5E7EB",
          }}
        />
        {loading && (
          <Spin style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />
        )}
        <Space
          direction="vertical"
          size={4}
          style={{ position: "absolute", right: 12, top: 12 }}
        >
          <Button size="small" icon={<PlusOutlined />} aria-label="Zoom in" onClick={() => cam()?.animatedZoom({ duration: 250 })} />
          <Button size="small" icon={<MinusOutlined />} aria-label="Zoom out" onClick={() => cam()?.animatedUnzoom({ duration: 250 })} />
          <Button size="small" icon={<AimOutlined />} aria-label="Reset view" onClick={() => cam()?.animatedReset({ duration: 300 })} />
        </Space>
        {counts && (
          <Text
            type="secondary"
            style={{
              position: "absolute", left: 12, bottom: 10, fontSize: 12,
              background: "rgba(255,255,255,0.85)", padding: "2px 8px", borderRadius: 6,
            }}
          >
            {counts.nodes} entities · {counts.edges} relationships · hover an edge for detail
          </Text>
        )}
      </div>
      {error && <Text type="danger">{error}</Text>}
      <Space wrap size={[16, 4]} style={{ marginTop: 10 }}>
        {LEGEND.map((l) => (
          <Space key={l.label} size={6}>
            <span
              aria-hidden
              style={
                l.shape === "line"
                  ? { width: 14, height: 3, borderRadius: 2, background: l.color, display: "inline-block" }
                  : { width: 9, height: 9, borderRadius: "50%", background: l.color, display: "inline-block" }
              }
            />
            <Text type="secondary" style={{ fontSize: 12 }}>{l.label}</Text>
          </Space>
        ))}
      </Space>
    </div>
  )
}

export default SigmaGraph
