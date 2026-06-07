import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    if (!code) return NextResponse.json({ error: "编码不能为空" }, { status: 400 });
    const part = await db.getPartByCode(code);
    if (!part) return NextResponse.json({ found: false, code });
    return NextResponse.json({ found: true, part });
  } catch (error) {
    console.error("GET /api/parts/lookup error:", error);
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }
}
