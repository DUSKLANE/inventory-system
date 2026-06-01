import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { partSchema } from "@/lib/validations";
import { logOperation } from "@/lib/logger";

// GET /api/parts/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const part = db.prepare(`
      SELECT p.*, s.quantity as stockQuantity
      FROM parts p LEFT JOIN stock s ON s.partId = p.id
      WHERE p.id = ?
    `).get(id) as Record<string, unknown> | undefined;

    if (!part) {
      return NextResponse.json({ error: "器件不存在" }, { status: 404 });
    }

    const movements = db.prepare(`
      SELECT * FROM stock_movements WHERE partId = ? ORDER BY createdAt DESC LIMIT 50
    `).all(id);

    return NextResponse.json({
      ...part,
      stock: { quantity: part.stockQuantity ?? 0 },
      movements,
    });
  } catch (error) {
    console.error("GET /api/parts/[id] error:", error);
    return NextResponse.json({ error: "获取器件详情失败" }, { status: 500 });
  }
}

// PUT /api/parts/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = partSchema.partial().parse(body);

    const existing = db.prepare("SELECT * FROM parts WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!existing) {
      return NextResponse.json({ error: "器件不存在" }, { status: 404 });
    }

    if (data.code && data.code !== existing.code) {
      const dup = db.prepare("SELECT id FROM parts WHERE code = ?").get(data.code);
      if (dup) {
        return NextResponse.json({ error: "编码已存在" }, { status: 400 });
      }
    }

    const fields = ["code", "name", "category", "package", "brand", "model", "unit", "minStock", "location", "note"];
    const updates: string[] = [];
    const values: unknown[] = [];

    for (const field of fields) {
      if (data[field as keyof typeof data] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(data[field as keyof typeof data]);
      }
    }

    if (updates.length > 0) {
      updates.push("updatedAt = ?");
      values.push(new Date().toISOString());
      values.push(id);
      db.prepare(`UPDATE parts SET ${updates.join(", ")} WHERE id = ?`).run(...values);
    }

    const part = db.prepare(`
      SELECT p.*, s.quantity as stockQuantity
      FROM parts p LEFT JOIN stock s ON s.partId = p.id
      WHERE p.id = ?
    `).get(id);

    // Log operation
    logOperation({
      action: "UPDATE",
      entityType: "PART",
      entityId: id,
      entityName: (existing.name as string) || "",
      details: `更新器件: ${Object.keys(data).join(", ")}`,
    });

    return NextResponse.json({ ...(part as Record<string, unknown>), stock: { quantity: (part as Record<string, unknown>).stockQuantity ?? 0 } });
  } catch (error) {
    console.error("PUT /api/parts/[id] error:", error);
    return NextResponse.json({ error: "更新器件失败" }, { status: 500 });
  }
}

// DELETE /api/parts/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get part info before deletion
    const part = db.prepare("SELECT * FROM parts WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    
    db.prepare("DELETE FROM parts WHERE id = ?").run(id);
    
    // Log operation
    logOperation({
      action: "DELETE",
      entityType: "PART",
      entityId: id,
      entityName: (part?.name as string) || "",
      details: `删除器件: ${part?.code || ""} - ${part?.name || ""}`,
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/parts/[id] error:", error);
    return NextResponse.json({ error: "删除器件失败" }, { status: 500 });
  }
}
