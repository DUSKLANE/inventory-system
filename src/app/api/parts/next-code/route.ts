import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const code = await db.generateNextCode();
    return NextResponse.json({ code });
  } catch (error) {
    console.error("GET /api/parts/next-code error:", error);
    return NextResponse.json({ error: "生成编码失败" }, { status: 500 });
  }
}
