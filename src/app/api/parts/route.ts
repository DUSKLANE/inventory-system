import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { partSchema, searchSchema } from "@/lib/validations";
import { logOperation } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = searchSchema.parse({
      q: searchParams.get("q") || undefined,
      category: searchParams.get("category") || undefined,
      package: searchParams.get("package") || undefined,
      location: searchParams.get("location") || undefined,
      brand: searchParams.get("brand") || undefined,
      stockMin: searchParams.get("stockMin") || undefined,
      stockMax: searchParams.get("stockMax") || undefined,
      hasStock: searchParams.get("hasStock") || undefined,
      lowStock: searchParams.get("lowStock") || undefined,
      page: searchParams.get("page") || "1",
      pageSize: searchParams.get("pageSize") || "20",
    });
    const result = await db.listParts(filters);
    return NextResponse.json({
      parts: result.parts,
      total: result.total,
      page: filters.page,
      pageSize: filters.pageSize,
      totalPages: Math.ceil(result.total / filters.pageSize),
    });
  } catch (error) {
    console.error("GET /api/parts error:", error);
    return NextResponse.json({ error: "获取器件列表失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = partSchema.parse(body);
    const part = await db.createPart(data);
    logOperation({ action: "CREATE", entityType: "PART", entityId: part.id, entityName: data.name, details: `创建器件: ${data.code} - ${data.name}` });
    return NextResponse.json({ ...part, stock: { quantity: 0 } }, { status: 201 });
  } catch (error) {
    console.error("POST /api/parts error:", error);
    if (error instanceof Error) {
      if (error.name === "ZodError") return NextResponse.json({ error: "参数校验失败", details: error.message }, { status: 400 });
      if (error.message === "编码已存在") return NextResponse.json({ error: "编码已存在" }, { status: 400 });
    }
    return NextResponse.json({ error: "创建器件失败" }, { status: 500 });
  }
}
