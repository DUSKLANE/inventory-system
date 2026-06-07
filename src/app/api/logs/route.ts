import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = 'force-dynamic';

// GET /api/logs - get operation logs
export async function GET(request: NextRequest) {
  const db = getDb();
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");
    const entityType = searchParams.get("entityType") || undefined;
    const action = searchParams.get("action") || undefined;

    let where = "WHERE 1=1";
    const params: unknown[] = [];

    if (entityType) {
      where += " AND entityType = ?";
      params.push(entityType);
    }
    if (action) {
      where += " AND action = ?";
      params.push(action);
    }

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM operation_logs ${where}`).get(...params) as { total: number };
    const total = countRow.total;

    const offset = (page - 1) * pageSize;
    const logs = db.prepare(`
      SELECT * FROM operation_logs
      ${where}
      ORDER BY createdAt DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset);

    return NextResponse.json({
      logs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("GET /api/logs error:", error);
    return NextResponse.json({ error: "获取操作日志失败" }, { status: 500 });
  } finally {
    db.close();
  }
}

// POST /api/logs - create operation log
export async function POST(request: NextRequest) {
  const db = getDb();
  try {
    const body = await request.json();
    const { action, entityType, entityId, entityName, details, operator } = body;

    if (!action || !entityType) {
      return NextResponse.json({ error: "操作类型和实体类型不能为空" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO operation_logs (id, action, entityType, entityId, entityName, details, operator, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, action, entityType, entityId || "", entityName || "", details || "", operator || "system", now);

    return NextResponse.json({ id, action, entityType, entityId, entityName, details, operator, createdAt: now }, { status: 201 });
  } catch (error) {
    console.error("POST /api/logs error:", error);
    return NextResponse.json({ error: "创建操作日志失败" }, { status: 500 });
  } finally {
    db.close();
  }
}
