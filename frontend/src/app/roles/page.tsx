"use client"

import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons"
import {
  App as AntApp,
  Avatar,
  Button,
  Card,
  Checkbox,
  Drawer,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Timeline,
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
  createRole: (input: RoleInput) => fetch("/api/roles", { method: "POST", body: JSON.stringify(input) }),
  updateRole: (id: string, input: RoleInput) => fetch(`/api/roles/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteRole: (id: string) => fetch(`/api/roles/${id}`, { method: "DELETE" }),
  setUserRoles: (id: string, roleIds: string[]) => fetch(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify({ roleIds }) }),
}

const AVATAR_COLORS = ["#00A1E4", "#0F3460", "#7E499D", "#2F9E62", "#C9720A"]
const avatarColor = (name: string) => AVATAR_COLORS[name.length % AVATAR_COLORS.length]

const groupPermissions = (perms: Permission[]) => {
  const groups = new Map<string, Permission[]>()
  perms.forEach((p) => {
    const mod = p.key.split(".")[0]
    groups.set(mod, [...(groups.get(mod) ?? []), p])
  })
  return [...groups.entries()]
}

/** Roles & Access — tabbed admin console: Users, Roles, Activity. */
export default function RolesPage() {
  const { message } = AntApp.useApp()
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [users, setUsers] = useState<RbacUser[]>([])
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [userFilter, setUserFilter] = useState("")
  const [drawerRole, setDrawerRole] = useState<Role | null | "new">(null)
  const [form] = Form.useForm<RoleInput>()

  const reload = useCallback(async () => {
    const [r, p, u, a] = await Promise.all([api.roles(), api.permissions(), api.users(), api.audit()])
    setRoles(r); setPermissions(p); setUsers(u); setAudit(a)
  }, [])
  useEffect(() => { void reload() }, [reload])

  const permissionGroups = useMemo(() => groupPermissions(permissions), [permissions])
  const roleById = useMemo(() => new Map(roles.map((r) => [r.id, r])), [roles])
  const accessAudit = useMemo(
    () => audit.filter((a) => a.entityType === "role" || a.entityType === "user_roles"),
    [audit],
  )

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
    const res = drawerRole === "new" ? await api.createRole(values) : await api.updateRole((drawerRole as Role).id, values)
    if (!res.ok) return void message.error((await res.json()).error ?? "Request failed")
    message.success(drawerRole === "new" ? "Role created" : "Role updated")
    setDrawerRole(null)
    await reload()
  }

  const filteredUsers = users.filter(
    (u) =>
      !userFilter ||
      u.name.toLowerCase().includes(userFilter.toLowerCase()) ||
      u.email.toLowerCase().includes(userFilter.toLowerCase()),
  )

  const usersTab = (
    <Card>
      <Space style={{ marginBottom: 16, width: "100%", justifyContent: "space-between" }} wrap>
        <Input.Search
          placeholder="Filter by name or email"
          allowClear
          style={{ width: 280 }}
          onChange={(e) => setUserFilter(e.target.value)}
        />
        <Text type="secondary">{filteredUsers.length} of {users.length} users</Text>
      </Space>
      <Table
        rowKey="id"
        dataSource={filteredUsers}
        pagination={{ pageSize: 8, hideOnSinglePage: true }}
        scroll={{ x: 720 }}
        columns={[
          {
            title: "User",
            fixed: "left",
            render: (_: unknown, u: RbacUser) => (
              <Space>
                <Avatar size={34} style={{ backgroundColor: avatarColor(u.name) }}>{u.name[0]}</Avatar>
                <span>
                  <Text strong style={{ display: "block", fontSize: 13 }}>{u.name}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>{u.email}</Text>
                </span>
              </Space>
            ),
          },
          {
            title: "Roles",
            width: 320,
            render: (_: unknown, u: RbacUser) => (
              <Select
                mode="multiple"
                variant="borderless"
                style={{ width: "100%" }}
                placeholder="No roles"
                value={u.roleIds}
                options={roles.map((r) => ({ label: r.name, value: r.id }))}
                tagRender={({ label, closable, onClose }) => (
                  <Tag closable={closable} onClose={onClose} color="processing" style={{ marginInlineEnd: 4 }}>
                    {label}
                  </Tag>
                )}
                onChange={async (roleIds) => {
                  await api.setUserRoles(u.id, roleIds)
                  await reload()
                  message.success(`Updated ${u.name}'s roles`)
                }}
              />
            ),
          },
          {
            title: "Access",
            width: 140,
            render: (_: unknown, u: RbacUser) => {
              const n = effectiveAccess(u, roles).size
              return (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {n} / {permissions.length} permissions
                </Text>
              )
            },
          },
        ]}
      />
    </Card>
  )

  const rolesTab = (
    <Card
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer("new")}>New role</Button>}
      title={`${roles.length} roles`}
    >
      <Table
        rowKey="id"
        dataSource={roles}
        pagination={false}
        scroll={{ x: 640 }}
        columns={[
          {
            title: "Role",
            render: (_: unknown, role: Role) => (
              <Space>
                <Text strong>{role.name}</Text>
                {role.isSystem && <Tag>system</Tag>}
              </Space>
            ),
          },
          { title: "Description", dataIndex: "description", responsive: ["md"] },
          {
            title: "Permissions",
            width: 120,
            render: (_: unknown, role: Role) => <Tag color="processing">{role.permissionKeys.length}</Tag>,
          },
          {
            title: "Members",
            width: 100,
            render: (_: unknown, role: Role) => users.filter((u) => u.roleIds.includes(role.id)).length,
          },
          {
            title: "",
            width: 110,
            render: (_: unknown, role: Role) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => openDrawer(role)} />
                <Popconfirm
                  title={`Delete role "${role.name}"?`}
                  description="Members lose this role immediately."
                  onConfirm={async () => {
                    const res = await api.deleteRole(role.id)
                    if (!res.ok) return void message.error((await res.json()).error ?? "Delete failed")
                    message.success(`Deleted "${role.name}"`)
                    await reload()
                  }}
                  disabled={role.isSystem}
                >
                  <Button size="small" danger icon={<DeleteOutlined />} disabled={role.isSystem} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
    </Card>
  )

  const activityTab = (
    <Card>
      {accessAudit.length === 0 ? (
        <Text type="secondary">No access changes yet — create a role or reassign a user.</Text>
      ) : (
        <Timeline
          items={accessAudit.slice(0, 20).map((entry) => ({
            color: entry.action === "delete" ? "red" : entry.action === "create" ? "green" : "blue",
            children: (
              <span>
                <Text style={{ fontSize: 13 }}>{entry.summary}</Text>
                <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                  {new Date(entry.createdAt).toLocaleString()}
                </Text>
              </span>
            ),
          }))}
        />
      )}
    </Card>
  )

  return (
    <>
      <Tabs
        defaultActiveKey="users"
        items={[
          { key: "users", label: `Users (${users.length})`, children: usersTab },
          { key: "roles", label: `Roles (${roles.length})`, children: rolesTab },
          { key: "activity", label: "Activity", children: activityTab },
        ]}
      />

      <Drawer
        title={drawerRole === "new" ? "New role" : "Edit role"}
        open={drawerRole !== null}
        onClose={() => setDrawerRole(null)}
        width={480}
        extra={<Button type="primary" onClick={submit}>Save</Button>}
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
                    <Text strong style={{ color: brand.navy.to, textTransform: "capitalize" }}>{module}</Text>
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
    </>
  )
}
