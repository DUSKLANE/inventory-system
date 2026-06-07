import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = 'force-dynamic';

// GET /api/categories/[id] - 获取单个分类
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  try {
    const { id } = await params;
    const category = db.prepare(`
      SELECT c.*, COUNT(p.id) as partCount
      FROM categories c
      LEFT JOIN parts p ON p.category = c.name
      WHERE c.id = ?
      GROUP BY c.id
    `).get(id);

    if (!category) {
      return NextResponse.json({ error: "分类不存在" }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error("Failed to fetch category:", error);
    return NextResponse.json({ error: "获取分类失败" }, { status: 500 });
  } finally {
    db.close();
  }
}

// PUT /api/categories/[id] - 更新分类
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  try {
    const { id } = await params;
    const { name, description, sortOrder } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "分类名称不能为空" }, { status: 400 });
    }

    const existing = db.prepare("SELECT id FROM categories WHERE name = ? AND id != ?").get(name.trim(), id);
    if (existing) {
      return NextResponse.json({ error: "分类名称已存在" }, { status: 400 });
    }

    const oldCategory = db.prepare("SELECT name FROM categories WHERE id = ?").get(id) as { name: string } | undefined;
    if (!oldCategory) {
      return NextResponse.json({ error: "分类不存在" }, { status: 404 });
    }

    const transaction = db.transaction(() => {
      db.prepare(
        "UPDATE categories SET name = ?, description = ?, sortOrder = ? WHERE id = ?"
      ).run(name.trim(), description || "", sortOrder ?? 0, id);

      if (oldCategory.name !== name.trim()) {
        db.prepare("UPDATE parts SET category = ? WHERE category = ?").run(name.trim(), oldCategory.name);
      }
    });

    transaction();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update category:", error);
    return NextResponse.json({ error: "更新分类失败" }, { status: 500 });
  } finally {
    db.close();
  }
}

// DELETE /api/categories/[id] - 删除分类
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  try {
    const { id } = await params;
    const category = db.prepare("SELECT name FROM categories WHERE id = ?").get(id) as { name: string } | undefined;

    if (!category) {
      return NextResponse.json({ error: "分类不存在" }, { status: 404 });
    }

    db.prepare("UPDATE parts SET category = '' WHERE category = ?").run(category.name);
    db.prepare("DELETE FROM categories WHERE id = ?").run(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete category:", error);
    return NextResponse.json({ error: "删除分类失败" }, { status: 500 });
  } finally {
    db.close();
  }
}
