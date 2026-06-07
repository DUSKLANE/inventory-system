import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = 'force-dynamic';

// GET /api/export - export data
export async function GET(request: NextRequest) {
  const db = getDb();
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv";
    const type = searchParams.get("type") || "parts";

    if (type === "parts") {
      const parts = db.prepare(`
        SELECT p.code, p.name, p.category, p.package, p.brand, p.model, 
               p.unit, p.minStock, p.location, p.note,
               COALESCE(s.quantity, 0) as stock
        FROM parts p
        LEFT JOIN stock s ON s.partId = p.id
        ORDER BY p.code
      `).all() as Record<string, unknown>[];

      if (format === "csv") {
        const headers = ["编码", "名称", "分类", "封装", "品牌", "型号", "单位", "最低库存", "仓位", "备注", "当前库存"];
        const csvContent = [
          headers.join(","),
          ...parts.map(p => [
            `"${p.code}"`,
            `"${p.name}"`,
            `"${p.category || ""}"`,
            `"${p.package || ""}"`,
            `"${p.brand || ""}"`,
            `"${p.model || ""}"`,
            `"${p.unit || "pcs"}"`,
            p.minStock || 0,
            `"${p.location || ""}"`,
            `"${p.note || ""}"`,
            p.stock || 0,
          ].join(","))
        ].join("\n");

        return new NextResponse(csvContent, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename=parts_${new Date().toISOString().split("T")[0]}.csv`,
          },
        });
      }

      return NextResponse.json({ parts });
    }

    if (type === "movements") {
      const movements = db.prepare(`
        SELECT m.type, m.quantity, m.operator, m.reason, m.code, m.createdAt,
               p.code as partCode, p.name as partName
        FROM stock_movements m
        JOIN parts p ON p.id = m.partId
        ORDER BY m.createdAt DESC
      `).all() as Record<string, unknown>[];

      if (format === "csv") {
        const headers = ["类型", "数量", "经手人", "原因", "单号", "时间", "器件编码", "器件名称"];
        const csvContent = [
          headers.join(","),
          ...movements.map(m => [
            m.type === "IN" ? "入库" : "出库",
            m.quantity,
            `"${m.operator || ""}"`,
            `"${m.reason || ""}"`,
            `"${m.code || ""}"`,
            `"${m.createdAt}"`,
            `"${m.partCode}"`,
            `"${m.partName}"`,
          ].join(","))
        ].join("\n");

        return new NextResponse(csvContent, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename=movements_${new Date().toISOString().split("T")[0]}.csv`,
          },
        });
      }

      return NextResponse.json({ movements });
    }

    return NextResponse.json({ error: "未知导出类型" }, { status: 400 });
  } catch (error) {
    console.error("GET /api/export error:", error);
    return NextResponse.json({ error: "导出失败" }, { status: 500 });
  } finally {
    db.close();
  }
}

// POST /api/export - import data
export async function POST(request: NextRequest) {
  const db = getDb();
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string;

    if (!file) {
      return NextResponse.json({ error: "请选择文件" }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split("\n").filter(line => line.trim());
    
    if (lines.length < 2) {
      return NextResponse.json({ error: "文件内容为空" }, { status: 400 });
    }

    // Parse CSV
    const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
    const rows = lines.slice(1).map(line => {
      const values = line.match(/(".*?"|[^,]+)/g) || [];
      return values.map(v => v.trim().replace(/^"|"$/g, ""));
    });

    if (type === "parts") {
      const codeIndex = headers.indexOf("编码");
      const nameIndex = headers.indexOf("名称");
      const categoryIndex = headers.indexOf("分类");
      const packageIndex = headers.indexOf("封装");
      const brandIndex = headers.indexOf("品牌");
      const modelIndex = headers.indexOf("型号");
      const unitIndex = headers.indexOf("单位");
      const minStockIndex = headers.indexOf("最低库存");
      const locationIndex = headers.indexOf("仓位");
      const noteIndex = headers.indexOf("备注");

      if (codeIndex === -1 || nameIndex === -1) {
        return NextResponse.json({ error: "CSV 必须包含编码和名称列" }, { status: 400 });
      }

      const { randomUUID } = require("crypto");
      const now = new Date().toISOString();
      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      const transaction = db.transaction(() => {
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const code = row[codeIndex];
          const name = row[nameIndex];

          if (!code || !name) {
            errors.push(`行 ${i + 2}: 编码或名称为空`);
            continue;
          }

          // Check if part exists
          const existing = db.prepare("SELECT id FROM parts WHERE code = ?").get(code);
          if (existing) {
            skipped++;
            continue;
          }

          const id = randomUUID();
          const category = categoryIndex >= 0 ? row[categoryIndex] || "" : "";
          const pkg = packageIndex >= 0 ? row[packageIndex] || "" : "";
          const brand = brandIndex >= 0 ? row[brandIndex] || "" : "";
          const model = modelIndex >= 0 ? row[modelIndex] || "" : "";
          const unit = unitIndex >= 0 ? row[unitIndex] || "pcs" : "pcs";
          const minStock = minStockIndex >= 0 ? parseInt(row[minStockIndex]) || 0 : 0;
          const location = locationIndex >= 0 ? row[locationIndex] || "" : "";
          const note = noteIndex >= 0 ? row[noteIndex] || "" : "";

          db.prepare(`
            INSERT INTO parts (id, code, name, category, package, brand, model, unit, minStock, location, note, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(id, code, name, category, pkg, brand, model, unit, minStock, location, note, now, now);

          db.prepare("INSERT INTO stock (id, partId, quantity) VALUES (?, ?, 0)").run(randomUUID(), id);
          imported++;
        }
      });

      transaction();

      return NextResponse.json({
        success: true,
        message: `导入完成：成功 ${imported}，跳过 ${skipped}${errors.length > 0 ? `，失败 ${errors.length}` : ""}`,
        imported,
        skipped,
        errors: errors.slice(0, 10),
      });
    }

    return NextResponse.json({ error: "未知导入类型" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/export error:", error);
    return NextResponse.json({ error: "导入失败" }, { status: 500 });
  } finally {
    db.close();
  }
}
