import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const favorites = await db.listFavorites();
    return NextResponse.json({ favorites });
  } catch (error) {
    console.error("GET /api/favorites error:", error);
    return NextResponse.json({ error: "获取收藏列表失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { partId } = body;
    if (!partId) return NextResponse.json({ error: "器件ID不能为空" }, { status: 400 });
    const result = await db.toggleFavorite(partId);
    return NextResponse.json({ ...result, message: result.favorited ? "已添加收藏" : "已取消收藏" });
  } catch (error) {
    console.error("POST /api/favorites error:", error);
    if (error instanceof Error && error.message === "器件不存在") return NextResponse.json({ error: "器件不存在" }, { status: 404 });
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
