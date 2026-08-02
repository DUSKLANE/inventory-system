import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const categories = await db.listPartCategories();
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Failed to fetch part categories:", error);
    return NextResponse.json({ error: "获取分类失败" }, { status: 500 });
  }
}
