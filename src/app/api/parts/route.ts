import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { partSchema, searchSchema } from "@/lib/validations";
import { randomUUID } from "crypto";

// GET /api/parts - list/search parts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = searchSchema.parse({
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

    let where = "WHERE 1=1";
    const queryParams: unknown[] = [];

    if (params.q) {
      where += " AND (p.name LIKE ? OR p.code LIKE ? OR p.brand LIKE ? OR p.model LIKE ? OR p.location LIKE ?)";
      const q = `%${params.q}%`;
      queryParams.push(q, q, q, q, q);
    }
    if (params.category) {
      where += " AND p.category = ?";
      queryParams.push(params.category);
    }
    if (params.package) {
      where += " AND p.package = ?";
      queryParams.push(params.package);
    }
    if (params.location) {
      where += " AND p.location LIKE ?";
      queryParams.push(`%${params.location}%`);
    }
    if (params.brand) {
      where += " AND p.brand LIKE ?";
      queryParams.push(`%${params.brand}%`);
    }
    if (params.stockMin !== undefined) {
      where += " AND COALESCE(s.quantity, 0) >= ?";
      queryParams.push(params.stockMin);
    }
    if (params.stockMax !== undefined) {
      where += " AND COALESCE(s.quantity, 0) <= ?";
      queryParams.push(params.stockMax);
    }
    if (params.hasStock === true) {
      where += " AND COALESCE(s.quantity, 0) > 0";
    }
    if (params.lowStock === true) {
      where += " AND p.minStock > 0 AND COALESCE(s.quantity, 0) < p.minStock";
    }

    const countSql = `SELECT COUNT(*) as total FROM parts p LEFT JOIN stock s ON s.partId = p.id ${where}`;
    const totalRow = db.prepare(countSql).get(...queryParams) as { total: number };
    const total = totalRow.total;

    const offset = (params.page - 1) * params.pageSize;
    const dataSql = `
      SELECT p.*, s.quantity as stockQuantity
      FROM parts p
      LEFT JOIN stock s ON s.partId = p.id
      ${where}
      ORDER BY p.updatedAt DESC
      LIMIT ? OFFSET ?
    `;
    const rawParts = db.prepare(dataSql).all(...queryParams, params.pageSize, offset) as Record<string, unknown>[];

    const parts = rawParts.map((p) => ({
      ...p,
      stock: { quantity: (p.stockQuantity as number) ?? 0 },
    }));

    return NextResponse.json({
      parts,
      total,
      page: params.page,
      pageSize: params.pageSize,
      totalPages: Math.ceil(total / params.pageSize),
    });
  } catch (error) {
    console.error("GET /api/parts error:", error);
    return NextResponse.json({ error: "获取器件列表失败" }, { status: 500 });
  }
}

// POST /api/parts - create part
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = partSchema.parse(body);

    const existing = db.prepare("SELECT id FROM parts WHERE code = ?").get(data.code);
    if (existing) {
      return NextResponse.json({ error: "编码已存在" }, { status: 400 });
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO parts (id, code, name, category, package, brand, model, unit, minStock, location, note, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.code, data.name, data.category, data.package, data.brand, data.model, data.unit, data.minStock, data.location, data.note, now, now);

    db.prepare("INSERT INTO stock (id, partId, quantity) VALUES (?, ?, 0)").run(randomUUID(), id);

    const part = db.prepare(`
      SELECT p.*, s.quantity as stockQuantity
      FROM parts p LEFT JOIN stock s ON s.partId = p.id
      WHERE p.id = ?
    `).get(id) as Record<string, unknown>;

    return NextResponse.json({ ...part, stock: { quantity: 0 } }, { status: 201 });
  } catch (error) {
    console.error("POST /api/parts error:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "参数校验失败", details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "创建器件失败" }, { status: 500 });
  }
}
