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
    const r = await db.batchStockInUpsert([{ code: "Z0001", name: "10K 电阻", quantity: 50 }]);
    expect(r.successCount).toBe(1);
    const part = await db.getPartByCode("Z0001");
    expect(part?.stock?.quantity).toBe(150);
    expect(part?.name).toBe("10K 电阻"); // 不覆盖已有信息
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
});
