import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv";
    const type = searchParams.get("type") || "parts";

    if (type === "parts") {
      const parts = await db.exportParts();
      if (format === "csv") {
        const headers = ["编码", "名称", "分类", "封装", "品牌", "型号", "单位", "最低库存", "仓位", "备注", "当前库存"];
        const csvContent = [headers.join(","), ...parts.map(p => [`"${p.code}"`, `"${p.name}"`, `"${p.category || ""}"`, `"${p.package || ""}"`, `"${p.brand || ""}"`, `"${p.model || ""}"`, `"${p.unit || "pcs"}"`, p.minStock || 0, `"${p.location || ""}"`, `"${p.note || ""}"`, p.stock || 0].join(","))].join("\n");
        return new NextResponse(csvContent, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename=parts_${new Date().toISOString().split("T")[0]}.csv` } });
      }
      return NextResponse.json({ parts });
    }

    if (type === "movements") {
      const movements = await db.exportMovements();
      if (format === "csv") {
        const headers = ["类型", "数量", "经手人", "原因", "单号", "时间", "器件编码", "器件名称"];
        const csvContent = [headers.join(","), ...movements.map(m => [m.type === "IN" ? "入库" : "出库", m.quantity, `"${m.operator || ""}"`, `"${m.reason || ""}"`, `"${m.code || ""}"`, `"${m.createdAt}"`, `"${m.partCode}"`, `"${m.partName}"`].join(","))].join("\n");
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
    const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
    const rows = lines.slice(1).map(line => { const values = line.match(/(".*?"|[^,]+)/g) || []; return values.map(v => v.trim().replace(/^"|"$/g, "")); });

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
