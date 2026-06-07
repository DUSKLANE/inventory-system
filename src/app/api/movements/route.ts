import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { movementSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = {
      partId: searchParams.get("partId") || undefined,
      type: searchParams.get("type") || undefined,
      page: parseInt(searchParams.get("page") || "1"),
      pageSize: parseInt(searchParams.get("pageSize") || "50"),
    };
    const result = await db.listMovements(filters);
    return NextResponse.json({ movements: result.movements, total: result.total, page: filters.page, pageSize: filters.pageSize });
  } catch (error) {
    console.error("GET /api/movements error:", error);
    return NextResponse.json({ error: "获取流水记录失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = movementSchema.parse(body);
    const result = await db.createMovement(data);
    return NextResponse.json({ id: result.id, ...data, createdAt: new Date().toISOString(), newQuantity: result.newQuantity }, { status: 201 });
  } catch (error) {
    console.error("POST /api/movements error:", error);
    if (error instanceof Error) {
      if (error.name === "ZodError") return NextResponse.json({ error: "参数校验失败", details: error.message }, { status: 400 });
      if (error.message.includes("库存不足")) return NextResponse.json({ error: error.message }, { status: 400 });
      if (error.message === "器件不存在") return NextResponse.json({ error: "器件不存在" }, { status: 404 });
    }
    return NextResponse.json({ error: "创建流水失败" }, { status: 500 });
  }
}
