import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await db.getAlerts();
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/alerts error:", error);
    return NextResponse.json({ error: "获取预警信息失败" }, { status: 500 });
  }
}
