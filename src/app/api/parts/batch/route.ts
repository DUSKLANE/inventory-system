import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { z } from "zod";
import { verifySessionToken, AUTH_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

const batchDeleteSchema = z.object({ ids: z.array(z.string()).min(1) });
const batchUpdateSchema = z.object({ ids: z.array(z.string()).min(1), updates: z.object({ category: z.string().optional(), location: z.string().optional(), minStock: z.number().optional() }) });
const batchMovementSchema = z.object({ items: z.array(z.object({ partId: z.string(), quantity: z.number().positive() })).min(1), type: z.enum(["IN", "OUT"]), operator: z.string().optional(), reason: z.string().optional() });
const stockInUpsertSchema = z.object({
  items: z.array(z.object({
    code: z.string().min(1),
    name: z.string().min(1),
    category: z.string().optional().default(""),
    package: z.string().optional().default(""),
    brand: z.string().optional().default(""),
    model: z.string().optional().default(""),
    unit: z.string().optional().default("pcs"),
    location: z.string().optional().default(""),
    orderCode: z.string().optional().default(""),
    quantity: z.number().int().positive(),
  })).min(1),
  reason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;

    if (action === "delete") {
      const { ids } = batchDeleteSchema.parse(body);
      await db.batchDelete(ids);
      return NextResponse.json({ success: true, message: `成功删除 ${ids.length} 个器件`, deletedCount: ids.length });
    }

    if (action === "update") {
      const { ids, updates } = batchUpdateSchema.parse(body);
      await db.batchUpdate(ids, updates);
      return NextResponse.json({ success: true, message: `成功更新 ${ids.length} 个器件`, updatedCount: ids.length });
    }

    if (action === "movement") {
      const { items, type, operator, reason } = batchMovementSchema.parse(body);
      const sessionUser = await verifySessionToken(request.cookies.get(AUTH_COOKIE)?.value);
      const effectiveOperator = sessionUser || operator || "";
      const result = await db.batchMovement(items, type, effectiveOperator, reason);
      return NextResponse.json({ success: true, message: `批量${type === "IN" ? "入库" : "出库"}完成：成功 ${result.successCount}，失败 ${result.failCount}`, ...result });
    }

    if (action === "stock-in-upsert") {
      const { items, reason } = stockInUpsertSchema.parse(body);
      const sessionUser = await verifySessionToken(request.cookies.get(AUTH_COOKIE)?.value);
      const result = await db.batchStockInUpsert(items, sessionUser || "", reason || "扫码入库");
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ error: "未知操作" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/parts/batch error:", error);
    if (error instanceof Error && error.name === "ZodError") return NextResponse.json({ error: "参数校验失败", details: error.message }, { status: 400 });
    return NextResponse.json({ error: "批量操作失败" }, { status: 500 });
  }
}
