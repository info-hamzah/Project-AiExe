import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

import { requirePermission, toErrorResponse } from "@/lib/authz"
import { entityByKey } from "@/lib/demoData"
import { listOrders, purchase } from "@/lib/orderService"
import { pricingStore } from "@/lib/pricingStore"
import { q, dbEnabled } from "@/lib/db"

export async function GET() {
  try {
    const session = await requirePermission("reports.search")
    return NextResponse.json(await listOrders(session.user.id))
  } catch (e) {
    return toErrorResponse(e)
  }
}

export async function POST(req: Request) {
  try {
    const session = await requirePermission("reports.purchase")
    const { itemKey, companyKey } = await req.json()
    const company = entityByKey(companyKey)
    if (!company) return NextResponse.json({ error: "unknown company" }, { status: 404 })
    const pkgs = await pricingStore.listPackages()
    const pkg = pkgs.find((p) => p.name === session.packageName) ?? pkgs.find((p) => p.isDefault)!
    const catalog = await pricingStore.listCatalog()
    const item = catalog.find((c) => c.key === itemKey)
    if (!item) return NextResponse.json({ error: "unknown item" }, { status: 404 })
    const allowance = pkg.currentVersion.creditAllowances[itemKey] ?? 0
    const order = await purchase({
      buyerId: session.user.id,
      packageId: pkg.id,
      packageName: pkg.name,
      itemKey,
      itemName: item.name,
      companyKey,
      companyName: company.name,
      creditAllowance: allowance,
    })
    return NextResponse.json(order, { status: 201 })
  } catch (e) {
    return toErrorResponse(e)
  }
}
