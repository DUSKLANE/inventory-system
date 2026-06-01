import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { randomUUID } from "crypto";

// GET /api/boms/[id] - get BOM details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const bom = db.prepare("SELECT * FROM boms WHERE id = ?").get(id);
    if (!bom) {
      return NextResponse.json({ error: "BOM不存在" }, { status: 404 });
    }

    const items = db.prepare(`
      SELECT bi.*, p.code, p.name, p.category, p.unit,
             COALESCE(s.quantity, 0) as currentStock
      FROM bom_items bi
      JOIN parts p ON p.id = bi.partId
      LEFT JOIN stock s ON s.partId = p.id
      WHERE bi.bomId = ?
      ORDER BY p.code
    `).all(id);

    return NextResponse.json({ ...bom as Record<string, unknown>, items });
  } catch (error) {
    console.error("GET /api/boms/[id] error:", error);
    return NextResponse.json({ error: "获取BOM详情失败" }, { status: 500 });
  }
}

// PUT /api/boms/[id] - update BOM
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, items } = body;

    const bom = db.prepare("SELECT * FROM boms WHERE id = ?").get(id);
    if (!bom) {
      return NextResponse.json({ error: "BOM不存在" }, { status: 404 });
    }

    const now = new Date().toISOString();

    const transaction = db.transaction(() => {
      if (name !== undefined || description !== undefined) {
        const updates: string[] = ["updatedAt = ?"];
        const values: unknown[] = [now];
        
        if (name !== undefined) {
          updates.push("name = ?");
          values.push(name);
        }
        if (description !== undefined) {
          updates.push("description = ?");
          values.push(description);
        }
        
        values.push(id);
        db.prepare(`UPDATE boms SET ${updates.join(", ")} WHERE id = ?`).run(...values);
      }

      if (items && Array.isArray(items)) {
        db.prepare("DELETE FROM bom_items WHERE bomId = ?").run(id);
        
        for (const item of items) {
          db.prepare(`
            INSERT INTO bom_items (id, bomId, partId, quantity, note)
            VALUES (?, ?, ?, ?, ?)
          `).run(randomUUID(), id, item.partId, item.quantity || 1, item.note || "");
        }
      }
    });

    transaction();

    const updatedBom = db.prepare("SELECT * FROM boms WHERE id = ?").get(id);
    const updatedItems = db.prepare(`
      SELECT bi.*, p.code, p.name, p.category, p.unit,
             COALESCE(s.quantity, 0) as currentStock
      FROM bom_items bi
      JOIN parts p ON p.id = bi.partId
      LEFT JOIN stock s ON s.partId = p.id
      WHERE bi.bomId = ?
    `).all(id);

    return NextResponse.json({ ...updatedBom as Record<string, unknown>, items: updatedItems });
  } catch (error) {
    console.error("PUT /api/boms/[id] error:", error);
    return NextResponse.json({ error: "更新BOM失败" }, { status: 500 });
  }
}

// DELETE /api/boms/[id] - delete BOM
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const bom = db.prepare("SELECT * FROM boms WHERE id = ?").get(id);
    if (!bom) {
      return NextResponse.json({ error: "BOM不存在" }, { status: 404 });
    }

    const transaction = db.transaction(() => {
      db.prepare("DELETE FROM bom_items WHERE bomId = ?").run(id);
      db.prepare("DELETE FROM boms WHERE id = ?").run(id);
    });

    transaction();

    return NextResponse.json({ success: true, message: "BOM已删除" });
  } catch (error) {
    console.error("DELETE /api/boms/[id] error:", error);
    return NextResponse.json({ error: "删除BOM失败" }, { status: 500 });
  }
}
