import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { logOperation } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const warehouses = await db.listWarehouses();
    return NextResponse.json({ warehouses });
  } catch (error) {
    console.error("GET /api/warehouses error:", error);
    return NextResponse.json({ error: "获取仓库列表失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, location, description, isDefault } = body;
    if (!name) return NextResponse.json({ error: "仓库名称不能为空" }, { status: 400 });
    const warehouse = await db.createWarehouse({ name, location, description, isDefault });
    logOperation({ action: "CREATE", entityType: "WAREHOUSE", entityId: warehouse.id, entityName: name, details: `创建仓库: ${name}` });
    return NextResponse.json(warehouse, { status: 201 });
  } catch (error) {
    console.error("POST /api/warehouses error:", error);
    return NextResponse.json({ error: "创建仓库失败" }, { status: 500 });
  }
}
