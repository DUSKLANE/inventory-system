import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { movementSchema } from "@/lib/validations";
import { randomUUID } from "crypto";

// GET /api/movements
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const partId = searchParams.get("partId") || undefined;
    const type = searchParams.get("type") || undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");

    let where = "WHERE 1=1";
    const params: unknown[] = [];

    if (partId) {
      where += " AND m.partId = ?";
      params.push(partId);
    }
    if (type) {
      where += " AND m.type = ?";
      params.push(type);
    }

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM stock_movements m ${where}`).get(...params) as { total: number };
    const total = countRow.total;

    const offset = (page - 1) * pageSize;
    const rawMovements = db.prepare(`
      SELECT m.*, p.code as partCode, p.name as partName, p.unit as partUnit
      FROM stock_movements m
      JOIN parts p ON p.id = m.partId
      ${where}
      ORDER BY m.createdAt DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset) as Record<string, unknown>[];

    const movements = rawMovements.map((m) => ({
      ...m,
      part: { code: m.partCode, name: m.partName, unit: m.partUnit },
    }));

    return NextResponse.json({ movements, total, page, pageSize });
  } catch (error) {
    console.error("GET /api/movements error:", error);
    return NextResponse.json({ error: "获取流水记录失败" }, { status: 500 });
  }
}

// POST /api/movements - create stock movement
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = movementSchema.parse(body);

    const part = db.prepare(`
      SELECT p.*, s.quantity as stockQuantity
      FROM parts p LEFT JOIN stock s ON s.partId = p.id
      WHERE p.id = ?
    `).get(data.partId) as Record<string, unknown> | undefined;

    if (!part) {
      return NextResponse.json({ error: "器件不存在" }, { status: 404 });
    }

    const currentQty = (part.stockQuantity as number) ?? 0;
    let newQty: number;

    if (data.type === "IN") {
      newQty = currentQty + data.quantity;
    } else if (data.type === "OUT") {
      if (currentQty < data.quantity) {
        return NextResponse.json(
          { error: `库存不足，当前库存 ${currentQty}，出库数量 ${data.quantity}` },
          { status: 400 }
        );
      }
      newQty = currentQty - data.quantity;
    } else {
      newQty = data.quantity;
    }

    const movementId = randomUUID();
    const now = new Date().toISOString();

    const transaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO stock_movements (id, partId, type, quantity, operator, reason, code, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(movementId, data.partId, data.type, data.quantity, data.operator, data.reason, data.code, now);

      db.prepare(`UPDATE stock SET quantity = ?, updatedAt = ? WHERE partId = ?`).run(newQty, now, data.partId);
      db.prepare(`UPDATE parts SET updatedAt = ? WHERE id = ?`).run(now, data.partId);
    });

    transaction();

    return NextResponse.json({
      id: movementId,
      ...data,
      createdAt: now,
      newQuantity: newQty,
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/movements error:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "参数校验失败", details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "创建流水失败" }, { status: 500 });
  }
}
