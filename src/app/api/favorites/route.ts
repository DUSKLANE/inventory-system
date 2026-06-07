import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = 'force-dynamic';

// GET /api/favorites - get favorite parts
export async function GET() {
  const db = getDb();
  try {
    const favorites = db.prepare(`
      SELECT p.id, p.code, p.name, p.category, p.unit, p.location,
             COALESCE(s.quantity, 0) as stock,
             f.createdAt as favoritedAt
      FROM favorites f
      JOIN parts p ON p.id = f.partId
      LEFT JOIN stock s ON s.partId = p.id
      ORDER BY f.createdAt DESC
    `).all();

    return NextResponse.json({ favorites });
  } catch (error) {
    console.error("GET /api/favorites error:", error);
    return NextResponse.json({ error: "获取收藏列表失败" }, { status: 500 });
  } finally {
    db.close();
  }
}

// POST /api/favorites - toggle favorite
export async function POST(request: NextRequest) {
  const db = getDb();
  try {
    const body = await request.json();
    const { partId } = body;

    if (!partId) {
      return NextResponse.json({ error: "器件ID不能为空" }, { status: 400 });
    }

    // Check if part exists
    const part = db.prepare("SELECT id FROM parts WHERE id = ?").get(partId);
    if (!part) {
      return NextResponse.json({ error: "器件不存在" }, { status: 404 });
    }

    // Check if already favorited
    const existing = db.prepare("SELECT id FROM favorites WHERE partId = ?").get(partId);

    if (existing) {
      // Remove from favorites
      db.prepare("DELETE FROM favorites WHERE partId = ?").run(partId);
      return NextResponse.json({ favorited: false, message: "已取消收藏" });
    } else {
      // Add to favorites
      db.prepare("INSERT INTO favorites (id, partId, createdAt) VALUES (?, ?, ?)").run(
        crypto.randomUUID(),
        partId,
        new Date().toISOString()
      );
      return NextResponse.json({ favorited: true, message: "已添加收藏" });
    }
  } catch (error) {
    console.error("POST /api/favorites error:", error);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  } finally {
    db.close();
  }
}
