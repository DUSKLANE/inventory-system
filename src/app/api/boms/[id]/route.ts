import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const bom = await db.getBom(id);
    if (!bom) return NextResponse.json({ error: "BOM不存在" }, { status: 404 });
    return NextResponse.json(bom);
  } catch (error) {
    console.error("GET /api/boms/[id] error:", error);
    return NextResponse.json({ error: "获取BOM详情失败" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const bom = await db.updateBom(id, body);
    return NextResponse.json(bom);
  } catch (error) {
    console.error("PUT /api/boms/[id] error:", error);
    if (error instanceof Error && error.message === "BOM不存在") return NextResponse.json({ error: "BOM不存在" }, { status: 404 });
    return NextResponse.json({ error: "更新BOM失败" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.deleteBom(id);
    return NextResponse.json({ success: true, message: "BOM已删除" });
  } catch (error) {
    console.error("DELETE /api/boms/[id] error:", error);
    if (error instanceof Error && error.message === "BOM不存在") return NextResponse.json({ error: "BOM不存在" }, { status: 404 });
    return NextResponse.json({ error: "删除BOM失败" }, { status: 500 });
  }
}
