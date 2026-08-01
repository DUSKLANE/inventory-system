import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { z } from "zod";
import { verifySessionToken, AUTH_COOKIE } from "@/lib/auth";
import { logOperation } from "@/lib/logger";

export const dynamic = "force-dynamic";

const checkoutSchema = z.object({
  items: z.array(z.object({
    partId: z.string().min(1),
    quantity: z.number().int().positive(),
  })).min(1),
  reason: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { items, reason } = checkoutSchema.parse(body);
    const sessionUser = await verifySessionToken(request.cookies.get(AUTH_COOKIE)?.value);
    const result = await db.checkoutBomItems(items, sessionUser || "", reason || "BOM 领料");
    if (!result.success) {
      return NextResponse.json({ success: false, error: "库存不足", insufficient: result.insufficient }, { status: 409 });
    }
    logOperation({ action: "CHECKOUT", entityType: "BOM", entityId: id, details: `BOM 领料出库 ${result.results.length} 项` });
    return NextResponse.json({ success: true, results: result.results });
  } catch (error) {
    console.error("POST /api/boms/[id]/checkout error:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "参数校验失败", details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "领料失败" }, { status: 500 });
  }
}
