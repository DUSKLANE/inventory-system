import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const db = getDb();
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json({ error: "请提供编码参数" }, { status: 400 });
    }

    const part = db.prepare(`
      SELECT p.*, s.quantity as stockQuantity
      FROM parts p LEFT JOIN stock s ON s.partId = p.id
      WHERE p.code = ?
    `).get(code) as Record<string, unknown> | undefined;

    if (!part) {
      return NextResponse.json({ found: false, code });
    }

    return NextResponse.json({
      found: true,
      part: { ...part, stock: { quantity: part.stockQuantity ?? 0 } },
    });
  } catch (error) {
    console.error("GET /api/parts/lookup error:", error);
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  } finally {
    db.close();
  }
}
