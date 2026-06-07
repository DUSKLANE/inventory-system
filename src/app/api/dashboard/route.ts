import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await db.getDashboard();
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/dashboard error:", error);
    return NextResponse.json({ error: "获取仪表盘数据失败" }, { status: 500 });
  }
}
