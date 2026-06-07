import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { logOperation } from "@/lib/logger";

export const dynamic = 'force-dynamic';

// GET /api/warehouses/[id] - get warehouse details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  try {
    const { id } = await params;
    
    const warehouse = db.prepare("SELECT * FROM warehouses WHERE id = ?").get(id);
    if (!warehouse) {
      return NextResponse.json({ error: "仓库不存在" }, { status: 404 });
    }

    const items = db.prepare(`
      SELECT sw.*, p.code, p.name, p.category, p.unit, p.location
      FROM stock_warehouse sw
      JOIN parts p ON p.id = sw.partId
      WHERE sw.warehouseId = ?
      ORDER BY p.code
    `).all(id);

    return NextResponse.json({ ...warehouse as Record<string, unknown>, items });
  } catch (error) {
    console.error("GET /api/warehouses/[id] error:", error);
    return NextResponse.json({ error: "获取仓库详情失败" }, { status: 500 });
  } finally {
    db.close();
  }
}

// PUT /api/warehouses/[id] - update warehouse
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, location, description, isDefault } = body;

    const warehouse = db.prepare("SELECT * FROM warehouses WHERE id = ?").get(id);
    if (!warehouse) {
      return NextResponse.json({ error: "仓库不存在" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const updates: string[] = ["updatedAt = ?"];
    const values: unknown[] = [now];

    if (name !== undefined) {
      updates.push("name = ?");
      values.push(name);
    }
    if (location !== undefined) {
      updates.push("location = ?");
      values.push(location);
    }
    if (description !== undefined) {
      updates.push("description = ?");
      values.push(description);
    }
    if (isDefault !== undefined) {
      if (isDefault) {
        db.prepare("UPDATE warehouses SET isDefault = 0").run();
      }
      updates.push("isDefault = ?");
      values.push(isDefault ? 1 : 0);
    }

    values.push(id);
    db.prepare(`UPDATE warehouses SET ${updates.join(", ")} WHERE id = ?`).run(...values);

    logOperation({
      action: "UPDATE",
      entityType: "WAREHOUSE",
      entityId: id,
      entityName: name || (warehouse as Record<string, unknown>).name as string,
      details: `更新仓库: ${Object.keys(body).join(", ")}`,
    });

    const updated = db.prepare("SELECT * FROM warehouses WHERE id = ?").get(id);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/warehouses/[id] error:", error);
    return NextResponse.json({ error: "更新仓库失败" }, { status: 500 });
  } finally {
    db.close();
  }
}

// DELETE /api/warehouses/[id] - delete warehouse
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  try {
    const { id } = await params;
    
    const warehouse = db.prepare("SELECT * FROM warehouses WHERE id = ?").get(id);
    if (!warehouse) {
      return NextResponse.json({ error: "仓库不存在" }, { status: 404 });
    }

    if ((warehouse as Record<string, unknown>).isDefault) {
      return NextResponse.json({ error: "不能删除默认仓库" }, { status: 400 });
    }

    db.prepare("DELETE FROM stock_warehouse WHERE warehouseId = ?").run(id);
    db.prepare("DELETE FROM warehouses WHERE id = ?").run(id);

    logOperation({
      action: "DELETE",
      entityType: "WAREHOUSE",
      entityId: id,
      entityName: (warehouse as Record<string, unknown>).name as string,
      details: `删除仓库: ${(warehouse as Record<string, unknown>).name}`,
    });

    return NextResponse.json({ success: true, message: "仓库已删除" });
  } catch (error) {
    console.error("DELETE /api/warehouses/[id] error:", error);
    return NextResponse.json({ error: "删除仓库失败" }, { status: 500 });
  } finally {
    db.close();
  }
}
