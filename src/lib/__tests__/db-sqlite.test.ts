import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { SqliteAdapter } from "../db-sqlite";

let dir: string;
let db: SqliteAdapter;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "inv-test-"));
  process.env.SQLITE_DB_PATH = path.join(dir, "test.db");
  db = new SqliteAdapter();
});
afterEach(() => {
  db.close();
  fs.rmSync(dir, { recursive: true, force: true });
  delete process.env.SQLITE_DB_PATH;
});

describe("batchStockInUpsert", () => {
  it("新编码创建器件并入库", async () => {
    const r = await db.batchStockInUpsert([{ code: "Z0001", name: "10K 电阻", quantity: 100 }]);
    expect(r.successCount).toBe(1);
    const part = await db.getPartByCode("Z0001");
    expect(part?.stock?.quantity).toBe(100);
    const movements = await db.listMovements({ partId: part!.id });
    expect(movements.movements).toHaveLength(1);
    expect(movements.movements[0].type).toBe("IN");
  });

  it("已存在编码累加入库", async () => {
    await db.batchStockInUpsert([{ code: "Z0001", name: "10K 电阻", quantity: 100 }]);
    const r = await db.batchStockInUpsert([{ code: "Z0001", name: "10K 电阻 1%", quantity: 50 }]);
    expect(r.successCount).toBe(1);
    const part = await db.getPartByCode("Z0001");
    expect(part?.stock?.quantity).toBe(150);
    expect(part?.name).toBe("10K 电阻"); // 不覆盖已有信息（第二次传入不同名称）
  });

  it("部分失败不影响其他条目", async () => {
    const r = await db.batchStockInUpsert([
      { code: "Z0001", name: "A", quantity: 10 },
      { code: "Z0001", name: "B", quantity: 20 }, // 同批重复编码 → 第二条失败
    ]);
    expect(r.results[0].success).toBe(true);
    expect(r.results[1].success).toBe(false);
    expect(r.failCount).toBe(1);
    const part = await db.getPartByCode("Z0001");
    expect(part?.stock?.quantity).toBe(10); // 第一条已提交
  });

  it("条目级 SQL 失败不影响其他条目提交", async () => {
    const r = await db.batchStockInUpsert([
      { code: "Z0001", name: "A", quantity: 10 },
      { code: "Z0002", name: undefined as unknown as string, quantity: 20 },
    ]);
    expect(r.results[0].success).toBe(true);
    expect(r.results[1].success).toBe(false);
    expect(r.successCount).toBe(1);
    expect(r.failCount).toBe(1);
    const part = await db.getPartByCode("Z0001");
    expect(part?.stock?.quantity).toBe(10);
  });
});

describe("checkoutBomItems", () => {
  it("库存充足时批量出库成功", async () => {
    await db.batchStockInUpsert([{ code: "Z0001", name: "A", quantity: 100 }]);
    await db.batchStockInUpsert([{ code: "Z0002", name: "B", quantity: 50 }]);
    const a = await db.getPartByCode("Z0001");
    const b = await db.getPartByCode("Z0002");
    const r = await db.checkoutBomItems([
      { partId: a!.id, quantity: 10 },
      { partId: b!.id, quantity: 5 },
    ], "admin", "BOM 领料");
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.results).toHaveLength(2);
    expect((await db.getPartByCode("Z0001"))?.stock?.quantity).toBe(90);
    expect((await db.getPartByCode("Z0002"))?.stock?.quantity).toBe(45);
  });

  it("任一缺料则整体失败且不产生流水", async () => {
    await db.batchStockInUpsert([{ code: "Z0001", name: "A", quantity: 5 }]);
    const a = await db.getPartByCode("Z0001");
    const r = await db.checkoutBomItems([{ partId: a!.id, quantity: 10 }], "admin", "BOM 领料");
    expect(r.success).toBe(false);
    if (r.success) return;
    expect(r.insufficient[0]).toMatchObject({ partId: a!.id, required: 10, available: 5, shortfall: 5 });
    expect((await db.getPartByCode("Z0001"))?.stock?.quantity).toBe(5);
    const mv = await db.listMovements({ partId: a!.id });
    expect(mv.movements).toHaveLength(1); // 只有入库流水，无出库
  });
});
