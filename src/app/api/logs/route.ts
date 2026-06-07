import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = {
      entityType: searchParams.get("entityType") || undefined,
      action: searchParams.get("action") || undefined,
      page: parseInt(searchParams.get("page") || "1"),
      pageSize: parseInt(searchParams.get("pageSize") || "50"),
    };
    const result = await db.listLogs(filters);
    return NextResponse.json({
      logs: result.logs,
      total: result.total,
      page: filters.page,
      pageSize: filters.pageSize,
      totalPages: Math.ceil(result.total / filters.pageSize),
    });
  } catch (error) {
    console.error("GET /api/logs error:", error);
    return NextResponse.json({ error: "获取操作日志失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, entityType, entityId, entityName, details, operator } = body;
    if (!action || !entityType) return NextResponse.json({ error: "操作类型和实体类型不能为空" }, { status: 400 });
    await db.logOperation({ action, entityType, entityId, entityName, details, operator });
    return NextResponse.json({ id: crypto.randomUUID(), action, entityType, entityId, entityName, details, operator, createdAt: new Date().toISOString() }, { status: 201 });
  } catch (error) {
    console.error("POST /api/logs error:", error);
    return NextResponse.json({ error: "创建操作日志失败" }, { status: 500 });
  }
}
