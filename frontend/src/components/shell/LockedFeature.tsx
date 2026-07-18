"use client"

import { Button, Card, Typography } from "antd"
import React, { useEffect } from "react"

import { brand } from "@/theme/tokens"

export interface LockedFeatureProps {
  /** Entitlement key that gates this feature — also the analytics dimension. */
  entitlementKey: string
  /** Feature name shown in the CTA copy. */
  featureName: string
  /** Benefit copy — why upgrading is worth it. */
  benefit: string
  /** Blurred/sample preview of the real feature. */
  preview: React.ReactNode
  onUpgradeClick: (entitlementKey: string) => void
  /** Fired once per mount — sneak-peek impression event (PA-1 funnel). */
  onImpression?: (entitlementKey: string) => void
}

/**
 * Sneak-peek wrapper (PA-1): locked features render a preview + upgrade CTA,
 * never a dead-end 403. Visual skin for the entitlement engine.
 */
const LockedFeature: React.FC<LockedFeatureProps> = ({
  entitlementKey,
  featureName,
  benefit,
  preview,
  onUpgradeClick,
  onImpression,
}) => {
  useEffect(() => {
    onImpression?.(entitlementKey)
  }, [entitlementKey, onImpression])

  return (
    <Card styles={{ body: { position: "relative", padding: 0, overflow: "hidden" } }}>
      <div
        aria-hidden
        style={{ filter: "blur(6px)", pointerEvents: "none", userSelect: "none", minHeight: 220 }}
      >
        {preview}
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          background: "rgba(255, 255, 255, 0.72)",
          padding: 24,
          textAlign: "center",
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          {featureName}
        </Typography.Title>
        <Typography.Text type="secondary">{benefit}</Typography.Text>
        <Button
          type="primary"
          size="large"
          shape="round"
          style={{ background: brand.cyan, marginTop: 8 }}
          onClick={() => onUpgradeClick(entitlementKey)}
        >
          Upgrade to unlock
        </Button>
      </div>
    </Card>
  )
}

export default LockedFeature
