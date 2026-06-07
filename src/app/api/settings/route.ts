import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = 'force-dynamic';

// GET /api/settings - 获取所有设置
export async function GET() {
  const db = getDb();
  try {
    const settings = db.prepare("SELECT * FROM settings").all() as { key: string; value: string }[];
    const settingsMap = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, string>);

    return NextResponse.json(settingsMap);
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json({ error: "获取设置失败" }, { status: 500 });
  } finally {
    db.close();
  }
}

// PUT /api/settings - 批量更新设置
export async function PUT(request: Request) {
  const db = getDb();
  try {
    const body = await request.json();
    const upsert = db.prepare(
      "INSERT INTO settings (key, value, updatedAt) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt"
    );

    const transaction = db.transaction((settings: Record<string, string>) => {
      for (const [key, value] of Object.entries(settings)) {
        upsert.run(key, value);
      }
    });

    transaction(body);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update settings:", error);
    return NextResponse.json({ error: "更新设置失败" }, { status: 500 });
  } finally {
    db.close();
  }
}
