import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const category = await db.getCategory(id);
    if (!category) return NextResponse.json({ error: "分类不存在" }, { status: 404 });
    return NextResponse.json(category);
  } catch (error) {
    console.error("Failed to fetch category:", error);
    return NextResponse.json({ error: "获取分类失败" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { name, description, sortOrder } = await request.json();
    if (!name || !name.trim()) return NextResponse.json({ error: "分类名称不能为空" }, { status: 400 });
    await db.updateCategory(id, { name: name.trim(), description, sortOrder });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update category:", error);
    if (error instanceof Error) {
      if (error.message === "分类名称已存在") return NextResponse.json({ error: "分类名称已存在" }, { status: 400 });
      if (error.message === "分类不存在") return NextResponse.json({ error: "分类不存在" }, { status: 404 });
    }
    return NextResponse.json({ error: "更新分类失败" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.deleteCategory(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete category:", error);
    if (error instanceof Error && error.message === "分类不存在") return NextResponse.json({ error: "分类不存在" }, { status: 404 });
    return NextResponse.json({ error: "删除分类失败" }, { status: 500 });
  }
}
