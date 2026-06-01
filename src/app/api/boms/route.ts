import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { randomUUID } from "crypto";

// GET /api/boms - list BOMs
export async function GET() {
  try {
    const boms = db.prepare(`
      SELECT b.*, 
        (SELECT COUNT(*) FROM bom_items bi WHERE bi.bomId = b.id) as itemCount
      FROM boms b
      ORDER BY b.updatedAt DESC
    `).all();

    return NextResponse.json({ boms });
  } catch (error) {
    console.error("GET /api/boms error:", error);
    return NextResponse.json({ error: "获取BOM列表失败" }, { status: 500 });
  }
}

// POST /api/boms - create BOM
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, items } = body;

    if (!name) {
      return NextResponse.json({ error: "BOM名称不能为空" }, { status: 400 });
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    const transaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO boms (id, name, description, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, name, description || "", now, now);

      if (items && Array.isArray(items)) {
        for (const item of items) {
          db.prepare(`
            INSERT INTO bom_items (id, bomId, partId, quantity, note)
            VALUES (?, ?, ?, ?, ?)
          `).run(randomUUID(), id, item.partId, item.quantity || 1, item.note || "");
        }
      }
    });

    transaction();

    const bom = db.prepare("SELECT * FROM boms WHERE id = ?").get(id);
    return NextResponse.json(bom, { status: 201 });
  } catch (error) {
    console.error("POST /api/boms error:", error);
    return NextResponse.json({ error: "创建BOM失败" }, { status: 500 });
  }
}
