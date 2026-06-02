import { NextResponse } from "next/server";
import db from "@/lib/db";
import { randomUUID } from "crypto";

// GET /api/categories - 获取所有分类（带器件数量统计）
export async function GET() {
  try {
    const categories = db.prepare(`
      SELECT c.*, COUNT(p.id) as partCount
      FROM categories c
      LEFT JOIN parts p ON p.category = c.name
      GROUP BY c.id
      ORDER BY c.sortOrder, c.name
    `).all();

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return NextResponse.json({ error: "获取分类失败" }, { status: 500 });
  }
}

// POST /api/categories - 新增分类
export async function POST(request: Request) {
  try {
    const { name, description } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "分类名称不能为空" }, { status: 400 });
    }

    const existing = db.prepare("SELECT id FROM categories WHERE name = ?").get(name.trim());
    if (existing) {
      return NextResponse.json({ error: "分类名称已存在" }, { status: 400 });
    }

    const id = randomUUID();
    const maxSort = db.prepare("SELECT MAX(sortOrder) as maxSort FROM categories").get() as { maxSort: number | null };
    const sortOrder = (maxSort?.maxSort ?? 0) + 1;

    db.prepare(
      "INSERT INTO categories (id, name, description, sortOrder) VALUES (?, ?, ?, ?)"
    ).run(id, name.trim(), description || "", sortOrder);

    return NextResponse.json({ id, name: name.trim(), description: description || "", sortOrder });
  } catch (error) {
    console.error("Failed to create category:", error);
    return NextResponse.json({ error: "创建分类失败" }, { status: 500 });
  }
}
