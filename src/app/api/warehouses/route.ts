import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";
import { logOperation } from "@/lib/logger";

export const dynamic = 'force-dynamic';

// GET /api/warehouses - list warehouses
export async function GET() {
  const db = getDb();
  try {
    const warehouses = db.prepare(`
      SELECT w.*, 
        (SELECT COUNT(*) FROM stock_warehouse sw WHERE sw.warehouseId = w.id) as partCount,
        (SELECT SUM(sw.quantity) FROM stock_warehouse sw WHERE sw.warehouseId = w.id) as totalStock
      FROM warehouses w
      ORDER BY w.isDefault DESC, w.name
    `).all();

    return NextResponse.json({ warehouses });
  } catch (error) {
    console.error("GET /api/warehouses error:", error);
    return NextResponse.json({ error: "获取仓库列表失败" }, { status: 500 });
  } finally {
    db.close();
  }
}

// POST /api/warehouses - create warehouse
export async function POST(request: NextRequest) {
  const db = getDb();
  try {
    const body = await request.json();
    const { name, location, description, isDefault } = body;

    if (!name) {
      return NextResponse.json({ error: "仓库名称不能为空" }, { status: 400 });
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    // If setting as default, unset other defaults
    if (isDefault) {
      db.prepare("UPDATE warehouses SET isDefault = 0").run();
    }

    db.prepare(`
      INSERT INTO warehouses (id, name, location, description, isDefault, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, location || "", description || "", isDefault ? 1 : 0, now, now);

    logOperation({
      action: "CREATE",
      entityType: "WAREHOUSE",
      entityId: id,
      entityName: name,
      details: `创建仓库: ${name}`,
    });

    const warehouse = db.prepare("SELECT * FROM warehouses WHERE id = ?").get(id);
    return NextResponse.json(warehouse, { status: 201 });
  } catch (error) {
    console.error("POST /api/warehouses error:", error);
    return NextResponse.json({ error: "创建仓库失败" }, { status: 500 });
  } finally {
    db.close();
  }
}
