import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    const { key } = await params;
    const value = await db.getSetting(key);
    if (value === null) return NextResponse.json({ error: "设置不存在" }, { status: 404 });
    return NextResponse.json({ key, value });
  } catch (error) {
    console.error("Failed to fetch setting:", error);
    return NextResponse.json({ error: "获取设置失败" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    const { key } = await params;
    const { value } = await request.json();
    await db.setSetting(key, value);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update setting:", error);
    return NextResponse.json({ error: "更新设置失败" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    const { key } = await params;
    await db.setSetting(key, "");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete setting:", error);
    return NextResponse.json({ error: "删除设置失败" }, { status: 500 });
  }
}
