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

describe("listParts sorting", () => {
  it("按名称升序/降序排序", async () => {
    await db.createPart({ code: "Z0001", name: "Beta" });
    await db.createPart({ code: "Z0002", name: "Alpha" });
    await db.createPart({ code: "Z0003", name: "Gamma" });
    const asc = await db.listParts({ sortField: "name", sortOrder: "asc" });
    expect(asc.parts.map(p => p.name)).toEqual(["Alpha", "Beta", "Gamma"]);
    const desc = await db.listParts({ sortField: "name", sortOrder: "desc" });
    expect(desc.parts.map(p => p.name)).toEqual(["Gamma", "Beta", "Alpha"]);
  });

  it("按库存数量排序", async () => {
    await db.batchStockInUpsert([{ code: "Z0001", name: "A", quantity: 30 }]);
    await db.batchStockInUpsert([{ code: "Z0002", name: "B", quantity: 5 }]);
    const asc = await db.listParts({ sortField: "stock", sortOrder: "asc" });
    expect(asc.parts.map(p => p.code)).toEqual(["Z0002", "Z0001"]);
    const desc = await db.listParts({ sortField: "stock", sortOrder: "desc" });
    expect(desc.parts.map(p => p.code)).toEqual(["Z0001", "Z0002"]);
  });

  it("非白名单排序字段回退到 updatedAt 且不注入 SQL", async () => {
    await db.createPart({ code: "Z0001", name: "A" });
    await db.createPart({ code: "Z0002", name: "B" });
    const r = await db.listParts({ sortField: "id); DROP TABLE parts;--", sortOrder: "desc" });
    expect(r.parts.map(p => p.code).sort()).toEqual(["Z0001", "Z0002"]);
    expect(r.total).toBe(2);
    expect(db.getPartByCode("Z0001")).toBeDefined();
  });

  it("排序与分页同时生效", async () => {
    await db.createPart({ code: "Z0001", name: "E" });
    await db.createPart({ code: "Z0002", name: "B" });
    await db.createPart({ code: "Z0003", name: "A" });
    await db.createPart({ code: "Z0004", name: "D" });
    await db.createPart({ code: "Z0005", name: "C" });
    const page2 = await db.listParts({ sortField: "name", sortOrder: "asc", page: 2, pageSize: 2 });
    expect(page2.parts.map(p => p.name)).toEqual(["C", "D"]);
  });
});

describe("low_stock_threshold 设置", () => {
  it("未设置阈值时默认 10", async () => {
    await db.batchStockInUpsert([{ code: "Z0001", name: "A", quantity: 5 }]);
    const alerts = await db.getAlerts();
    expect(alerts.lowStockParts.some(p => p.code === "Z0001")).toBe(true);
    expect(alerts.stats.lowStockCount).toBe(1);
    const dash = await db.getDashboard();
    expect(dash.lowStockCount).toBe(1);
    await db.batchStockInUpsert([{ code: "Z0001", name: "A", quantity: 20 }]);
    const alerts2 = await db.getAlerts();
    expect(alerts2.lowStockParts.some(p => p.code === "Z0001")).toBe(false);
    expect(alerts2.stats.lowStockCount).toBe(0);
  });

  it("minStock=0 的器件按设置阈值判定低库存", async () => {
    await db.setSetting("low_stock_threshold", "50");
    await db.batchStockInUpsert([{ code: "Z0001", name: "A", quantity: 20 }]);
    const alerts = await db.getAlerts();
    expect(alerts.lowStockParts.some(p => p.code === "Z0001")).toBe(true);
    expect(alerts.stats.lowStockCount).toBe(1);
    expect((await db.getDashboard()).lowStockCount).toBe(1);
    const list = await db.listParts({ lowStock: true });
    expect(list.parts.some(p => p.code === "Z0001")).toBe(true);
  });

  it("minStock>0 时优先使用器件自身 minStock", async () => {
    await db.setSetting("low_stock_threshold", "50");
    await db.createPart({ code: "Z0001", name: "A", minStock: 10 });
    await db.batchStockInUpsert([{ code: "Z0001", name: "A", quantity: 20 }]);
    const alerts = await db.getAlerts();
    expect(alerts.lowStockParts.some(p => p.code === "Z0001")).toBe(false);
    await db.createPart({ code: "Z0002", name: "B", minStock: 10 });
    await db.batchStockInUpsert([{ code: "Z0002", name: "B", quantity: 5 }]);
    const alerts2 = await db.getAlerts();
    expect(alerts2.lowStockParts.some(p => p.code === "Z0002")).toBe(true);
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
