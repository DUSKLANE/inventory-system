import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { partSchema } from "@/lib/validations";
import { logOperation } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const part = await db.getPart(id);
    if (!part) return NextResponse.json({ error: "器件不存在" }, { status: 404 });
    return NextResponse.json({ ...part, stock: part.stock, movements: part.movements });
  } catch (error) {
    console.error("GET /api/parts/[id] error:", error);
    return NextResponse.json({ error: "获取器件详情失败" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = partSchema.partial().parse(body);
    const part = await db.updatePart(id, data);
    logOperation({ action: "UPDATE", entityType: "PART", entityId: id, entityName: part.name || "", details: `更新器件: ${Object.keys(data).join(", ")}` });
    return NextResponse.json({ ...part, stock: part.stock });
  } catch (error) {
    console.error("PUT /api/parts/[id] error:", error);
    if (error instanceof Error) {
      if (error.message === "器件不存在") return NextResponse.json({ error: "器件不存在" }, { status: 404 });
      if (error.message === "编码已存在") return NextResponse.json({ error: "编码已存在" }, { status: 400 });
    }
    return NextResponse.json({ error: "更新器件失败" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const part = await db.getPart(id);
    await db.deletePart(id);
    logOperation({ action: "DELETE", entityType: "PART", entityId: id, entityName: part?.name || "", details: `删除器件: ${part?.code || ""} - ${part?.name || ""}` });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/parts/[id] error:", error);
    return NextResponse.json({ error: "删除器件失败" }, { status: 500 });
  }
}
