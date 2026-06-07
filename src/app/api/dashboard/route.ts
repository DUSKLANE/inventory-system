import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = getDb();
  try {
    const today = new Date().toISOString().split("T")[0];

    const totalParts = (db.prepare("SELECT COUNT(*) as count FROM parts").get() as { count: number }).count;

    const lowStockCount = (db.prepare(`
      SELECT COUNT(*) as count FROM stock s
      JOIN parts p ON s.partId = p.id
      WHERE p.minStock > 0 AND s.quantity < p.minStock
    `).get() as { count: number }).count;

    const todayInCount = (db.prepare(`
      SELECT COUNT(*) as count FROM stock_movements
      WHERE type = 'IN' AND createdAt >= ?
    `).get(today) as { count: number }).count;

    const todayOutCount = (db.prepare(`
      SELECT COUNT(*) as count FROM stock_movements
      WHERE type = 'OUT' AND createdAt >= ?
    `).get(today) as { count: number }).count;

    const rawMovements = db.prepare(`
      SELECT m.*, p.id as partId, p.code as partCode, p.name as partName, p.unit as partUnit
      FROM stock_movements m
      JOIN parts p ON p.id = m.partId
      ORDER BY m.createdAt DESC
      LIMIT 10
    `).all() as Record<string, unknown>[];

    const recentMovements = rawMovements.map((m) => ({
      ...m,
      part: { id: m.partId, code: m.partCode, name: m.partName, unit: m.partUnit },
    }));

    // 获取最近操作过的器件（去重，按最后操作时间排序）
    const recentParts = db.prepare(`
      SELECT DISTINCT p.id, p.code, p.name, p.category, p.unit,
        s.quantity as stock,
        MAX(m.createdAt) as lastUsedAt
      FROM stock_movements m
      JOIN parts p ON p.id = m.partId
      LEFT JOIN stock s ON s.partId = p.id
      GROUP BY p.id
      ORDER BY lastUsedAt DESC
      LIMIT 6
    `).all() as Record<string, unknown>[];

    return NextResponse.json({
      totalParts,
      lowStockCount,
      todayInCount,
      todayOutCount,
      recentMovements,
      recentParts,
    });
  } catch (error) {
    console.error("GET /api/dashboard error:", error);
    return NextResponse.json({ error: "获取仪表盘数据失败" }, { status: 500 });
  } finally {
    db.close();
  }
}
