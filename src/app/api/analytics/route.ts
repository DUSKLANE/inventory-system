import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = 'force-dynamic';

// GET /api/analytics - get analytics data
export async function GET(request: NextRequest) {
  const db = getDb();
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30"; // days

    // Stock summary by category
    const categoryStats = db.prepare(`
      SELECT 
        p.category,
        COUNT(*) as partCount,
        SUM(COALESCE(s.quantity, 0)) as totalStock,
        SUM(CASE WHEN p.minStock > 0 AND COALESCE(s.quantity, 0) < p.minStock THEN 1 ELSE 0 END) as lowStockCount
      FROM parts p
      LEFT JOIN stock s ON s.partId = p.id
      WHERE p.category != ''
      GROUP BY p.category
      ORDER BY partCount DESC
    `).all();

    // Movement trends (last N days)
    const movementTrends = db.prepare(`
      SELECT 
        DATE(m.createdAt) as date,
        SUM(CASE WHEN m.type = 'IN' THEN m.quantity ELSE 0 END) as totalIn,
        SUM(CASE WHEN m.type = 'OUT' THEN m.quantity ELSE 0 END) as totalOut,
        COUNT(*) as movementCount
      FROM stock_movements m
      WHERE m.createdAt >= datetime('now', '-${period} days')
      GROUP BY DATE(m.createdAt)
      ORDER BY date ASC
    `).all();

    // Top moved parts (most active)
    const topMovedParts = db.prepare(`
      SELECT 
        p.id, p.code, p.name, p.category, p.unit,
        COUNT(m.id) as movementCount,
        SUM(CASE WHEN m.type = 'IN' THEN m.quantity ELSE 0 END) as totalIn,
        SUM(CASE WHEN m.type = 'OUT' THEN m.quantity ELSE 0 END) as totalOut
      FROM parts p
      JOIN stock_movements m ON m.partId = p.id
      WHERE m.createdAt >= datetime('now', '-${period} days')
      GROUP BY p.id
      ORDER BY movementCount DESC
      LIMIT 10
    `).all();

    // Stock value by category
    const stockValueByCategory = db.prepare(`
      SELECT 
        p.category,
        SUM(COALESCE(s.quantity, 0)) as totalQuantity,
        COUNT(*) as partCount
      FROM parts p
      LEFT JOIN stock s ON s.partId = p.id
      WHERE p.category != ''
      GROUP BY p.category
      ORDER BY totalQuantity DESC
    `).all();

    // Movement type distribution
    const movementTypeDistribution = db.prepare(`
      SELECT 
        type,
        COUNT(*) as count,
        SUM(quantity) as totalQuantity
      FROM stock_movements
      WHERE createdAt >= datetime('now', '-${period} days')
      GROUP BY type
    `).all();

    // Daily average movements
    const dailyAverages = db.prepare(`
      SELECT 
        AVG(daily_in) as avgIn,
        AVG(daily_out) as avgOut,
        AVG(daily_count) as avgCount
      FROM (
        SELECT 
          DATE(createdAt) as date,
          SUM(CASE WHEN type = 'IN' THEN quantity ELSE 0 END) as daily_in,
          SUM(CASE WHEN type = 'OUT' THEN quantity ELSE 0 END) as daily_out,
          COUNT(*) as daily_count
        FROM stock_movements
        WHERE createdAt >= datetime('now', '-${period} days')
        GROUP BY DATE(createdAt)
      )
    `).get() as Record<string, number>;

    // Stock distribution (how many parts have 0, 1-10, 11-50, 51-100, 100+ stock)
    const stockDistribution = db.prepare(`
      SELECT 
        CASE 
          WHEN COALESCE(s.quantity, 0) = 0 THEN '无库存'
          WHEN COALESCE(s.quantity, 0) <= 10 THEN '1-10'
          WHEN COALESCE(s.quantity, 0) <= 50 THEN '11-50'
          WHEN COALESCE(s.quantity, 0) <= 100 THEN '51-100'
          ELSE '100+'
        END as range,
        COUNT(*) as count
      FROM parts p
      LEFT JOIN stock s ON s.partId = p.id
      GROUP BY range
      ORDER BY 
        CASE range
          WHEN '无库存' THEN 1
          WHEN '1-10' THEN 2
          WHEN '11-50' THEN 3
          WHEN '51-100' THEN 4
          WHEN '100+' THEN 5
        END
    `).all();

    return NextResponse.json({
      categoryStats,
      movementTrends,
      topMovedParts,
      stockValueByCategory,
      movementTypeDistribution,
      dailyAverages: {
        avgIn: Math.round(dailyAverages?.avgIn || 0),
        avgOut: Math.round(dailyAverages?.avgOut || 0),
        avgCount: Math.round(dailyAverages?.avgCount || 0),
      },
      stockDistribution,
      period: parseInt(period),
    });
  } catch (error) {
    console.error("GET /api/analytics error:", error);
    return NextResponse.json({ error: "获取分析数据失败" }, { status: 500 });
  } finally {
    db.close();
  }
}
