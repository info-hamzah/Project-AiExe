"use client"

import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons"
import {
  App as AntApp,
  Button,
  Card,
  Checkbox,
  Col,
  Drawer,
  Form,
  Input,
  List,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd"
import React, { useCallback, useEffect, useMemo, useState } from "react"

import { effectiveAccess } from "@/lib/access"
import { brand } from "@/theme/tokens"
import type { AuditEntry, Permission, RbacUser, Role, RoleInput } from "@/types/rbac"

const { Text } = Typography

const api = {
  roles: () => fetch("/api/roles").then((r) => r.json()) as Promise<Role[]>,
  permissions: () => fetch("/api/permissions").then((r) => r.json()) as Promise<Permission[]>,
  users: () => fetch("/api/users").then((r) => r.json()) as Promise<RbacUser[]>,
  audit: () => fetch("/api/audit").then((r) => r.json()) as Promise<AuditEntry[]>,
  createRole: (input: RoleInput) =>
    fetch("/api/roles", { method: "POST", body: JSON.stringify(input) }),
  updateRole: (id: string, input: RoleInput) =>
    fetch(`/api/roles/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteRole: (id: string) => fetch(`/api/roles/${id}`, { method: "DELETE" }),
  setUserRoles: (id: string, roleIds: string[]) =>
    fetch(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify({ roleIds }) }),
}

/** Group "module.action" keys by module for the permission matrix. */
const groupPermissions = (perms: Permission[]) => {
  const groups = new Map<string, Permission[]>()
  perms.forEach((p) => {
    const mod = p.key.split(".")[0]
    groups.set(mod, [...(groups.get(mod) ?? []), p])
  })
  return [...groups.entries()]
}

export default function RolesPage() {
  const { message } = AntApp.useApp()
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [users, setUsers] = useState<RbacUser[]>([])
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [drawerRole, setDrawerRole] = useState<Role | null | "new">(null)
  const [form] = Form.useForm<RoleInput>()

  const reload = useCallback(async () => {
    const [r, p, u, a] = await Promise.all([api.roles(), api.permissions(), api.users(), api.audit()])
    setRoles(r); setPermissions(p); setUsers(u); setAudit(a)
  }, [])
  useEffect(() => { void reload() }, [reload])

  const permissionGroups = useMemo(() => groupPermissions(permissions), [permissions])

  const openDrawer = (role: Role | "new") => {
    setDrawerRole(role)
    form.setFieldsValue(
      role === "new"
        ? { name: "", description: "", permissionKeys: [] }
        : { name: role.name, description: role.description, permissionKeys: role.permissionKeys },
    )
  }

  const submit = async () => {
    const values = await form.validateFields()
    const res =
      drawerRole === "new"
        ? await api.createRole(values)
        : await api.updateRole((drawerRole as Role).id, values)
    if (!res.ok) {
      message.error((await res.json()).error ?? "Request failed")
      return
    }
    message.success(drawerRole === "new" ? "Role created" : "Role updated")
    setDrawerRole(null)
    await reload()
  }

  const remove = async (role: Role) => {
    const res = await api.deleteRole(role.id)
    if (!res.ok) {
      message.error((await res.json()).error ?? "Delete failed")
      return
    }
    message.success(`Deleted "${role.name}"`)
    await reload()
  }

  const columns = [
    {
      title: "Role",
      dataIndex: "name",
      render: (name: string, role: Role) => (
        <Space>
          <Text strong>{name}</Text>
          {role.isSystem && <Tag color="default">system</Tag>}
        </Space>
      ),
    },
    { title: "Description", dataIndex: "description", responsive: ["md" as const] },
    {
      title: "Permissions",
      dataIndex: "permissionKeys",
      render: (keys: string[]) => <Tag color="processing">{keys.length}</Tag>,
    },
    {
      title: "Members",
      render: (_: unknown, role: Role) => users.filter((u) => u.roleIds.includes(role.id)).length,
    },
    {
      title: "",
      render: (_: unknown, role: Role) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openDrawer(role)} />
          <Popconfirm
            title={`Delete role "${role.name}"?`}
            description="Members lose this role immediately."
            onConfirm={() => remove(role)}
            disabled={role.isSystem}
          >
            <Button size="small" danger icon={<DeleteOutlined />} disabled={role.isSystem} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} xl={15}>
        <Card
          title="Roles"
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer("new")}>
              New role
            </Button>
          }
        >
          <Table
            rowKey="id"
            columns={columns}
            dataSource={roles}
            pagination={false}
            size="middle"
            scroll={{ x: 640 }}
          />
        </Card>
      </Col>

      <Col xs={24} xl={9}>
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Card title="Users & role assignment">
            <List
              dataSource={users}
              renderItem={(user) => {
                const access = effectiveAccess(user, roles)
                return (
                  <List.Item style={{ display: "block" }}>
                    <Space direction="vertical" style={{ width: "100%" }} size={4}>
                      <Space wrap>
                        <Text strong>{user.name}</Text>
                        <Text type="secondary">{user.email}</Text>
                      </Space>
                      <Select
                        mode="multiple"
                        style={{ width: "100%" }}
                        placeholder="No roles"
                        value={user.roleIds}
                        options={roles.map((r) => ({ label: r.name, value: r.id }))}
                        onChange={async (roleIds) => {
                          await api.setUserRoles(user.id, roleIds)
                          await reload()
                          message.success(`Updated ${user.name}'s roles`)
                        }}
                      />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Effective permissions: {access.size} of {permissions.length}
                      </Text>
                    </Space>
                  </List.Item>
                )
              }}
            />
          </Card>

          <Card title="Recent changes" styles={{ body: { maxHeight: 260, overflowY: "auto" } }}>
            <List
              size="small"
              dataSource={audit}
              locale={{ emptyText: "No changes yet" }}
              renderItem={(entry) => (
                <List.Item>
                  <Space direction="vertical" size={0}>
                    <Text style={{ fontSize: 13 }}>{entry.summary}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {entry.actor} · {new Date(entry.createdAt).toLocaleTimeString()}
                    </Text>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Space>
      </Col>

      <Drawer
        title={drawerRole === "new" ? "New role" : `Edit role`}
        open={drawerRole !== null}
        onClose={() => setDrawerRole(null)}
        width={480}
        extra={
          <Button type="primary" onClick={submit}>
            Save
          </Button>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Partner Manager" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="permissionKeys" label="Permissions">
            <Checkbox.Group style={{ width: "100%" }}>
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                {permissionGroups.map(([module, perms]) => (
                  <div key={module}>
                    <Text strong style={{ color: brand.navy.to, textTransform: "capitalize" }}>
                      {module}
                    </Text>
                    <Space direction="vertical" size={4} style={{ width: "100%", marginTop: 4 }}>
                      {perms.map((p) => (
                        <Checkbox key={p.key} value={p.key}>
                          <Text code style={{ fontSize: 12 }}>{p.key}</Text>{" "}
                          <Text type="secondary" style={{ fontSize: 12 }}>{p.description}</Text>
                        </Checkbox>
                      ))}
                    </Space>
                  </div>
                ))}
              </Space>
            </Checkbox.Group>
          </Form.Item>
        </Form>
      </Drawer>
    </Row>
  )
}
