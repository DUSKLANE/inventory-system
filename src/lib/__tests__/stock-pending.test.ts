import { describe, it, expect } from "vitest";
import {
  normalizeMode, isDuplicateScan, migrateLegacyItems, migratePendingKey,
  loadPendingItems, savePendingItems, buildStockInPayload, buildStockOutPayload,
  applyBatchResults, type StockItem,
} from "../stock-pending";

const baseItem = (over: Partial<StockItem> = {}): StockItem => ({
  id: "i1", code: "C12345", name: "10KΩ 电阻", category: "电阻", package: "0603",
  brand: "UniOhm", model: "0603W", unit: "pcs", location: "A1-2", orderCode: "ON001",
  quantity: 100, status: "ready",
  ...over,
});

describe("normalizeMode", () => {
  it("默认入库", () => {
    expect(normalizeMode(null)).toBe("IN");
    expect(normalizeMode(undefined)).toBe("IN");
  });
  it("合法值", () => {
    expect(normalizeMode("IN")).toBe("IN");
    expect(normalizeMode("OUT")).toBe("OUT");
  });
  it("非法值回退入库", () => {
    expect(normalizeMode("FOO")).toBe("IN");
    expect(normalizeMode("")).toBe("IN");
  });
});

describe("isDuplicateScan", () => {
  it("同码 1 秒窗口内视为重复", () => {
    expect(isDuplicateScan({ code: "C1", time: 1000 }, "C1", 1500)).toBe(true);
  });
  it("同码恰好 1000ms 不算重复", () => {
    expect(isDuplicateScan({ code: "C1", time: 1000 }, "C1", 2000)).toBe(false);
  });
  it("异码不算重复", () => {
    expect(isDuplicateScan({ code: "C1", time: 1000 }, "C2", 1200)).toBe(false);
  });
  it("无历史不算重复", () => {
    expect(isDuplicateScan(null, "C1", 1000)).toBe(false);
  });
});

describe("migrateLegacyItems", () => {
  it("非数组返回空数组", () => {
    expect(migrateLegacyItems(null)).toEqual([]);
    expect(migrateLegacyItems({})).toEqual([]);
  });
  it("无 pc 的条目被丢弃", () => {
    expect(migrateLegacyItems([{ id: "x", scanData: {} }])).toEqual([]);
  });
  it("完整旧条目映射为新结构", () => {
    const result = migrateLegacyItems([
      {
        id: "old1",
        scanData: { pc: "C1", pm: "旧名", on: "ON9", qty: "3" },
        productInfo: { name: "LCEDA 名", category: "电容", package: "0402", brand: "B", model: "M", unit: "pcs" },
        existingPartId: "p1",
        location: "B2",
        quantity: 5,
        customName: "",
      },
    ]);
    expect(result[0]).toEqual({
      id: "old1", code: "C1", partId: "p1", name: "LCEDA 名", category: "电容",
      package: "0402", brand: "B", model: "M", unit: "pcs", location: "B2",
      orderCode: "ON9", quantity: 5, status: "ready",
    });
  });
  it("customName 优先于 productInfo.name", () => {
    const result = migrateLegacyItems([
      { id: "old1", scanData: { pc: "C1" }, productInfo: { name: "X" }, customName: "我改的名", quantity: 1 },
    ]);
    expect(result[0].name).toBe("我改的名");
  });
});

describe("migratePendingKey", () => {
  const makeStorage = (init: Record<string, string>) => {
    const map = new Map(Object.entries(init));
    return {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
      dump: () => Object.fromEntries(map),
    };
  };

  it("新键已有数据则不动", () => {
    const s = makeStorage({ new: "X", old: "Y" });
    migratePendingKey(s, "new", "old");
    expect(s.dump()).toEqual({ new: "X", old: "Y" });
  });
  it("新键为空且有旧键则迁移并删除旧键", () => {
    const s = makeStorage({ old: "Y" });
    migratePendingKey(s, "new", "old");
    expect(s.dump()).toEqual({ new: "Y" });
  });
  it("两者都为空则无事发生", () => {
    const s = makeStorage({});
    migratePendingKey(s, "new", "old");
    expect(s.dump()).toEqual({});
  });
});

describe("loadPendingItems / savePendingItems", () => {
  it("存取往返", () => {
    const map = new Map<string, string>();
    const storage = {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
    };
    const items = [baseItem()];
    savePendingItems(storage, "key", items);
    expect(loadPendingItems(storage, "key")).toEqual(items);
  });
  it("坏 JSON 返回空数组", () => {
    const storage = { getItem: () => "{{{" as string | null };
    expect(loadPendingItems(storage, "key")).toEqual([]);
  });
  it("非数组返回空数组", () => {
    const storage = { getItem: () => '{"a":1}' as string | null };
    expect(loadPendingItems(storage, "key")).toEqual([]);
  });
});

describe("buildStockInPayload", () => {
  it("映射 stock-in-upsert 请求体", () => {
    expect(buildStockInPayload([baseItem()], "采购")).toEqual({
      action: "stock-in-upsert",
      reason: "采购",
      items: [
        {
          code: "C12345", name: "10KΩ 电阻", category: "电阻", package: "0603",
          brand: "UniOhm", model: "0603W", unit: "pcs", location: "A1-2",
          orderCode: "ON001", quantity: 100,
        },
      ],
    });
  });
});

describe("buildStockOutPayload", () => {
  it("映射 movement OUT 请求体", () => {
    expect(buildStockOutPayload([baseItem({ partId: "p1" })], "领用")).toEqual({
      action: "movement",
      type: "OUT",
      reason: "领用",
      items: [{ partId: "p1", quantity: 100 }],
    });
  });
});

describe("applyBatchResults", () => {
  it("按 partId 匹配移除成功项", () => {
    const items = [baseItem({ id: "a", partId: "p1" }), baseItem({ id: "b", partId: "p2" })];
    const { removed, kept } = applyBatchResults(items, [
      { partId: "p1", success: true },
      { partId: "p2", success: false, message: "库存不足" },
    ]);
    expect(removed.map((i) => i.id)).toEqual(["a"]);
    expect(kept.map((i) => i.id)).toEqual(["b"]);
  });
  it("按 code 匹配（入库 upsert 结果）", () => {
    const items = [baseItem({ id: "a" }), baseItem({ id: "b", code: "C2" })];
    const { removed } = applyBatchResults(items, [
      { code: "C12345", success: true },
      { code: "C2", success: false },
    ]);
    expect(removed.map((i) => i.id)).toEqual(["a"]);
  });
  it("结果为空时不移除任何项", () => {
    const items = [baseItem()];
    const { removed, kept } = applyBatchResults(items, []);
    expect(removed).toEqual([]);
    expect(kept).toEqual(items);
  });
});
