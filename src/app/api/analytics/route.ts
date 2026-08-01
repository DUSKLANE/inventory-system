import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawPeriod = parseInt(searchParams.get("period") || "30", 10);
    const period = Number.isFinite(rawPeriod) && rawPeriod >= 1 && rawPeriod <= 3650 ? rawPeriod : 30;
    const data = await db.getAnalytics(period);
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/analytics error:", error);
    return NextResponse.json({ error: "获取分析数据失败" }, { status: 500 });
  }
}
