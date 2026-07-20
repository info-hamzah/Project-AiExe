"use client"

import { Space, Typography } from "antd"
import React from "react"

const { Text, Title } = Typography

/** Uniform page header: title states the noun, description states the job. */
const PageHeader: React.FC<{
  title: string
  description?: string
  extra?: React.ReactNode
}> = ({ title, description, extra }) => (
  <Space
    align="start"
    wrap
    style={{ justifyContent: "space-between", width: "100%", marginBottom: 4 }}
  >
    <div>
      <Title level={3} style={{ margin: 0 }}>{title}</Title>
      {description && <Text type="secondary">{description}</Text>}
    </div>
    {extra}
  </Space>
)

export default PageHeader
