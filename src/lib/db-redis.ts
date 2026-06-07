import { Redis } from "@upstash/redis";
import { randomUUID } from "crypto";
import type {
  DatabaseAdapter, Part, PartDetail, Movement, Bom, BomItem, Warehouse, Category, Log,
  DashboardData, AlertsData, AnalyticsData, PartFilters, MovementFilters, LogFilters, BatchResult,
} from "./db";

export class RedisAdapter implements DatabaseAdapter {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }

  private ts(date?: string): number { return date ? new Date(date).getTime() : Date.now(); }

  private async safeExec(pipe: ReturnType<Redis["pipeline"]>): Promise<unknown[]> {
    try {
      return await pipe.exec();
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes("empty")) return [];
      throw e;
    }
  }

  // ── Dashboard & Analytics ──

  async getDashboard(): Promise<DashboardData> {
    const { parts: allParts, stock: allStock, movements: allMovements } = await this.loadCache();
    const today = new Date().toISOString().split("T")[0];
    const totalParts = allParts.length;
    let lowStockCount = 0;
    for (const p of allParts) { const s = allStock.get(p.id); if (p.minStock > 0 && (s?.quantity ?? 0) < p.minStock) lowStockCount++; }
    const todayMovements = allMovements.filter(m => m.createdAt >= today);
    const todayInCount = todayMovements.filter(m => m.type === "IN").length;
    const todayOutCount = todayMovements.filter(m => m.type === "OUT").length;
    const recentMovements = allMovements.slice(0, 10).map(m => { const p = allParts.find(pp => pp.id === m.partId); return { ...m, part: { id: m.partId, code: p?.code, name: p?.name, unit: p?.unit } }; });
    const partLastUsed = new Map<string, string>();
    for (const m of allMovements) { if (!partLastUsed.has(m.partId)) partLastUsed.set(m.partId, m.createdAt); }
    const recentParts = [...partLastUsed.entries()].sort((a, b) => b[1].localeCompare(a[1])).slice(0, 6).map(([pid, lastUsedAt]) => { const p = allParts.find(pp => pp.id === pid)!; const s = allStock.get(pid); return { id: p.id, code: p.code, name: p.name, category: p.category, unit: p.unit, stock: s?.quantity ?? 0, lastUsedAt }; });
    return { totalParts, lowStockCount, todayInCount, todayOutCount, recentMovements, recentParts };
  }

  async getAlerts(): Promise<AlertsData> {
    const { parts: allParts, stock: allStock, movements: allMovements } = await this.loadCache();
    const cutoff7 = new Date(Date.now() - 7 * 86400000).toISOString();
    const cutoff30 = new Date(Date.now() - 30 * 86400000).toISOString();
    const lowStockParts = allParts.filter(p => { const s = allStock.get(p.id); return p.minStock > 0 && (s?.quantity ?? 0) < p.minStock; }).map(p => { const s = allStock.get(p.id); const cs = s?.quantity ?? 0; return { ...p, currentStock: cs, stockPercentage: p.minStock > 0 ? Math.round(cs * 100 / p.minStock * 10) / 10 : 0 }; }).sort((a, b) => (a.currentStock / (a.minStock || 1)) - (b.currentStock / (b.minStock || 1)));
    const outOfStockParts = allParts.filter(p => (allStock.get(p.id)?.quantity ?? 0) === 0).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 20);
    const recent7 = allMovements.filter(m => m.createdAt >= cutoff7);
    const trendMap = new Map<string, { totalIn: number; totalOut: number; count: number }>();
    for (const m of recent7) { const d = m.createdAt.slice(0, 10); if (!trendMap.has(d)) trendMap.set(d, { totalIn: 0, totalOut: 0, count: 0 }); const t = trendMap.get(d)!; if (m.type === "IN") t.totalIn += m.quantity; else t.totalOut += m.quantity; t.count++; }
    const recentMovements = [...trendMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, t]) => ({ date, totalIn: t.totalIn, totalOut: t.totalOut, movementCount: t.count }));
    const recent30 = allMovements.filter(m => m.createdAt >= cutoff30);
    const activeMap = new Map<string, { count: number; totalIn: number; totalOut: number }>();
    for (const m of recent30) { if (!activeMap.has(m.partId)) activeMap.set(m.partId, { count: 0, totalIn: 0, totalOut: 0 }); const a = activeMap.get(m.partId)!; a.count++; if (m.type === "IN") a.totalIn += m.quantity; else a.totalOut += m.quantity; }
    const activeParts = [...activeMap.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 10).map(([pid, a]) => { const p = allParts.find(pp => pp.id === pid)!; return { id: p.id, code: p.code, name: p.name, category: p.category, movementCount: a.count, totalIn: a.totalIn, totalOut: a.totalOut }; });
    const totalParts = allParts.length;
    let outOfStockCount = 0, lowStockCount2 = 0;
    for (const p of allParts) { const s = allStock.get(p.id)?.quantity ?? 0; if (s === 0) outOfStockCount++; if (p.minStock > 0 && s < p.minStock) lowStockCount2++; }
    return { lowStockParts: lowStockParts as unknown as Record<string, unknown>[], outOfStockParts: outOfStockParts as unknown as Record<string, unknown>[], recentMovements: recentMovements as unknown as Record<string, unknown>[], activeParts: activeParts as unknown as Record<string, unknown>[], stats: { totalParts, outOfStockCount, lowStockCount: lowStockCount2, criticalCount: lowStockCount2 } };
  }

  async getAnalytics(period: number): Promise<AnalyticsData> {
    const { parts: allParts, stock: allStock, movements: allMovements } = await this.loadCache();
    const cutoff = new Date(Date.now() - period * 86400000).toISOString();
    const filtered = allMovements.filter(m => m.createdAt >= cutoff);
    const catMap = new Map<string, { partCount: number; totalStock: number; lowStockCount: number }>();
    for (const p of allParts) { if (!p.category) continue; if (!catMap.has(p.category)) catMap.set(p.category, { partCount: 0, totalStock: 0, lowStockCount: 0 }); const c = catMap.get(p.category)!; c.partCount++; const s = allStock.get(p.id)?.quantity ?? 0; c.totalStock += s; if (p.minStock > 0 && s < p.minStock) c.lowStockCount++; }
    const categoryStats = [...catMap.entries()].map(([category, c]) => ({ category, ...c })).sort((a, b) => b.partCount - a.partCount);
    const trendMap = new Map<string, { totalIn: number; totalOut: number; count: number }>();
    for (const m of filtered) { const d = m.createdAt.slice(0, 10); if (!trendMap.has(d)) trendMap.set(d, { totalIn: 0, totalOut: 0, count: 0 }); const t = trendMap.get(d)!; if (m.type === "IN") t.totalIn += m.quantity; else t.totalOut += m.quantity; t.count++; }
    const movementTrends = [...trendMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, t]) => ({ date, totalIn: t.totalIn, totalOut: t.totalOut, movementCount: t.count }));
    const topMap = new Map<string, { count: number; totalIn: number; totalOut: number }>();
    for (const m of filtered) { if (!topMap.has(m.partId)) topMap.set(m.partId, { count: 0, totalIn: 0, totalOut: 0 }); const a = topMap.get(m.partId)!; a.count++; if (m.type === "IN") a.totalIn += m.quantity; else a.totalOut += m.quantity; }
    const topMovedParts = [...topMap.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 10).map(([pid, a]) => { const p = allParts.find(pp => pp.id === pid)!; return { id: p.id, code: p.code, name: p.name, category: p.category, unit: p.unit, movementCount: a.count, totalIn: a.totalIn, totalOut: a.totalOut }; });
    const catStockMap = new Map<string, { totalQuantity: number; partCount: number }>();
    for (const p of allParts) { if (!p.category) continue; if (!catStockMap.has(p.category)) catStockMap.set(p.category, { totalQuantity: 0, partCount: 0 }); const c = catStockMap.get(p.category)!; c.totalQuantity += allStock.get(p.id)?.quantity ?? 0; c.partCount++; }
    const stockValueByCategory = [...catStockMap.entries()].map(([category, c]) => ({ category, ...c })).sort((a, b) => b.totalQuantity - a.totalQuantity);
    const typeMap = new Map<string, { count: number; totalQuantity: number }>();
    for (const m of filtered) { if (!typeMap.has(m.type)) typeMap.set(m.type, { count: 0, totalQuantity: 0 }); const t = typeMap.get(m.type)!; t.count++; t.totalQuantity += m.quantity; }
    const movementTypeDistribution = [...typeMap.entries()].map(([type, t]) => ({ type, ...t }));
    const dailyMap = new Map<string, { inQ: number; outQ: number; count: number }>();
    for (const m of filtered) { const d = m.createdAt.slice(0, 10); if (!dailyMap.has(d)) dailyMap.set(d, { inQ: 0, outQ: 0, count: 0 }); const dd = dailyMap.get(d)!; if (m.type === "IN") dd.inQ += m.quantity; else dd.outQ += m.quantity; dd.count++; }
    const dailies = [...dailyMap.values()];
    const dailyAverages = { avgIn: dailies.length ? Math.round(dailies.reduce((s, d) => s + d.inQ, 0) / dailies.length) : 0, avgOut: dailies.length ? Math.round(dailies.reduce((s, d) => s + d.outQ, 0) / dailies.length) : 0, avgCount: dailies.length ? Math.round(dailies.reduce((s, d) => s + d.count, 0) / dailies.length) : 0 };
    const distBuckets = { "无库存": 0, "1-10": 0, "11-50": 0, "51-100": 0, "100+": 0 };
    for (const p of allParts) { const s = allStock.get(p.id)?.quantity ?? 0; if (s === 0) distBuckets["无库存"]++; else if (s <= 10) distBuckets["1-10"]++; else if (s <= 50) distBuckets["11-50"]++; else if (s <= 100) distBuckets["51-100"]++; else distBuckets["100+"]++; }
    const stockDistribution = Object.entries(distBuckets).map(([range, count]) => ({ range, count }));
    return { categoryStats, movementTrends, topMovedParts, stockValueByCategory, movementTypeDistribution, dailyAverages, stockDistribution, period };
  }

  // ── Parts CRUD ──

  private _cache: { parts?: Part[]; stock?: Map<string, { quantity: number }>; movements?: Movement[] } = {};
  private _cacheTime = 0;

  private getAllPartsSync(): Part[] {
    if (this._cache.parts && Date.now() - this._cacheTime < 60000) return this._cache.parts;
    return [];
  }
  private getAllStockSync(): Map<string, { quantity: number }> {
    if (this._cache.stock && Date.now() - this._cacheTime < 60000) return this._cache.stock;
    return new Map();
  }
  private getAllMovementsSync(): Movement[] {
    if (this._cache.movements && Date.now() - this._cacheTime < 60000) return this._cache.movements;
    return [];
  }

  private async loadCache(): Promise<{ parts: Part[]; stock: Map<string, { quantity: number }>; movements: Movement[] }> {
    if (this._cache.parts && Date.now() - this._cacheTime < 60000) return this._cache as { parts: Part[]; stock: Map<string, { quantity: number }>; movements: Movement[] };
    const [partIds, movementIds] = await Promise.all([this.redis.zrange("parts_index", 0, -1, { rev: true }) as Promise<string[]>, this.redis.zrange("movements_index", 0, -1, { rev: true }) as Promise<string[]>]);
    const parts: Part[] = [];
    const stock = new Map<string, { quantity: number }>();
    const movements: Movement[] = [];
    if (partIds.length > 0 || movementIds.length > 0) {
      const pipe = this.redis.pipeline();
      for (const id of partIds) { pipe.hgetall(`parts:${id}`); pipe.hget(`stock:${id}`, "quantity"); }
      for (const mid of movementIds) { pipe.hgetall(`movements:${mid}`); }
      const results = await this.safeExec(pipe);
      let idx = 0;
      for (const id of partIds) {
        const partData = results[idx++] as Record<string, unknown> | null;
        const qty = results[idx++] as number | null;
        if (partData && partData.id) {
          const p: Part = { id: String(partData.id), code: String(partData.code), name: String(partData.name), category: String(partData.category || ""), package: String(partData.package || ""), brand: String(partData.brand || ""), model: String(partData.model || ""), unit: String(partData.unit || "pcs"), minStock: Number(partData.minStock) || 0, location: String(partData.location || ""), note: String(partData.note || ""), image: String(partData.image || ""), createdAt: String(partData.createdAt || ""), updatedAt: String(partData.updatedAt || ""), stock: { quantity: qty ?? 0 } };
          parts.push(p);
          stock.set(p.id, { quantity: qty ?? 0 });
        }
      }
      for (const mid of movementIds) {
        const mData = results[idx++] as Record<string, unknown> | null;
        if (mData && mData.id) { movements.push({ id: mData.id as string, partId: mData.partId as string, type: mData.type as string, quantity: Number(mData.quantity) || 0, operator: (mData.operator as string) || "", reason: (mData.reason as string) || "", code: (mData.code as string) || "", createdAt: (mData.createdAt as string) || "" }); }
      }
    }
    this._cache = { parts, stock, movements };
    this._cacheTime = Date.now();
    return { parts, stock, movements };
  }

  private invalidateCache() { this._cache = {}; this._cacheTime = 0; }

  async listParts(filters: PartFilters) {
    const { parts, stock } = await this.loadCache();
    let filtered = [...parts];
    if (filters.q) { const q = filters.q.toLowerCase(); filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.model.toLowerCase().includes(q) || p.location.toLowerCase().includes(q)); }
    if (filters.category) filtered = filtered.filter(p => p.category === filters.category);
    if (filters.package) filtered = filtered.filter(p => p.package === filters.package);
    if (filters.location) { const l = filters.location.toLowerCase(); filtered = filtered.filter(p => p.location.toLowerCase().includes(l)); }
    if (filters.brand) { const b = filters.brand.toLowerCase(); filtered = filtered.filter(p => p.brand.toLowerCase().includes(b)); }
    if (filters.stockMin !== undefined) filtered = filtered.filter(p => (stock.get(p.id)?.quantity ?? 0) >= filters.stockMin!);
    if (filters.stockMax !== undefined) filtered = filtered.filter(p => (stock.get(p.id)?.quantity ?? 0) <= filters.stockMax!);
    if (filters.hasStock === true) filtered = filtered.filter(p => (stock.get(p.id)?.quantity ?? 0) > 0);
    if (filters.lowStock === true) filtered = filtered.filter(p => p.minStock > 0 && (stock.get(p.id)?.quantity ?? 0) < p.minStock);
    filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const total = filtered.length;
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const start = (page - 1) * pageSize;
    return { parts: filtered.slice(start, start + pageSize), total };
  }

  async getPart(id: string): Promise<PartDetail | null> {
    const partData = await this.redis.hgetall(`parts:${id}`);
    if (!partData || !partData.id) return null;
    const qty = await this.redis.hget(`stock:${id}`, "quantity") as number ?? 0;
    const movementIds = await this.redis.zrange(`movements_by_part:${id}`, 0, 49, { rev: true }) as string[];
    const pipe = this.redis.pipeline();
    for (const mid of movementIds) pipe.hgetall(`movements:${mid}`);
    const movementData = await this.safeExec(pipe);
    const movements = movementData.filter(Boolean).map(m => m as unknown as Movement);
    return { id: String(partData.id), code: String(partData.code), name: String(partData.name), category: String(partData.category || ""), package: String(partData.package || ""), brand: String(partData.brand || ""), model: String(partData.model || ""), unit: String(partData.unit || "pcs"), minStock: Number(partData.minStock) || 0, location: String(partData.location || ""), note: String(partData.note || ""), image: String(partData.image || ""), createdAt: String(partData.createdAt || ""), updatedAt: String(partData.updatedAt || ""), stock: { quantity: qty }, movements };
  }

  async getPartByCode(code: string): Promise<Part | null> {
    const id = await this.redis.get(`parts_by_code:${code}`) as string | null;
    if (!id) return null;
    const part = await this.getPart(id);
    return part ? { ...part, movements: undefined } as Part : null;
  }

  async generateNextCode(): Promise<string> {
    const keys = await this.redis.keys("parts_by_code:z*");
    if (keys.length === 0) return "z001";
    let maxNum = 0;
    for (const key of keys) {
      const code = key.replace("parts_by_code:", "");
      const num = parseInt(code.slice(1), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
    return "z" + String(maxNum + 1).padStart(3, "0");
  }

  async createPart(data: Record<string, unknown>): Promise<Part> {
    const existing = await this.redis.get(`parts_by_code:${data.code}`) as string | null;
    if (existing) throw new Error("编码已存在");
    const id = randomUUID();
    const now = new Date().toISOString();
    const image = (data.image as string) || "";
    const pipe = this.redis.pipeline();
    pipe.hset(`parts:${id}`, { id, code: String(data.code), name: String(data.name), category: String(data.category || ""), package: String(data.package || ""), brand: String(data.brand || ""), model: String(data.model || ""), unit: String(data.unit || "pcs"), minStock: String(data.minStock || 0), location: String(data.location || ""), note: String(data.note || ""), image, createdAt: now, updatedAt: now });
    pipe.hset(`stock:${id}`, { quantity: "0", updatedAt: now });
    pipe.set(`parts_by_code:${data.code as string}`, id);
    pipe.zadd("parts_index", { score: this.ts(now), member: id });
    if (data.category) pipe.sadd(`parts_by_cat:${data.category as string}`, id);
    await this.safeExec(pipe);
    this.invalidateCache();
    return { id, code: data.code as string, name: data.name as string, category: (data.category as string) || "", package: (data.package as string) || "", brand: (data.brand as string) || "", model: (data.model as string) || "", unit: (data.unit as string) || "pcs", minStock: Number(data.minStock) || 0, location: (data.location as string) || "", note: (data.note as string) || "", image, createdAt: now, updatedAt: now, stock: { quantity: 0 } };
  }

  async updatePart(id: string, data: Record<string, unknown>): Promise<Part> {
    const existing = await this.redis.hgetall(`parts:${id}`);
    if (!existing || !existing.id) throw new Error("器件不存在");
    if (data.code && data.code !== existing.code) {
      const dup = await this.redis.get(`parts_by_code:${data.code}`) as string | null;
      if (dup) throw new Error("编码已存在");
      const pipe = this.redis.pipeline();
      pipe.del(`parts_by_code:${existing.code as string}`);
      pipe.set(`parts_by_code:${data.code as string}`, id);
      await this.safeExec(pipe);
    }
    const now = new Date().toISOString();
    const updateData: Record<string, string> = { updatedAt: now };
    for (const field of ["code", "name", "category", "package", "brand", "model", "unit", "minStock", "location", "note", "image"]) {
      if (data[field] !== undefined) updateData[field] = String(data[field]);
    }
    await this.redis.hset(`parts:${id}`, updateData);
    this.invalidateCache();
    return (await this.getPart(id))!;
  }

  async deletePart(id: string): Promise<void> {
    const part = await this.redis.hgetall(`parts:${id}`);
    if (!part || !part.id) return;
    const pipe = this.redis.pipeline();
    pipe.del(`parts:${id}`);
    pipe.del(`stock:${id}`);
    if (part.code) pipe.del(`parts_by_code:${part.code as string}`);
    pipe.zrem("parts_index", id);
    if (part.category) pipe.srem(`parts_by_cat:${part.category as string}`, id);
    const mIds = await this.redis.zrange(`movements_by_part:${id}`, 0, -1) as string[];
    for (const mid of mIds) { pipe.del(`movements:${mid}`); pipe.zrem("movements_index", mid); }
    pipe.del(`movements_by_part:${id}`);
    const fId = await this.redis.get(`fav_by_part:${id}`) as string | null;
    if (fId) { pipe.del(`favorites:${fId}`); pipe.del(`fav_by_part:${id}`); }
    await this.safeExec(pipe);
    try { const { deleteImage } = require("./image-store"); deleteImage(id); } catch {}
    this.invalidateCache();
  }

  // ── Movements ──

  async listMovements(filters: MovementFilters) {
    const { movements, parts: allParts } = await this.loadCache();
    let filtered = [...movements];
    if (filters.partId) filtered = filtered.filter(m => m.partId === filters.partId);
    if (filters.type) filtered = filtered.filter(m => m.type === filters.type);
    const total = filtered.length;
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 50;
    const start = (page - 1) * pageSize;
    const pageItems = filtered.slice(start, start + pageSize).map(m => { const p = allParts.find(pp => pp.id === m.partId); return { ...m, part: { code: p?.code || "", name: p?.name || "", unit: p?.unit || "" } }; });
    return { movements: pageItems, total };
  }

  async createMovement(data: Record<string, unknown>): Promise<{ id: string; newQuantity: number }> {
    const partData = await this.redis.hgetall(`parts:${data.partId as string}`);
    if (!partData || !partData.id) throw new Error("器件不存在");
    const currentQty = Number(await this.redis.hget(`stock:${data.partId as string}`, "quantity")) || 0;
    let newQty: number;
    if (data.type === "IN") { newQty = currentQty + (data.quantity as number); }
    else if (data.type === "OUT") { if (currentQty < (data.quantity as number)) throw new Error(`库存不足，当前库存 ${currentQty}，出库数量 ${data.quantity}`); newQty = currentQty - (data.quantity as number); }
    else { newQty = data.quantity as number; }
    const movementId = randomUUID();
    const now = new Date().toISOString();
    const pipe = this.redis.pipeline();
    pipe.hset(`movements:${movementId}`, { id: movementId, partId: data.partId, type: data.type, quantity: String(data.quantity), operator: data.operator || "", reason: data.reason || "", code: data.code || "", createdAt: now });
    pipe.zadd("movements_index", { score: this.ts(now), member: movementId });
    pipe.zadd(`movements_by_part:${data.partId as string}`, { score: this.ts(now), member: movementId });
    pipe.hset(`stock:${data.partId as string}`, { quantity: String(newQty), updatedAt: now });
    pipe.hset(`parts:${data.partId as string}`, { updatedAt: now });
    await this.safeExec(pipe);
    this.invalidateCache();
    return { id: movementId, newQuantity: newQty };
  }

  async batchDelete(ids: string[]): Promise<void> {
    for (const id of ids) await this.deletePart(id);
  }

  async batchUpdate(ids: string[], updates: Record<string, unknown>): Promise<void> {
    const now = new Date().toISOString();
    const updateData: Record<string, string> = { updatedAt: now };
    if (updates.category !== undefined) updateData.category = String(updates.category);
    if (updates.location !== undefined) updateData.location = String(updates.location);
    if (updates.minStock !== undefined) updateData.minStock = String(updates.minStock);
    const pipe = this.redis.pipeline();
    for (const id of ids) pipe.hset(`parts:${id}`, updateData);
    await this.safeExec(pipe);
    this.invalidateCache();
  }

  async batchMovement(items: Array<{ partId: string; quantity: number }>, type: "IN" | "OUT", operator?: string, reason?: string): Promise<BatchResult> {
    const results: BatchResult["results"] = [];
    for (const item of items) {
      try {
        const result = await this.createMovement({ partId: item.partId, type, quantity: item.quantity, operator, reason });
        results.push({ partId: item.partId, success: true, newQuantity: result.newQuantity });
      } catch (e) { results.push({ partId: item.partId, success: false, message: (e as Error).message }); }
    }
    return { results, successCount: results.filter(r => r.success).length, failCount: results.filter(r => !r.success).length };
  }

  async backfillImages(): Promise<BatchResult> {
    return { results: [], successCount: 0, failCount: 0 };
  }

  // ── Favorites ──

  async listFavorites(): Promise<Part[]> {
    const favIds = await this.redis.zrange("favorites_index", 0, -1, { rev: true }) as string[];
    const pipe = this.redis.pipeline();
    for (const fid of favIds) pipe.hgetall(`favorites:${fid}`);
    const favData = await this.safeExec(pipe);
    const parts: Part[] = [];
    for (let i = 0; i < favIds.length; i++) {
      const f = favData[i] as Record<string, unknown> | null;
      if (!f || !f.partId) continue;
      const part = await this.redis.hgetall(`parts:${f.partId as string}`);
      if (!part || !part.id) continue;
      const qty = Number(await this.redis.hget(`stock:${f.partId as string}`, "quantity")) || 0;
      parts.push({ id: part.id as string, code: part.code as string, name: part.name as string, category: (part.category as string) || "", unit: (part.unit as string) || "pcs", location: (part.location as string) || "", image: (part.image as string) || "", package: (part.package as string) || "", brand: (part.brand as string) || "", model: (part.model as string) || "", minStock: Number(part.minStock) || 0, note: (part.note as string) || "", createdAt: (part.createdAt as string) || "", updatedAt: (part.updatedAt as string) || "", stock: { quantity: qty }, favoritedAt: f.createdAt as string } as Part & { favoritedAt: string });
    }
    return parts;
  }

  async toggleFavorite(partId: string): Promise<{ favorited: boolean }> {
    const part = await this.redis.hgetall(`parts:${partId}`);
    if (!part || !part.id) throw new Error("器件不存在");
    const existingFavId = await this.redis.get(`fav_by_part:${partId}`) as string | null;
    if (existingFavId) {
      const pipe = this.redis.pipeline();
      pipe.del(`favorites:${existingFavId}`);
      pipe.del(`fav_by_part:${partId}`);
      pipe.zrem("favorites_index", existingFavId);
      await this.safeExec(pipe);
      return { favorited: false };
    } else {
      const favId = randomUUID();
      const now = new Date().toISOString();
      const pipe = this.redis.pipeline();
      pipe.hset(`favorites:${favId}`, { id: favId, partId, createdAt: now });
      pipe.set(`fav_by_part:${partId}`, favId);
      pipe.zadd("favorites_index", { score: this.ts(now), member: favId });
      await this.safeExec(pipe);
      return { favorited: true };
    }
  }

  // ── BOMs ──

  async listBoms(): Promise<Bom[]> {
    const bomIds = await this.redis.zrange("boms_index", 0, -1, { rev: true }) as string[];
    const pipe = this.redis.pipeline();
    for (const bid of bomIds) { pipe.hgetall(`boms:${bid}`); pipe.scard(`bom_items_by_bom:${bid}`); }
    const results = await this.safeExec(pipe);
    const boms: Bom[] = [];
    for (let i = 0; i < bomIds.length; i++) {
      const b = results[i * 2] as Record<string, unknown> | null;
      const ic = results[i * 2 + 1] as number;
      if (b && b.id) boms.push({ id: b.id as string, name: b.name as string, description: (b.description as string) || "", createdAt: (b.createdAt as string) || "", updatedAt: (b.updatedAt as string) || "", itemCount: ic });
    }
    return boms;
  }

  async getBom(id: string): Promise<(Bom & { items: BomItem[] }) | null> {
    const bom = await this.redis.hgetall(`boms:${id}`);
    if (!bom || !bom.id) return null;
    const itemIds = await this.redis.smembers(`bom_items_by_bom:${id}`) as string[];
    const pipe = this.redis.pipeline();
    for (const iid of itemIds) pipe.hgetall(`bom_items:${iid}`);
    const itemData = await this.safeExec(pipe);
    const items: BomItem[] = [];
    for (let i = 0; i < itemIds.length; i++) {
      const it = itemData[i] as Record<string, unknown> | null;
      if (!it || !it.id) continue;
      const part = await this.redis.hgetall(`parts:${it.partId as string}`);
      const qty = Number(await this.redis.hget(`stock:${it.partId as string}`, "quantity")) || 0;
      items.push({ id: it.id as string, bomId: it.bomId as string, partId: it.partId as string, quantity: Number(it.quantity) || 1, note: (it.note as string) || "", code: part?.code as string, name: part?.name as string, category: part?.category as string, unit: part?.unit as string, currentStock: qty });
    }
    items.sort((a, b) => (a.code || "").localeCompare(b.code || ""));
    return { id: bom.id as string, name: bom.name as string, description: (bom.description as string) || "", createdAt: (bom.createdAt as string) || "", updatedAt: (bom.updatedAt as string) || "", items };
  }

  async createBom(data: { name: string; description?: string; items?: Array<{ partId: string; quantity: number; note?: string }> }): Promise<Bom> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const pipe = this.redis.pipeline();
    pipe.hset(`boms:${id}`, { id, name: data.name, description: data.description || "", createdAt: now, updatedAt: now });
    pipe.zadd("boms_index", { score: this.ts(now), member: id });
    if (data.items) { for (const item of data.items) { const iid = randomUUID(); pipe.hset(`bom_items:${iid}`, { id: iid, bomId: id, partId: item.partId, quantity: String(item.quantity || 1), note: item.note || "" }); pipe.sadd(`bom_items_by_bom:${id}`, iid); } }
    await this.safeExec(pipe);
    this.invalidateCache();
    return { id, name: data.name, description: data.description || "", createdAt: now, updatedAt: now, itemCount: data.items?.length || 0 };
  }

  async updateBom(id: string, data: { name?: string; description?: string; items?: Array<{ partId: string; quantity: number; note?: string }> }): Promise<Bom & { items: BomItem[] }> {
    const bom = await this.redis.hgetall(`boms:${id}`);
    if (!bom || !bom.id) throw new Error("BOM不存在");
    const now = new Date().toISOString();
    const pipe = this.redis.pipeline();
    if (data.name !== undefined || data.description !== undefined) {
      const updates: Record<string, string> = { updatedAt: now };
      if (data.name !== undefined) updates.name = data.name;
      if (data.description !== undefined) updates.description = data.description;
      pipe.hset(`boms:${id}`, updates);
    }
    if (data.items) {
      const oldItemIds = await this.redis.smembers(`bom_items_by_bom:${id}`) as string[];
      for (const oid of oldItemIds) pipe.del(`bom_items:${oid}`);
      pipe.del(`bom_items_by_bom:${id}`);
      for (const item of data.items) { const iid = randomUUID(); pipe.hset(`bom_items:${iid}`, { id: iid, bomId: id, partId: item.partId, quantity: String(item.quantity || 1), note: item.note || "" }); pipe.sadd(`bom_items_by_bom:${id}`, iid); }
    }
    await this.safeExec(pipe);
    this.invalidateCache();
    return this.getBom(id) as Promise<Bom & { items: BomItem[] }>;
  }

  async deleteBom(id: string): Promise<void> {
    const bom = await this.redis.hgetall(`boms:${id}`);
    if (!bom || !bom.id) throw new Error("BOM不存在");
    const itemIds = await this.redis.smembers(`bom_items_by_bom:${id}`) as string[];
    const pipe = this.redis.pipeline();
    for (const iid of itemIds) pipe.del(`bom_items:${iid}`);
    pipe.del(`bom_items_by_bom:${id}`);
    pipe.del(`boms:${id}`);
    pipe.zrem("boms_index", id);
    await this.safeExec(pipe);
    this.invalidateCache();
  }

  // ── Warehouses ──

  async listWarehouses(): Promise<Warehouse[]> {
    const whIds = await this.redis.smembers("warehouses_index") as string[];
    const pipe = this.redis.pipeline();
    for (const wid of whIds) pipe.hgetall(`warehouses:${wid}`);
    const whData = await this.safeExec(pipe);
    const warehouses: Warehouse[] = [];
    for (let i = 0; i < whIds.length; i++) {
      const w = whData[i] as Record<string, unknown> | null;
      if (!w || !w.id) continue;
      const swIds = await this.redis.smembers(`stock_wh_by_wh:${w.id}`) as string[];
      let partCount = 0, totalStock = 0;
      for (const sid of swIds) { const sw = await this.redis.hgetall(`stock_wh:${sid}`); if (sw) { partCount++; totalStock += Number(sw.quantity) || 0; } }
      warehouses.push({ id: w.id as string, name: w.name as string, location: (w.location as string) || "", description: (w.description as string) || "", isDefault: Number(w.isDefault) || 0, createdAt: (w.createdAt as string) || "", updatedAt: (w.updatedAt as string) || "", partCount, totalStock });
    }
    warehouses.sort((a, b) => (b.isDefault - a.isDefault) || a.name.localeCompare(b.name));
    return warehouses;
  }

  async getWarehouse(id: string): Promise<(Warehouse & { items: Record<string, unknown>[] }) | null> {
    const w = await this.redis.hgetall(`warehouses:${id}`);
    if (!w || !w.id) return null;
    const swIds = await this.redis.smembers(`stock_wh_by_wh:${id}`) as string[];
    const items: Record<string, unknown>[] = [];
    for (const sid of swIds) {
      const sw = await this.redis.hgetall(`stock_wh:${sid}`);
      if (!sw || !sw.partId) continue;
      const part = await this.redis.hgetall(`parts:${sw.partId as string}`);
      if (part) items.push({ ...sw, code: part.code, name: part.name, category: part.category, unit: part.unit, location: part.location });
    }
    return { id: w.id as string, name: w.name as string, location: (w.location as string) || "", description: (w.description as string) || "", isDefault: Number(w.isDefault) || 0, createdAt: (w.createdAt as string) || "", updatedAt: (w.updatedAt as string) || "", items };
  }

  async createWarehouse(data: Record<string, unknown>): Promise<Warehouse> {
    const id = randomUUID();
    const now = new Date().toISOString();
    if (data.isDefault) { const allIds = await this.redis.smembers("warehouses_index") as string[]; const pipe = this.redis.pipeline(); for (const wid of allIds) pipe.hset(`warehouses:${wid}`, { isDefault: "0" }); await this.safeExec(pipe); }
    await this.redis.hset(`warehouses:${id}`, { id, name: data.name, location: data.location || "", description: data.description || "", isDefault: String(data.isDefault ? 1 : 0), createdAt: now, updatedAt: now });
    await this.redis.sadd("warehouses_index", id);
    return { id, name: data.name as string, location: (data.location as string) || "", description: (data.description as string) || "", isDefault: data.isDefault ? 1 : 0, createdAt: now, updatedAt: now };
  }

  async updateWarehouse(id: string, data: Record<string, unknown>): Promise<Warehouse> {
    const w = await this.redis.hgetall(`warehouses:${id}`);
    if (!w || !w.id) throw new Error("仓库不存在");
    const now = new Date().toISOString();
    if (data.isDefault) { const allIds = await this.redis.smembers("warehouses_index") as string[]; const pipe = this.redis.pipeline(); for (const wid of allIds) pipe.hset(`warehouses:${wid}`, { isDefault: "0" }); await this.safeExec(pipe); }
    const updates: Record<string, string> = { updatedAt: now };
    if (data.name !== undefined) updates.name = String(data.name);
    if (data.location !== undefined) updates.location = String(data.location);
    if (data.description !== undefined) updates.description = String(data.description);
    if (data.isDefault !== undefined) updates.isDefault = String(data.isDefault ? 1 : 0);
    await this.redis.hset(`warehouses:${id}`, updates);
    const updated = await this.redis.hgetall(`warehouses:${id}`);
    if (!updated || !updated.id) throw new Error("仓库更新失败");
    return { id: updated.id as string, name: updated.name as string, location: (updated.location as string) || "", description: (updated.description as string) || "", isDefault: Number(updated.isDefault) || 0, createdAt: (updated.createdAt as string) || "", updatedAt: (updated.updatedAt as string) || "" };
  }

  async deleteWarehouse(id: string): Promise<void> {
    const w = await this.redis.hgetall(`warehouses:${id}`);
    if (!w || !w.id) throw new Error("仓库不存在");
    if (Number(w.isDefault)) throw new Error("不能删除默认仓库");
    const swIds = await this.redis.smembers(`stock_wh_by_wh:${id}`) as string[];
    const pipe = this.redis.pipeline();
    for (const sid of swIds) { pipe.del(`stock_wh:${sid}`); pipe.srem(`stock_wh_by_wh:${id}`, sid); }
    pipe.del(`warehouses:${id}`);
    pipe.srem("warehouses_index", id);
    await this.safeExec(pipe);
  }

  // ── Settings ──

  async getSetting(key: string): Promise<string | null> {
    return (await this.redis.hget("settings", key)) as string | null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await this.redis.hset("settings", { [key]: value });
  }

  async listSettings(): Promise<Record<string, string>> {
    return (await this.redis.hgetall("settings")) as Record<string, string> || {};
  }

  // ── Categories ──

  async listCategories(): Promise<Category[]> {
    const catIds = await this.redis.zrange("categories_index", 0, -1) as string[];
    const categories: Category[] = [];
    for (const cid of catIds) {
      const c = await this.redis.hgetall(`categories:${cid}`);
      if (!c || !c.id) continue;
      const partIds = await this.redis.smembers(`parts_by_cat:${c.name}`) as string[];
      categories.push({ id: c.id as string, name: c.name as string, description: (c.description as string) || "", sortOrder: Number(c.sortOrder) || 0, createdAt: (c.createdAt as string) || "", partCount: partIds.length });
    }
    return categories;
  }

  async getCategory(id: string): Promise<Category | null> {
    const c = await this.redis.hgetall(`categories:${id}`);
    if (!c || !c.id) return null;
    const partIds = await this.redis.smembers(`parts_by_cat:${c.name}`) as string[];
    return { id: c.id as string, name: c.name as string, description: (c.description as string) || "", sortOrder: Number(c.sortOrder) || 0, createdAt: (c.createdAt as string) || "", partCount: partIds.length };
  }

  async createCategory(data: { name: string; description?: string }): Promise<Category> {
    const allCatIds = await this.redis.zrange("categories_index", 0, -1) as string[];
    for (const cid of allCatIds) { const c = await this.redis.hget(`categories:${cid}`, "name"); if (c === data.name.trim()) throw new Error("分类名称已存在"); }
    const id = randomUUID();
    const maxSort = allCatIds.length > 0 ? Number(await this.redis.hget(`categories:${allCatIds[allCatIds.length - 1]}`, "sortOrder")) || 0 : 0;
    const sortOrder = maxSort + 1;
    const now = new Date().toISOString();
    const pipe = this.redis.pipeline();
    pipe.hset(`categories:${id}`, { id, name: data.name.trim(), description: data.description || "", sortOrder: String(sortOrder), createdAt: now });
    pipe.zadd("categories_index", { score: sortOrder, member: id });
    await this.safeExec(pipe);
    return { id, name: data.name.trim(), description: data.description || "", sortOrder, createdAt: now, partCount: 0 };
  }

  async updateCategory(id: string, data: { name: string; description?: string; sortOrder?: number }): Promise<void> {
    const oldCat = await this.redis.hgetall(`categories:${id}`);
    if (!oldCat || !oldCat.id) throw new Error("分类不存在");
    const allCatIds = await this.redis.zrange("categories_index", 0, -1) as string[];
    for (const cid of allCatIds) { if (cid === id) continue; const n = await this.redis.hget(`categories:${cid}`, "name"); if (n === data.name.trim()) throw new Error("分类名称已存在"); }
    await this.redis.hset(`categories:${id}`, { name: data.name.trim(), description: data.description || "", sortOrder: String(data.sortOrder ?? 0) });
    if (oldCat.name !== data.name.trim()) {
      const partIds = await this.redis.smembers(`parts_by_cat:${oldCat.name as string}`) as string[];
      const pipe = this.redis.pipeline();
      for (const pid of partIds) pipe.hset(`parts:${pid}`, { category: data.name.trim() });
      if (partIds.length > 0) { pipe.del(`parts_by_cat:${oldCat.name as string}`); for (const pid of partIds) pipe.sadd(`parts_by_cat:${data.name.trim()}`, pid); }
      await this.safeExec(pipe);
    }
    this.invalidateCache();
  }

  async deleteCategory(id: string): Promise<void> {
    const cat = await this.redis.hgetall(`categories:${id}`);
    if (!cat || !cat.id) throw new Error("分类不存在");
    const partIds = await this.redis.smembers(`parts_by_cat:${cat.name as string}`) as string[];
    const pipe = this.redis.pipeline();
    for (const pid of partIds) pipe.hset(`parts:${pid}`, { category: "" });
    pipe.del(`parts_by_cat:${cat.name as string}`);
    pipe.del(`categories:${id}`);
    pipe.zrem("categories_index", id);
    await this.safeExec(pipe);
    this.invalidateCache();
  }

  // ── Logs ──

  async listLogs(filters: LogFilters) {
    const allLogIds = await this.redis.zrange("logs_index", 0, -1, { rev: true }) as string[];
    const pipe = this.redis.pipeline();
    for (const lid of allLogIds) pipe.hgetall(`logs:${lid}`);
    const logData = await this.safeExec(pipe);
    let logs: Log[] = logData.filter(Boolean).map(l => l as unknown as Log);
    if (filters.entityType) logs = logs.filter(l => l.entityType === filters.entityType);
    if (filters.action) logs = logs.filter(l => l.action === filters.action);
    const total = logs.length;
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 50;
    const start = (page - 1) * pageSize;
    return { logs: logs.slice(start, start + pageSize), total };
  }

  async logOperation(data: { action: string; entityType: string; entityId?: string; entityName?: string; details?: string; operator?: string }): Promise<void> {
    try {
      const id = randomUUID();
      const now = new Date().toISOString();
      const pipe = this.redis.pipeline();
      pipe.hset(`logs:${id}`, { id, action: data.action, entityType: data.entityType, entityId: data.entityId || "", entityName: data.entityName || "", details: data.details || "", operator: data.operator || "system", createdAt: now });
      pipe.zadd("logs_index", { score: this.ts(now), member: id });
      await this.safeExec(pipe);
    } catch (e) { console.error("Failed to log operation:", e); }
  }

  // ── Export ──

  async exportParts(): Promise<Record<string, unknown>[]> {
    const { parts, stock } = await this.loadCache();
    return parts.map(p => ({ code: p.code, name: p.name, category: p.category, package: p.package, brand: p.brand, model: p.model, unit: p.unit, minStock: p.minStock, location: p.location, note: p.note, stock: stock.get(p.id)?.quantity ?? 0 }));
  }

  async exportMovements(): Promise<Record<string, unknown>[]> {
    const { movements, parts } = await this.loadCache();
    return movements.map(m => { const p = parts.find(pp => pp.id === m.partId); return { type: m.type, quantity: m.quantity, operator: m.operator, reason: m.reason, code: m.code, createdAt: m.createdAt, partCode: p?.code || "", partName: p?.name || "" }; });
  }

  async importParts(rows: string[][], headers: string[]): Promise<{ imported: number; skipped: number; errors: string[] }> {
    const codeIndex = headers.indexOf("编码");
    const nameIndex = headers.indexOf("名称");
    if (codeIndex === -1 || nameIndex === -1) throw new Error("CSV 必须包含编码和名称列");
    let imported = 0, skipped = 0;
    const errors: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]; const code = row[codeIndex]; const name = row[nameIndex];
      if (!code || !name) { errors.push(`行 ${i + 2}: 编码或名称为空`); continue; }
      const existing = await this.redis.get(`parts_by_code:${code}`) as string | null;
      if (existing) { skipped++; continue; }
      const categoryIndex = headers.indexOf("分类");
      const packageIndex = headers.indexOf("封装");
      const brandIndex = headers.indexOf("品牌");
      const modelIndex = headers.indexOf("型号");
      const unitIndex = headers.indexOf("单位");
      const minStockIndex = headers.indexOf("最低库存");
      const locationIndex = headers.indexOf("仓位");
      const noteIndex = headers.indexOf("备注");
      await this.createPart({ code, name, category: categoryIndex >= 0 ? row[categoryIndex] : "", package: packageIndex >= 0 ? row[packageIndex] : "", brand: brandIndex >= 0 ? row[brandIndex] : "", model: modelIndex >= 0 ? row[modelIndex] : "", unit: unitIndex >= 0 ? row[unitIndex] : "pcs", minStock: minStockIndex >= 0 ? parseInt(row[minStockIndex]) || 0 : 0, location: locationIndex >= 0 ? row[locationIndex] : "", note: noteIndex >= 0 ? row[noteIndex] : "" });
      imported++;
    }
    return { imported, skipped, errors: errors.slice(0, 10) };
  }
}
