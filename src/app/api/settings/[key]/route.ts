import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = 'force-dynamic';

// GET /api/settings/[key] - 获取单个设置
export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const db = getDb();
  try {
    const { key } = await params;
    const setting = db.prepare("SELECT * FROM settings WHERE key = ?").get(key) as { key: string; value: string } | undefined;

    if (!setting) {
      return NextResponse.json({ error: "设置不存在" }, { status: 404 });
    }

    return NextResponse.json({ key: setting.key, value: setting.value });
  } catch (error) {
    console.error("Failed to fetch setting:", error);
    return NextResponse.json({ error: "获取设置失败" }, { status: 500 });
  } finally {
    db.close();
  }
}

// PUT /api/settings/[key] - 更新单个设置
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const db = getDb();
  try {
    const { key } = await params;
    const { value } = await request.json();

    db.prepare(
      "INSERT INTO settings (key, value, updatedAt) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt"
    ).run(key, value);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update setting:", error);
    return NextResponse.json({ error: "更新设置失败" }, { status: 500 });
  } finally {
    db.close();
  }
}

// DELETE /api/settings/[key] - 删除单个设置
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const db = getDb();
  try {
    const { key } = await params;
    db.prepare("DELETE FROM settings WHERE key = ?").run(key);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete setting:", error);
    return NextResponse.json({ error: "删除设置失败" }, { status: 500 });
  } finally {
    db.close();
  }
}
