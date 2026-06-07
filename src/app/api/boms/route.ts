import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const boms = await db.listBoms();
    return NextResponse.json({ boms });
  } catch (error) {
    console.error("GET /api/boms error:", error);
    return NextResponse.json({ error: "获取BOM列表失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, items } = body;
    if (!name) return NextResponse.json({ error: "BOM名称不能为空" }, { status: 400 });
    const bom = await db.createBom({ name, description, items });
    return NextResponse.json(bom, { status: 201 });
  } catch (error) {
    console.error("POST /api/boms error:", error);
    return NextResponse.json({ error: "创建BOM失败" }, { status: 500 });
  }
}
