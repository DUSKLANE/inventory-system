import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { z } from "zod";
import { randomUUID } from "crypto";
import { downloadImage, fetchProductImage, getImageFilename } from "@/lib/image-store";

const batchDeleteSchema = z.object({
  ids: z.array(z.string()).min(1, "至少选择一个器件"),
});

const batchUpdateSchema = z.object({
  ids: z.array(z.string()).min(1, "至少选择一个器件"),
  updates: z.object({
    category: z.string().optional(),
    location: z.string().optional(),
    minStock: z.number().optional(),
  }),
});

const batchMovementSchema = z.object({
  items: z.array(z.object({
    partId: z.string(),
    quantity: z.number().positive("数量必须大于0"),
  })).min(1, "至少选择一个器件"),
  type: z.enum(["IN", "OUT"]),
  operator: z.string().optional(),
  reason: z.string().optional(),
});

// POST /api/parts/batch - batch operations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;

    if (action === "delete") {
      const { ids } = batchDeleteSchema.parse(body);
      const now = new Date().toISOString();

      const transaction = db.transaction(() => {
        for (const id of ids) {
          db.prepare("DELETE FROM stock_movements WHERE partId = ?").run(id);
          db.prepare("DELETE FROM stock WHERE partId = ?").run(id);
          db.prepare("DELETE FROM parts WHERE id = ?").run(id);
        }
      });

      transaction();

      return NextResponse.json({
        success: true,
        message: `成功删除 ${ids.length} 个器件`,
        deletedCount: ids.length,
      });
    }

    if (action === "update") {
      const { ids, updates } = batchUpdateSchema.parse(body);
      const now = new Date().toISOString();

      const setClauses: string[] = ["updatedAt = ?"];
      const params: unknown[] = [now];

      if (updates.category !== undefined) {
        setClauses.push("category = ?");
        params.push(updates.category);
      }
      if (updates.location !== undefined) {
        setClauses.push("location = ?");
        params.push(updates.location);
      }
      if (updates.minStock !== undefined) {
        setClauses.push("minStock = ?");
        params.push(updates.minStock);
      }

      const sql = `UPDATE parts SET ${setClauses.join(", ")} WHERE id = ?`;

      const transaction = db.transaction(() => {
        for (const id of ids) {
          db.prepare(sql).run(...params, id);
        }
      });

      transaction();

      return NextResponse.json({
        success: true,
        message: `成功更新 ${ids.length} 个器件`,
        updatedCount: ids.length,
      });
    }

    if (action === "movement") {
      const { items, type, operator, reason } = batchMovementSchema.parse(body);
      const now = new Date().toISOString();
      const results: Array<{ partId: string; success: boolean; message?: string; newQuantity?: number }> = [];

      const transaction = db.transaction(() => {
        for (const item of items) {
          const part = db.prepare(`
            SELECT p.*, s.quantity as stockQuantity
            FROM parts p LEFT JOIN stock s ON s.partId = p.id
            WHERE p.id = ?
          `).get(item.partId) as Record<string, unknown> | undefined;

          if (!part) {
            results.push({ partId: item.partId, success: false, message: "器件不存在" });
            continue;
          }

          const currentQty = (part.stockQuantity as number) ?? 0;
          let newQty: number;

          if (type === "IN") {
            newQty = currentQty + item.quantity;
          } else {
            if (currentQty < item.quantity) {
              results.push({
                partId: item.partId,
                success: false,
                message: `库存不足，当前 ${currentQty}，需要 ${item.quantity}`,
              });
              continue;
            }
            newQty = currentQty - item.quantity;
          }

          const movementId = randomUUID();

          db.prepare(`
            INSERT INTO stock_movements (id, partId, type, quantity, operator, reason, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(movementId, item.partId, type, item.quantity, operator || "", reason || "", now);

          db.prepare(`UPDATE stock SET quantity = ?, updatedAt = ? WHERE partId = ?`).run(newQty, now, item.partId);
          db.prepare(`UPDATE parts SET updatedAt = ? WHERE id = ?`).run(now, item.partId);

          results.push({ partId: item.partId, success: true, newQuantity: newQty });
        }
      });

      transaction();

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      return NextResponse.json({
        success: true,
        message: `批量${type === "IN" ? "入库" : "出库"}完成：成功 ${successCount}，失败 ${failCount}`,
        results,
        successCount,
        failCount,
      });
    }

    if (action === "backfillImages") {
      const { ids } = batchDeleteSchema.parse(body);
      const results: Array<{ partId: string; success: boolean; message?: string }> = [];

      for (const id of ids) {
        const part = db.prepare("SELECT id, code, image FROM parts WHERE id = ?").get(id) as { id: string; code: string; image: string } | undefined;

        if (!part) {
          results.push({ partId: id, success: false, message: "器件不存在" });
          continue;
        }

        if (part.image) {
          results.push({ partId: id, success: true, message: "已有图片" });
          continue;
        }

        try {
          const imageUrl = await fetchProductImage(part.code);
          if (!imageUrl) {
            results.push({ partId: id, success: false, message: "未找到产品图片" });
            continue;
          }

          const filename = await downloadImage(id, imageUrl);
          if (filename) {
            db.prepare("UPDATE parts SET image = ?, updatedAt = ? WHERE id = ?").run(filename, new Date().toISOString(), id);
            results.push({ partId: id, success: true });
          } else {
            results.push({ partId: id, success: false, message: "图片下载失败" });
          }
        } catch {
          results.push({ partId: id, success: false, message: "处理失败" });
        }

        // Small delay between requests to avoid rate limiting
        await new Promise((r) => setTimeout(r, 200));
      }

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      return NextResponse.json({
        success: true,
        message: `补全图片完成：成功 ${successCount}，失败 ${failCount}`,
        results,
        successCount,
        failCount,
      });
    }

    return NextResponse.json({ error: "未知操作" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/parts/batch error:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "参数校验失败", details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "批量操作失败" }, { status: 500 });
  }
}
