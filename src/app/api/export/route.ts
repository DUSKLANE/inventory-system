import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

function csvEscape(value: unknown): string {
  const s = String(value ?? "");
  // 防止 Excel 公式注入：以 = + - @ 等开头的值前缀单引号
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

function toCsv(headers: string[], rows: Array<Array<string | number>>): string {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(","));
  }
  // 加 BOM 保证 Excel 正确识别 UTF-8 中文
  return `\uFEFF${lines.join("\n")}`;
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = false;
      } else current += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      values.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  values.push(current);
  return values;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv";
    const type = searchParams.get("type") || "parts";

    if (type === "parts") {
      const parts = await db.exportParts();
      if (format === "csv") {
        const headers = ["编码", "名称", "分类", "封装", "品牌", "型号", "单位", "最低库存", "仓位", "备注", "当前库存"];
        const rows = parts.map(p => [p.code, p.name, p.category || "", p.package || "", p.brand || "", p.model || "", p.unit || "pcs", p.minStock || 0, p.location || "", p.note || "", p.stock || 0] as Array<string | number>);
        const csvContent = toCsv(headers, rows);
        return new NextResponse(csvContent, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename=parts_${new Date().toISOString().split("T")[0]}.csv` } });
      }
      return NextResponse.json({ parts });
    }

    if (type === "movements") {
      const movements = await db.exportMovements();
      if (format === "csv") {
        const headers = ["类型", "数量", "经手人", "原因", "单号", "时间", "器件编码", "器件名称"];
        const rows = movements.map(m => [m.type === "IN" ? "入库" : "出库", m.quantity, m.operator || "", m.reason || "", m.code || "", m.createdAt, m.partCode, m.partName] as Array<string | number>);
        const csvContent = toCsv(headers, rows);
        return new NextResponse(csvContent, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename=movements_${new Date().toISOString().split("T")[0]}.csv` } });
      }
      return NextResponse.json({ movements });
    }

    return NextResponse.json({ error: "未知导出类型" }, { status: 400 });
  } catch (error) {
    console.error("GET /api/export error:", error);
    return NextResponse.json({ error: "导出失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string;
    if (!file) return NextResponse.json({ error: "请选择文件" }, { status: 400 });
    const text = await file.text();
    const lines = text.split("\n").filter(line => line.trim());
    if (lines.length < 2) return NextResponse.json({ error: "文件内容为空" }, { status: 400 });
    const headers = parseCsvLine(lines[0].replace(/^\uFEFF/, "")).map(h => h.trim().replace(/^"|"$/g, ""));
    const rows = lines.slice(1).map(line => parseCsvLine(line).map(v => v.trim().replace(/^"|"$/g, "")));

    if (type === "parts") {
      const result = await db.importParts(rows, headers);
      return NextResponse.json({ success: true, message: `导入完成：成功 ${result.imported}，跳过 ${result.skipped}${result.errors.length > 0 ? `，失败 ${result.errors.length}` : ""}`, ...result });
    }
    return NextResponse.json({ error: "未知导入类型" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/export error:", error);
    if (error instanceof Error && error.message.includes("CSV")) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "导入失败" }, { status: 500 });
  }
}
