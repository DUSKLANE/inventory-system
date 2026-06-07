import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { logOperation } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const warehouse = await db.getWarehouse(id);
    if (!warehouse) return NextResponse.json({ error: "仓库不存在" }, { status: 404 });
    return NextResponse.json(warehouse);
  } catch (error) {
    console.error("GET /api/warehouses/[id] error:", error);
    return NextResponse.json({ error: "获取仓库详情失败" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const warehouse = await db.updateWarehouse(id, body);
    logOperation({ action: "UPDATE", entityType: "WAREHOUSE", entityId: id, entityName: body.name || warehouse.name, details: `更新仓库: ${Object.keys(body).join(", ")}` });
    return NextResponse.json(warehouse);
  } catch (error) {
    console.error("PUT /api/warehouses/[id] error:", error);
    if (error instanceof Error && error.message === "仓库不存在") return NextResponse.json({ error: "仓库不存在" }, { status: 404 });
    return NextResponse.json({ error: "更新仓库失败" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const warehouse = await db.getWarehouse(id);
    await db.deleteWarehouse(id);
    logOperation({ action: "DELETE", entityType: "WAREHOUSE", entityId: id, entityName: warehouse?.name || "", details: `删除仓库: ${warehouse?.name}` });
    return NextResponse.json({ success: true, message: "仓库已删除" });
  } catch (error) {
    console.error("DELETE /api/warehouses/[id] error:", error);
    if (error instanceof Error) {
      if (error.message === "仓库不存在") return NextResponse.json({ error: "仓库不存在" }, { status: 404 });
      if (error.message === "不能删除默认仓库") return NextResponse.json({ error: "不能删除默认仓库" }, { status: 400 });
    }
    return NextResponse.json({ error: "删除仓库失败" }, { status: 500 });
  }
}
