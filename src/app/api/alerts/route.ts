import { NextResponse } from "next/server";
import db from "@/lib/db";

// GET /api/alerts - get inventory alerts
export async function GET() {
  try {
    // Low stock parts
    const lowStockParts = db.prepare(`
      SELECT p.id, p.code, p.name, p.category, p.minStock, p.unit,
             COALESCE(s.quantity, 0) as currentStock,
             ROUND(COALESCE(s.quantity, 0) * 100.0 / NULLIF(p.minStock, 0), 1) as stockPercentage
      FROM parts p
      LEFT JOIN stock s ON s.partId = p.id
      WHERE p.minStock > 0 AND COALESCE(s.quantity, 0) < p.minStock
      ORDER BY (COALESCE(s.quantity, 0) * 1.0 / NULLIF(p.minStock, 0)) ASC
    `).all();

    // Out of stock parts
    const outOfStockParts = db.prepare(`
      SELECT p.id, p.code, p.name, p.category, p.unit
      FROM parts p
      LEFT JOIN stock s ON s.partId = p.id
      WHERE COALESCE(s.quantity, 0) = 0
      ORDER BY p.updatedAt DESC
      LIMIT 20
    `).all();

    // Recent stock movements (last 7 days)
    const recentMovements = db.prepare(`
      SELECT 
        DATE(m.createdAt) as date,
        SUM(CASE WHEN m.type = 'IN' THEN m.quantity ELSE 0 END) as totalIn,
        SUM(CASE WHEN m.type = 'OUT' THEN m.quantity ELSE 0 END) as totalOut,
        COUNT(*) as movementCount
      FROM stock_movements m
      WHERE m.createdAt >= datetime('now', '-7 days')
      GROUP BY DATE(m.createdAt)
      ORDER BY date ASC
    `).all();

    // Most active parts (last 30 days)
    const activeParts = db.prepare(`
      SELECT p.id, p.code, p.name, p.category,
             COUNT(m.id) as movementCount,
             SUM(CASE WHEN m.type = 'IN' THEN m.quantity ELSE 0 END) as totalIn,
             SUM(CASE WHEN m.type = 'OUT' THEN m.quantity ELSE 0 END) as totalOut
      FROM parts p
      JOIN stock_movements m ON m.partId = p.id
      WHERE m.createdAt >= datetime('now', '-30 days')
      GROUP BY p.id
      ORDER BY movementCount DESC
      LIMIT 10
    `).all();

    // Summary stats
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as totalParts,
        SUM(CASE WHEN COALESCE(s.quantity, 0) = 0 THEN 1 ELSE 0 END) as outOfStockCount,
        SUM(CASE WHEN p.minStock > 0 AND COALESCE(s.quantity, 0) < p.minStock THEN 1 ELSE 0 END) as lowStockCount,
        SUM(CASE WHEN p.minStock > 0 AND COALESCE(s.quantity, 0) < p.minStock THEN 1 ELSE 0 END) as criticalCount
      FROM parts p
      LEFT JOIN stock s ON s.partId = p.id
    `).get() as Record<string, number>;

    return NextResponse.json({
      lowStockParts,
      outOfStockParts,
      recentMovements,
      activeParts,
      stats: {
        totalParts: stats.totalParts || 0,
        outOfStockCount: stats.outOfStockCount || 0,
        lowStockCount: stats.lowStockCount || 0,
        criticalCount: stats.criticalCount || 0,
      },
    });
  } catch (error) {
    console.error("GET /api/alerts error:", error);
    return NextResponse.json({ error: "获取预警信息失败" }, { status: 500 });
  }
}
