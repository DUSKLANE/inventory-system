import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const categories = await db.listCategories();
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return NextResponse.json({ error: "获取分类失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, description } = await request.json();
    if (!name || !name.trim()) return NextResponse.json({ error: "分类名称不能为空" }, { status: 400 });
    const category = await db.createCategory({ name: name.trim(), description });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Failed to create category:", error);
    if (error instanceof Error && error.message === "分类名称已存在") return NextResponse.json({ error: "分类名称已存在" }, { status: 400 });
    return NextResponse.json({ error: "创建分类失败" }, { status: 500 });
  }
}
