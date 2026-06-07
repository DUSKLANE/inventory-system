import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import type {
  DatabaseAdapter, Part, PartDetail, Movement, Bom, BomItem, Warehouse, Category, Log,
  DashboardData, AlertsData, AnalyticsData, PartFilters, MovementFilters, LogFilters, BatchResult,
} from "./db";

export class SqliteAdapter implements DatabaseAdapter {
  private db: Database.Database;

  constructor() {
    const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), "data", "inventory.db");
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.initTables();
    this.migrate();
  }

  private initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS parts (id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL, category TEXT DEFAULT '', package TEXT DEFAULT '', brand TEXT DEFAULT '', model TEXT DEFAULT '', unit TEXT DEFAULT 'pcs', minStock INTEGER DEFAULT 0, location TEXT DEFAULT '', note TEXT DEFAULT '', image TEXT DEFAULT '', createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS stock (id TEXT PRIMARY KEY, partId TEXT UNIQUE NOT NULL, quantity INTEGER DEFAULT 0, updatedAt TEXT DEFAULT (datetime('now')), FOREIGN KEY (partId) REFERENCES parts(id) ON DELETE CASCADE);
      CREATE TABLE IF NOT EXISTS stock_movements (id TEXT PRIMARY KEY, partId TEXT NOT NULL, type TEXT NOT NULL, quantity INTEGER NOT NULL, operator TEXT DEFAULT '', reason TEXT DEFAULT '', code TEXT DEFAULT '', createdAt TEXT DEFAULT (datetime('now')), FOREIGN KEY (partId) REFERENCES parts(id) ON DELETE CASCADE);
      CREATE TABLE IF NOT EXISTS favorites (id TEXT PRIMARY KEY, partId TEXT UNIQUE NOT NULL, createdAt TEXT DEFAULT (datetime('now')), FOREIGN KEY (partId) REFERENCES parts(id) ON DELETE CASCADE);
      CREATE TABLE IF NOT EXISTS boms (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT DEFAULT '', createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS bom_items (id TEXT PRIMARY KEY, bomId TEXT NOT NULL, partId TEXT NOT NULL, quantity INTEGER DEFAULT 1, note TEXT DEFAULT '', FOREIGN KEY (bomId) REFERENCES boms(id) ON DELETE CASCADE, FOREIGN KEY (partId) REFERENCES parts(id) ON DELETE CASCADE);
      CREATE TABLE IF NOT EXISTS operation_logs (id TEXT PRIMARY KEY, action TEXT NOT NULL, entityType TEXT NOT NULL, entityId TEXT, entityName TEXT, details TEXT DEFAULT '', operator TEXT DEFAULT 'system', createdAt TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS warehouses (id TEXT PRIMARY KEY, name TEXT NOT NULL, location TEXT DEFAULT '', description TEXT DEFAULT '', isDefault INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS stock_warehouse (id TEXT PRIMARY KEY, partId TEXT NOT NULL, warehouseId TEXT NOT NULL, quantity INTEGER DEFAULT 0, updatedAt TEXT DEFAULT (datetime('now')), FOREIGN KEY (partId) REFERENCES parts(id) ON DELETE CASCADE, FOREIGN KEY (warehouseId) REFERENCES warehouses(id) ON DELETE CASCADE, UNIQUE(partId, warehouseId));
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updatedAt TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, description TEXT DEFAULT '', sortOrder INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')));
      CREATE INDEX IF NOT EXISTS idx_parts_code ON parts(code);
      CREATE INDEX IF NOT EXISTS idx_parts_category ON parts(category);
      CREATE INDEX IF NOT EXISTS idx_stock_movements_partId ON stock_movements(partId);
      CREATE INDEX IF NOT EXISTS idx_stock_movements_createdAt ON stock_movements(createdAt);
      CREATE INDEX IF NOT EXISTS idx_favorites_partId ON favorites(partId);
      CREATE INDEX IF NOT EXISTS idx_bom_items_bomId ON bom_items(bomId);
      CREATE INDEX IF NOT EXISTS idx_bom_items_partId ON bom_items(partId);
      CREATE INDEX IF NOT EXISTS idx_operation_logs_createdAt ON operation_logs(createdAt);
      CREATE INDEX IF NOT EXISTS idx_operation_logs_entityType ON operation_logs(entityType);
      CREATE INDEX IF NOT EXISTS idx_stock_warehouse_partId ON stock_warehouse(partId);
      CREATE INDEX IF NOT EXISTS idx_stock_warehouse_warehouseId ON stock_warehouse(warehouseId);
      CREATE INDEX IF NOT EXISTS idx_categories_sortOrder ON categories(sortOrder);
    `);
  }

  private migrate() {
    const columns = this.db.prepare("PRAGMA table_info(parts)").all() as { name: string }[];
    if (!columns.some(c => c.name === "image")) {
      this.db.exec("ALTER TABLE parts ADD COLUMN image TEXT DEFAULT ''");
    }
  }

  // ── Dashboard & Analytics ──

  async getDashboard(): Promise<DashboardData> {
    const today = new Date().toISOString().split("T")[0];
    const totalParts = (this.db.prepare("SELECT COUNT(*) as count FROM parts").get() as { count: number }).count;
    const lowStockCount = (this.db.prepare("SELECT COUNT(*) as count FROM stock s JOIN parts p ON s.partId = p.id WHERE p.minStock > 0 AND s.quantity < p.minStock").get() as { count: number }).count;
    const todayInCount = (this.db.prepare("SELECT COUNT(*) as count FROM stock_movements WHERE type = 'IN' AND createdAt >= ?").get(today) as { count: number }).count;
    const todayOutCount = (this.db.prepare("SELECT COUNT(*) as count FROM stock_movements WHERE type = 'OUT' AND createdAt >= ?").get(today) as { count: number }).count;
    const rawMovements = this.db.prepare("SELECT m.*, p.id as partId, p.code as partCode, p.name as partName, p.unit as partUnit FROM stock_movements m JOIN parts p ON p.id = m.partId ORDER BY m.createdAt DESC LIMIT 10").all() as Record<string, unknown>[];
    const recentMovements = rawMovements.map(m => ({ ...m, part: { id: m.partId, code: m.partCode, name: m.partName, unit: m.partUnit } }));
    const recentParts = this.db.prepare("SELECT DISTINCT p.id, p.code, p.name, p.category, p.unit, s.quantity as stock, MAX(m.createdAt) as lastUsedAt FROM stock_movements m JOIN parts p ON p.id = m.partId LEFT JOIN stock s ON s.partId = p.id GROUP BY p.id ORDER BY lastUsedAt DESC LIMIT 6").all() as Record<string, unknown>[];
    return { totalParts, lowStockCount, todayInCount, todayOutCount, recentMovements, recentParts };
  }

  async getAlerts(): Promise<AlertsData> {
    const lowStockParts = this.db.prepare("SELECT p.id, p.code, p.name, p.category, p.minStock, p.unit, COALESCE(s.quantity, 0) as currentStock, ROUND(COALESCE(s.quantity, 0) * 100.0 / NULLIF(p.minStock, 0), 1) as stockPercentage FROM parts p LEFT JOIN stock s ON s.partId = p.id WHERE p.minStock > 0 AND COALESCE(s.quantity, 0) < p.minStock ORDER BY (COALESCE(s.quantity, 0) * 1.0 / NULLIF(p.minStock, 0)) ASC").all() as Record<string, unknown>[];
    const outOfStockParts = this.db.prepare("SELECT p.id, p.code, p.name, p.category, p.unit FROM parts p LEFT JOIN stock s ON s.partId = p.id WHERE COALESCE(s.quantity, 0) = 0 ORDER BY p.updatedAt DESC LIMIT 20").all() as Record<string, unknown>[];
    const recentMovements = this.db.prepare("SELECT DATE(m.createdAt) as date, SUM(CASE WHEN m.type = 'IN' THEN m.quantity ELSE 0 END) as totalIn, SUM(CASE WHEN m.type = 'OUT' THEN m.quantity ELSE 0 END) as totalOut, COUNT(*) as movementCount FROM stock_movements m WHERE m.createdAt >= datetime('now', '-7 days') GROUP BY DATE(m.createdAt) ORDER BY date ASC").all() as Record<string, unknown>[];
    const activeParts = this.db.prepare("SELECT p.id, p.code, p.name, p.category, COUNT(m.id) as movementCount, SUM(CASE WHEN m.type = 'IN' THEN m.quantity ELSE 0 END) as totalIn, SUM(CASE WHEN m.type = 'OUT' THEN m.quantity ELSE 0 END) as totalOut FROM parts p JOIN stock_movements m ON m.partId = p.id WHERE m.createdAt >= datetime('now', '-30 days') GROUP BY p.id ORDER BY movementCount DESC LIMIT 10").all() as Record<string, unknown>[];
    const stats = this.db.prepare("SELECT COUNT(*) as totalParts, SUM(CASE WHEN COALESCE(s.quantity, 0) = 0 THEN 1 ELSE 0 END) as outOfStockCount, SUM(CASE WHEN p.minStock > 0 AND COALESCE(s.quantity, 0) < p.minStock THEN 1 ELSE 0 END) as lowStockCount, SUM(CASE WHEN p.minStock > 0 AND COALESCE(s.quantity, 0) < p.minStock THEN 1 ELSE 0 END) as criticalCount FROM parts p LEFT JOIN stock s ON s.partId = p.id").get() as Record<string, number>;
    return { lowStockParts, outOfStockParts, recentMovements, activeParts, stats: { totalParts: stats.totalParts || 0, outOfStockCount: stats.outOfStockCount || 0, lowStockCount: stats.lowStockCount || 0, criticalCount: stats.criticalCount || 0 } };
  }

  async getAnalytics(period: number): Promise<AnalyticsData> {
    const categoryStats = this.db.prepare("SELECT p.category, COUNT(*) as partCount, SUM(COALESCE(s.quantity, 0)) as totalStock, SUM(CASE WHEN p.minStock > 0 AND COALESCE(s.quantity, 0) < p.minStock THEN 1 ELSE 0 END) as lowStockCount FROM parts p LEFT JOIN stock s ON s.partId = p.id WHERE p.category != '' GROUP BY p.category ORDER BY partCount DESC").all() as Record<string, unknown>[];
    const movementTrends = this.db.prepare(`SELECT DATE(m.createdAt) as date, SUM(CASE WHEN m.type = 'IN' THEN m.quantity ELSE 0 END) as totalIn, SUM(CASE WHEN m.type = 'OUT' THEN m.quantity ELSE 0 END) as totalOut, COUNT(*) as movementCount FROM stock_movements m WHERE m.createdAt >= datetime('now', '-${period} days') GROUP BY DATE(m.createdAt) ORDER BY date ASC`).all() as Record<string, unknown>[];
    const topMovedParts = this.db.prepare(`SELECT p.id, p.code, p.name, p.category, p.unit, COUNT(m.id) as movementCount, SUM(CASE WHEN m.type = 'IN' THEN m.quantity ELSE 0 END) as totalIn, SUM(CASE WHEN m.type = 'OUT' THEN m.quantity ELSE 0 END) as totalOut FROM parts p JOIN stock_movements m ON m.partId = p.id WHERE m.createdAt >= datetime('now', '-${period} days') GROUP BY p.id ORDER BY movementCount DESC LIMIT 10`).all() as Record<string, unknown>[];
    const stockValueByCategory = this.db.prepare("SELECT p.category, SUM(COALESCE(s.quantity, 0)) as totalQuantity, COUNT(*) as partCount FROM parts p LEFT JOIN stock s ON s.partId = p.id WHERE p.category != '' GROUP BY p.category ORDER BY totalQuantity DESC").all() as Record<string, unknown>[];
    const movementTypeDistribution = this.db.prepare(`SELECT type, COUNT(*) as count, SUM(quantity) as totalQuantity FROM stock_movements WHERE createdAt >= datetime('now', '-${period} days') GROUP BY type`).all() as Record<string, unknown>[];
    const dailyAverages = this.db.prepare(`SELECT AVG(daily_in) as avgIn, AVG(daily_out) as avgOut, AVG(daily_count) as avgCount FROM (SELECT DATE(createdAt) as date, SUM(CASE WHEN type = 'IN' THEN quantity ELSE 0 END) as daily_in, SUM(CASE WHEN type = 'OUT' THEN quantity ELSE 0 END) as daily_out, COUNT(*) as daily_count FROM stock_movements WHERE createdAt >= datetime('now', '-${period} days') GROUP BY DATE(createdAt))`).get() as Record<string, number>;
    const stockDistribution = this.db.prepare("SELECT CASE WHEN COALESCE(s.quantity, 0) = 0 THEN '无库存' WHEN COALESCE(s.quantity, 0) <= 10 THEN '1-10' WHEN COALESCE(s.quantity, 0) <= 50 THEN '11-50' WHEN COALESCE(s.quantity, 0) <= 100 THEN '51-100' ELSE '100+' END as range, COUNT(*) as count FROM parts p LEFT JOIN stock s ON s.partId = p.id GROUP BY range ORDER BY CASE range WHEN '无库存' THEN 1 WHEN '1-10' THEN 2 WHEN '11-50' THEN 3 WHEN '51-100' THEN 4 WHEN '100+' THEN 5 END").all() as Record<string, unknown>[];
    return { categoryStats, movementTrends, topMovedParts, stockValueByCategory, movementTypeDistribution, dailyAverages: { avgIn: Math.round(dailyAverages?.avgIn || 0), avgOut: Math.round(dailyAverages?.avgOut || 0), avgCount: Math.round(dailyAverages?.avgCount || 0) }, stockDistribution, period };
  }

  // ── Parts CRUD ──

  async listParts(filters: PartFilters): Promise<{ parts: Part[]; total: number }> {
    let where = "WHERE 1=1";
    const params: unknown[] = [];
    if (filters.q) { where += " AND (p.name LIKE ? OR p.code LIKE ? OR p.brand LIKE ? OR p.model LIKE ? OR p.location LIKE ?)"; const q = `%${filters.q}%`; params.push(q, q, q, q, q); }
    if (filters.category) { where += " AND p.category = ?"; params.push(filters.category); }
    if (filters.package) { where += " AND p.package = ?"; params.push(filters.package); }
    if (filters.location) { where += " AND p.location LIKE ?"; params.push(`%${filters.location}%`); }
    if (filters.brand) { where += " AND p.brand LIKE ?"; params.push(`%${filters.brand}%`); }
    if (filters.stockMin !== undefined) { where += " AND COALESCE(s.quantity, 0) >= ?"; params.push(filters.stockMin); }
    if (filters.stockMax !== undefined) { where += " AND COALESCE(s.quantity, 0) <= ?"; params.push(filters.stockMax); }
    if (filters.hasStock === true) { where += " AND COALESCE(s.quantity, 0) > 0"; }
    if (filters.lowStock === true) { where += " AND p.minStock > 0 AND COALESCE(s.quantity, 0) < p.minStock"; }
    const total = (this.db.prepare(`SELECT COUNT(*) as total FROM parts p LEFT JOIN stock s ON s.partId = p.id ${where}`).get(...params) as { total: number }).total;
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const offset = (page - 1) * pageSize;
    const rawParts = this.db.prepare(`SELECT p.*, s.quantity as stockQuantity FROM parts p LEFT JOIN stock s ON s.partId = p.id ${where} ORDER BY p.updatedAt DESC LIMIT ? OFFSET ?`).all(...params, pageSize, offset) as Record<string, unknown>[];
    const parts = rawParts.map(p => ({ ...p, stock: { quantity: (p.stockQuantity as number) ?? 0 } }));
    return { parts: parts as unknown as Part[], total };
  }

  async getPart(id: string): Promise<PartDetail | null> {
    const part = this.db.prepare("SELECT p.*, s.quantity as stockQuantity FROM parts p LEFT JOIN stock s ON s.partId = p.id WHERE p.id = ?").get(id) as Record<string, unknown> | undefined;
    if (!part) return null;
    const movements = this.db.prepare("SELECT * FROM stock_movements WHERE partId = ? ORDER BY createdAt DESC LIMIT 50").all(id) as Movement[];
    return { ...part, stock: { quantity: part.stockQuantity ?? 0 }, movements } as unknown as PartDetail;
  }

  async getPartByCode(code: string): Promise<Part | null> {
    const part = this.db.prepare("SELECT p.*, s.quantity as stockQuantity FROM parts p LEFT JOIN stock s ON s.partId = p.id WHERE p.code = ?").get(code) as Record<string, unknown> | undefined;
    if (!part) return null;
    return { ...part, stock: { quantity: (part.stockQuantity as number) ?? 0 } } as unknown as Part;
  }

  async createPart(data: Record<string, unknown>): Promise<Part> {
    const existing = this.db.prepare("SELECT id FROM parts WHERE code = ?").get(data.code as string);
    if (existing) throw new Error("编码已存在");
    const id = randomUUID();
    const now = new Date().toISOString();
    this.db.prepare("INSERT INTO parts (id, code, name, category, package, brand, model, unit, minStock, location, note, image, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(id, data.code, data.name, data.category || "", data.package || "", data.brand || "", data.model || "", data.unit || "pcs", data.minStock || 0, data.location || "", data.note || "", "", now, now);
    this.db.prepare("INSERT INTO stock (id, partId, quantity) VALUES (?, ?, 0)").run(randomUUID(), id);
    if (data.image) {
      const { downloadImage } = require("./image-store");
      downloadImage(id, data.image as string).then((filename: string | null) => {
        if (filename) this.db.prepare("UPDATE parts SET image = ? WHERE id = ?").run(filename, id);
      }).catch(() => {});
    }
    return { id, code: data.code as string, name: data.name as string, category: (data.category as string) || "", package: (data.package as string) || "", brand: (data.brand as string) || "", model: (data.model as string) || "", unit: (data.unit as string) || "pcs", minStock: (data.minStock as number) || 0, location: (data.location as string) || "", note: (data.note as string) || "", image: "", createdAt: now, updatedAt: now, stock: { quantity: 0 } };
  }

  async updatePart(id: string, data: Record<string, unknown>): Promise<Part> {
    const existing = this.db.prepare("SELECT * FROM parts WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!existing) throw new Error("器件不存在");
    if (data.code && data.code !== existing.code) {
      const dup = this.db.prepare("SELECT id FROM parts WHERE code = ?").get(data.code as string);
      if (dup) throw new Error("编码已存在");
    }
    const fields = ["code", "name", "category", "package", "brand", "model", "unit", "minStock", "location", "note", "image"];
    const updates: string[] = [];
    const values: unknown[] = [];
    for (const field of fields) {
      if (data[field] !== undefined) { updates.push(`${field} = ?`); values.push(data[field]); }
    }
    if (updates.length > 0) {
      updates.push("updatedAt = ?");
      values.push(new Date().toISOString());
      values.push(id);
      this.db.prepare(`UPDATE parts SET ${updates.join(", ")} WHERE id = ?`).run(...values);
    }
    return (await this.getPart(id)) as unknown as Part;
  }

  async deletePart(id: string): Promise<void> {
    this.db.prepare("DELETE FROM parts WHERE id = ?").run(id);
    try { const { deleteImage } = require("./image-store"); deleteImage(id); } catch {}
  }

  // ── Movements ──

  async listMovements(filters: MovementFilters): Promise<{ movements: Movement[]; total: number }> {
    let where = "WHERE 1=1";
    const params: unknown[] = [];
    if (filters.partId) { where += " AND m.partId = ?"; params.push(filters.partId); }
    if (filters.type) { where += " AND m.type = ?"; params.push(filters.type); }
    const total = (this.db.prepare(`SELECT COUNT(*) as total FROM stock_movements m ${where}`).get(...params) as { total: number }).total;
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 50;
    const offset = (page - 1) * pageSize;
    const rawMovements = this.db.prepare(`SELECT m.*, p.code as partCode, p.name as partName, p.unit as partUnit FROM stock_movements m JOIN parts p ON p.id = m.partId ${where} ORDER BY m.createdAt DESC LIMIT ? OFFSET ?`).all(...params, pageSize, offset) as Record<string, unknown>[];
    const movements = rawMovements.map(m => ({ ...m, part: { code: m.partCode, name: m.partName, unit: m.partUnit } })) as unknown as Movement[];
    return { movements, total };
  }

  async createMovement(data: Record<string, unknown>): Promise<{ id: string; newQuantity: number }> {
    const part = this.db.prepare("SELECT p.*, s.quantity as stockQuantity FROM parts p LEFT JOIN stock s ON s.partId = p.id WHERE p.id = ?").get(data.partId as string) as Record<string, unknown> | undefined;
    if (!part) throw new Error("器件不存在");
    const currentQty = (part.stockQuantity as number) ?? 0;
    let newQty: number;
    if (data.type === "IN") { newQty = currentQty + (data.quantity as number); }
    else if (data.type === "OUT") {
      if (currentQty < (data.quantity as number)) throw new Error(`库存不足，当前库存 ${currentQty}，出库数量 ${data.quantity}`);
      newQty = currentQty - (data.quantity as number);
    } else { newQty = data.quantity as number; }
    const movementId = randomUUID();
    const now = new Date().toISOString();
    const transaction = this.db.transaction(() => {
      this.db.prepare("INSERT INTO stock_movements (id, partId, type, quantity, operator, reason, code, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(movementId, data.partId, data.type, data.quantity, data.operator || "", data.reason || "", data.code || "", now);
      this.db.prepare("UPDATE stock SET quantity = ?, updatedAt = ? WHERE partId = ?").run(newQty, now, data.partId);
      this.db.prepare("UPDATE parts SET updatedAt = ? WHERE id = ?").run(now, data.partId);
    });
    transaction();
    return { id: movementId, newQuantity: newQty };
  }

  async batchDelete(ids: string[]): Promise<void> {
    const transaction = this.db.transaction(() => {
      for (const id of ids) {
        this.db.prepare("DELETE FROM stock_movements WHERE partId = ?").run(id);
        this.db.prepare("DELETE FROM stock WHERE partId = ?").run(id);
        this.db.prepare("DELETE FROM parts WHERE id = ?").run(id);
      }
    });
    transaction();
  }

  async batchUpdate(ids: string[], updates: Record<string, unknown>): Promise<void> {
    const now = new Date().toISOString();
    const setClauses: string[] = ["updatedAt = ?"];
    const params: unknown[] = [now];
    if (updates.category !== undefined) { setClauses.push("category = ?"); params.push(updates.category); }
    if (updates.location !== undefined) { setClauses.push("location = ?"); params.push(updates.location); }
    if (updates.minStock !== undefined) { setClauses.push("minStock = ?"); params.push(updates.minStock); }
    const sql = `UPDATE parts SET ${setClauses.join(", ")} WHERE id = ?`;
    const transaction = this.db.transaction(() => { for (const id of ids) { this.db.prepare(sql).run(...params, id); } });
    transaction();
  }

  async batchMovement(items: Array<{ partId: string; quantity: number }>, type: "IN" | "OUT", operator?: string, reason?: string): Promise<BatchResult> {
    const now = new Date().toISOString();
    const results: BatchResult["results"] = [];
    const transaction = this.db.transaction(() => {
      for (const item of items) {
        const part = this.db.prepare("SELECT p.*, s.quantity as stockQuantity FROM parts p LEFT JOIN stock s ON s.partId = p.id WHERE p.id = ?").get(item.partId) as Record<string, unknown> | undefined;
        if (!part) { results.push({ partId: item.partId, success: false, message: "器件不存在" }); continue; }
        const currentQty = (part.stockQuantity as number) ?? 0;
        let newQty: number;
        if (type === "IN") { newQty = currentQty + item.quantity; }
        else { if (currentQty < item.quantity) { results.push({ partId: item.partId, success: false, message: `库存不足，当前 ${currentQty}，需要 ${item.quantity}` }); continue; } newQty = currentQty - item.quantity; }
        this.db.prepare("INSERT INTO stock_movements (id, partId, type, quantity, operator, reason, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)").run(randomUUID(), item.partId, type, item.quantity, operator || "", reason || "", now);
        this.db.prepare("UPDATE stock SET quantity = ?, updatedAt = ? WHERE partId = ?").run(newQty, now, item.partId);
        this.db.prepare("UPDATE parts SET updatedAt = ? WHERE id = ?").run(now, item.partId);
        results.push({ partId: item.partId, success: true, newQuantity: newQty });
      }
    });
    transaction();
    return { results, successCount: results.filter(r => r.success).length, failCount: results.filter(r => !r.success).length };
  }

  async backfillImages(ids: string[]): Promise<BatchResult> {
    const results: BatchResult["results"] = [];
    const { fetchProductImage, downloadImage } = require("./image-store");
    for (const id of ids) {
      const part = this.db.prepare("SELECT id, code, image FROM parts WHERE id = ?").get(id) as { id: string; code: string; image: string } | undefined;
      if (!part) { results.push({ partId: id, success: false, message: "器件不存在" }); continue; }
      if (part.image) { results.push({ partId: id, success: true, message: "已有图片" }); continue; }
      try {
        const imageUrl = fetchProductImage(part.code);
        if (!imageUrl) { results.push({ partId: id, success: false, message: "未找到产品图片" }); continue; }
        const filename = downloadImage(id, imageUrl);
        if (filename) { this.db.prepare("UPDATE parts SET image = ?, updatedAt = ? WHERE id = ?").run(filename, new Date().toISOString(), id); results.push({ partId: id, success: true }); }
        else { results.push({ partId: id, success: false, message: "图片下载失败" }); }
      } catch { results.push({ partId: id, success: false, message: "处理失败" }); }
    }
    return { results, successCount: results.filter(r => r.success).length, failCount: results.filter(r => !r.success).length };
  }

  // ── Favorites ──

  async listFavorites(): Promise<Part[]> {
    return this.db.prepare("SELECT p.id, p.code, p.name, p.category, p.unit, p.location, COALESCE(s.quantity, 0) as stock, f.createdAt as favoritedAt FROM favorites f JOIN parts p ON p.id = f.partId LEFT JOIN stock s ON s.partId = p.id ORDER BY f.createdAt DESC").all() as Part[];
  }

  async toggleFavorite(partId: string): Promise<{ favorited: boolean }> {
    const part = this.db.prepare("SELECT id FROM parts WHERE id = ?").get(partId);
    if (!part) throw new Error("器件不存在");
    const existing = this.db.prepare("SELECT id FROM favorites WHERE partId = ?").get(partId);
    if (existing) { this.db.prepare("DELETE FROM favorites WHERE partId = ?").run(partId); return { favorited: false }; }
    else { this.db.prepare("INSERT INTO favorites (id, partId, createdAt) VALUES (?, ?, ?)").run(randomUUID(), partId, new Date().toISOString()); return { favorited: true }; }
  }

  // ── BOMs ──

  async listBoms(): Promise<Bom[]> {
    return this.db.prepare("SELECT b.*, (SELECT COUNT(*) FROM bom_items bi WHERE bi.bomId = b.id) as itemCount FROM boms b ORDER BY b.updatedAt DESC").all() as Bom[];
  }

  async getBom(id: string): Promise<(Bom & { items: BomItem[] }) | null> {
    const bom = this.db.prepare("SELECT * FROM boms WHERE id = ?").get(id) as Bom | undefined;
    if (!bom) return null;
    const items = this.db.prepare("SELECT bi.*, p.code, p.name, p.category, p.unit, COALESCE(s.quantity, 0) as currentStock FROM bom_items bi JOIN parts p ON p.id = bi.partId LEFT JOIN stock s ON s.partId = p.id WHERE bi.bomId = ? ORDER BY p.code").all(id) as BomItem[];
    return { ...bom, items };
  }

  async createBom(data: { name: string; description?: string; items?: Array<{ partId: string; quantity: number; note?: string }> }): Promise<Bom> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const transaction = this.db.transaction(() => {
      this.db.prepare("INSERT INTO boms (id, name, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)").run(id, data.name, data.description || "", now, now);
      if (data.items) { for (const item of data.items) { this.db.prepare("INSERT INTO bom_items (id, bomId, partId, quantity, note) VALUES (?, ?, ?, ?, ?)").run(randomUUID(), id, item.partId, item.quantity || 1, item.note || ""); } }
    });
    transaction();
    return this.db.prepare("SELECT * FROM boms WHERE id = ?").get(id) as Bom;
  }

  async updateBom(id: string, data: { name?: string; description?: string; items?: Array<{ partId: string; quantity: number; note?: string }> }): Promise<Bom & { items: BomItem[] }> {
    const bom = this.db.prepare("SELECT * FROM boms WHERE id = ?").get(id);
    if (!bom) throw new Error("BOM不存在");
    const now = new Date().toISOString();
    const transaction = this.db.transaction(() => {
      if (data.name !== undefined || data.description !== undefined) {
        const updates: string[] = ["updatedAt = ?"];
        const values: unknown[] = [now];
        if (data.name !== undefined) { updates.push("name = ?"); values.push(data.name); }
        if (data.description !== undefined) { updates.push("description = ?"); values.push(data.description); }
        values.push(id);
        this.db.prepare(`UPDATE boms SET ${updates.join(", ")} WHERE id = ?`).run(...values);
      }
      if (data.items) {
        this.db.prepare("DELETE FROM bom_items WHERE bomId = ?").run(id);
        for (const item of data.items) { this.db.prepare("INSERT INTO bom_items (id, bomId, partId, quantity, note) VALUES (?, ?, ?, ?, ?)").run(randomUUID(), id, item.partId, item.quantity || 1, item.note || ""); }
      }
    });
    transaction();
    return (await this.getBom(id))!;
  }

  async deleteBom(id: string): Promise<void> {
    const bom = this.db.prepare("SELECT * FROM boms WHERE id = ?").get(id);
    if (!bom) throw new Error("BOM不存在");
    const transaction = this.db.transaction(() => { this.db.prepare("DELETE FROM bom_items WHERE bomId = ?").run(id); this.db.prepare("DELETE FROM boms WHERE id = ?").run(id); });
    transaction();
  }

  // ── Warehouses ──

  async listWarehouses(): Promise<Warehouse[]> {
    return this.db.prepare("SELECT w.*, (SELECT COUNT(*) FROM stock_warehouse sw WHERE sw.warehouseId = w.id) as partCount, (SELECT SUM(sw.quantity) FROM stock_warehouse sw WHERE sw.warehouseId = w.id) as totalStock FROM warehouses w ORDER BY w.isDefault DESC, w.name").all() as Warehouse[];
  }

  async getWarehouse(id: string): Promise<(Warehouse & { items: Record<string, unknown>[] }) | null> {
    const warehouse = this.db.prepare("SELECT * FROM warehouses WHERE id = ?").get(id) as Warehouse | undefined;
    if (!warehouse) return null;
    const items = this.db.prepare("SELECT sw.*, p.code, p.name, p.category, p.unit, p.location FROM stock_warehouse sw JOIN parts p ON p.id = sw.partId WHERE sw.warehouseId = ? ORDER BY p.code").all(id) as Record<string, unknown>[];
    return { ...warehouse, items };
  }

  async createWarehouse(data: Record<string, unknown>): Promise<Warehouse> {
    const id = randomUUID();
    const now = new Date().toISOString();
    if (data.isDefault) this.db.prepare("UPDATE warehouses SET isDefault = 0").run();
    this.db.prepare("INSERT INTO warehouses (id, name, location, description, isDefault, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)").run(id, data.name, data.location || "", data.description || "", data.isDefault ? 1 : 0, now, now);
    return this.db.prepare("SELECT * FROM warehouses WHERE id = ?").get(id) as Warehouse;
  }

  async updateWarehouse(id: string, data: Record<string, unknown>): Promise<Warehouse> {
    const warehouse = this.db.prepare("SELECT * FROM warehouses WHERE id = ?").get(id);
    if (!warehouse) throw new Error("仓库不存在");
    const now = new Date().toISOString();
    const updates: string[] = ["updatedAt = ?"];
    const values: unknown[] = [now];
    if (data.name !== undefined) { updates.push("name = ?"); values.push(data.name); }
    if (data.location !== undefined) { updates.push("location = ?"); values.push(data.location); }
    if (data.description !== undefined) { updates.push("description = ?"); values.push(data.description); }
    if (data.isDefault !== undefined) { if (data.isDefault) this.db.prepare("UPDATE warehouses SET isDefault = 0").run(); updates.push("isDefault = ?"); values.push(data.isDefault ? 1 : 0); }
    values.push(id);
    this.db.prepare(`UPDATE warehouses SET ${updates.join(", ")} WHERE id = ?`).run(...values);
    return this.db.prepare("SELECT * FROM warehouses WHERE id = ?").get(id) as Warehouse;
  }

  async deleteWarehouse(id: string): Promise<void> {
    const warehouse = this.db.prepare("SELECT * FROM warehouses WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!warehouse) throw new Error("仓库不存在");
    if (warehouse.isDefault) throw new Error("不能删除默认仓库");
    this.db.prepare("DELETE FROM stock_warehouse WHERE warehouseId = ?").run(id);
    this.db.prepare("DELETE FROM warehouses WHERE id = ?").run(id);
  }

  // ── Settings ──

  async getSetting(key: string): Promise<string | null> {
    const row = this.db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    this.db.prepare("INSERT INTO settings (key, value, updatedAt) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt").run(key, value);
  }

  async listSettings(): Promise<Record<string, string>> {
    const rows = this.db.prepare("SELECT * FROM settings").all() as { key: string; value: string }[];
    return rows.reduce((acc, r) => { acc[r.key] = r.value; return acc; }, {} as Record<string, string>);
  }

  // ── Categories ──

  async listCategories(): Promise<Category[]> {
    return this.db.prepare("SELECT c.*, COUNT(p.id) as partCount FROM categories c LEFT JOIN parts p ON p.category = c.name GROUP BY c.id ORDER BY c.sortOrder, c.name").all() as Category[];
  }

  async getCategory(id: string): Promise<Category | null> {
    return (this.db.prepare("SELECT c.*, COUNT(p.id) as partCount FROM categories c LEFT JOIN parts p ON p.category = c.name WHERE c.id = ? GROUP BY c.id").get(id) as Category) || null;
  }

  async createCategory(data: { name: string; description?: string }): Promise<Category> {
    const existing = this.db.prepare("SELECT id FROM categories WHERE name = ?").get(data.name.trim());
    if (existing) throw new Error("分类名称已存在");
    const id = randomUUID();
    const maxSort = this.db.prepare("SELECT MAX(sortOrder) as maxSort FROM categories").get() as { maxSort: number | null };
    const sortOrder = (maxSort?.maxSort ?? 0) + 1;
    this.db.prepare("INSERT INTO categories (id, name, description, sortOrder) VALUES (?, ?, ?, ?)").run(id, data.name.trim(), data.description || "", sortOrder);
    return { id, name: data.name.trim(), description: data.description || "", sortOrder, createdAt: new Date().toISOString(), partCount: 0 };
  }

  async updateCategory(id: string, data: { name: string; description?: string; sortOrder?: number }): Promise<void> {
    const existing = this.db.prepare("SELECT id FROM categories WHERE name = ? AND id != ?").get(data.name.trim(), id);
    if (existing) throw new Error("分类名称已存在");
    const oldCategory = this.db.prepare("SELECT name FROM categories WHERE id = ?").get(id) as { name: string } | undefined;
    if (!oldCategory) throw new Error("分类不存在");
    const transaction = this.db.transaction(() => {
      this.db.prepare("UPDATE categories SET name = ?, description = ?, sortOrder = ? WHERE id = ?").run(data.name.trim(), data.description || "", data.sortOrder ?? 0, id);
      if (oldCategory.name !== data.name.trim()) { this.db.prepare("UPDATE parts SET category = ? WHERE category = ?").run(data.name.trim(), oldCategory.name); }
    });
    transaction();
  }

  async deleteCategory(id: string): Promise<void> {
    const category = this.db.prepare("SELECT name FROM categories WHERE id = ?").get(id) as { name: string } | undefined;
    if (!category) throw new Error("分类不存在");
    this.db.prepare("UPDATE parts SET category = '' WHERE category = ?").run(category.name);
    this.db.prepare("DELETE FROM categories WHERE id = ?").run(id);
  }

  // ── Logs ──

  async listLogs(filters: LogFilters): Promise<{ logs: Log[]; total: number }> {
    let where = "WHERE 1=1";
    const params: unknown[] = [];
    if (filters.entityType) { where += " AND entityType = ?"; params.push(filters.entityType); }
    if (filters.action) { where += " AND action = ?"; params.push(filters.action); }
    const total = (this.db.prepare(`SELECT COUNT(*) as total FROM operation_logs ${where}`).get(...params) as { total: number }).total;
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 50;
    const offset = (page - 1) * pageSize;
    const logs = this.db.prepare(`SELECT * FROM operation_logs ${where} ORDER BY createdAt DESC LIMIT ? OFFSET ?`).all(...params, pageSize, offset) as Log[];
    return { logs, total };
  }

  async logOperation(data: { action: string; entityType: string; entityId?: string; entityName?: string; details?: string; operator?: string }): Promise<void> {
    try {
      this.db.prepare("INSERT INTO operation_logs (id, action, entityType, entityId, entityName, details, operator, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(randomUUID(), data.action, data.entityType, data.entityId || "", data.entityName || "", data.details || "", data.operator || "system", new Date().toISOString());
    } catch (e) { console.error("Failed to log operation:", e); }
  }

  // ── Export ──

  async exportParts(): Promise<Record<string, unknown>[]> {
    return this.db.prepare("SELECT p.code, p.name, p.category, p.package, p.brand, p.model, p.unit, p.minStock, p.location, p.note, COALESCE(s.quantity, 0) as stock FROM parts p LEFT JOIN stock s ON s.partId = p.id ORDER BY p.code").all() as Record<string, unknown>[];
  }

  async exportMovements(): Promise<Record<string, unknown>[]> {
    return this.db.prepare("SELECT m.type, m.quantity, m.operator, m.reason, m.code, m.createdAt, p.code as partCode, p.name as partName FROM stock_movements m JOIN parts p ON p.id = m.partId ORDER BY m.createdAt DESC").all() as Record<string, unknown>[];
  }

  async importParts(rows: string[][], headers: string[]): Promise<{ imported: number; skipped: number; errors: string[] }> {
    const codeIndex = headers.indexOf("编码");
    const nameIndex = headers.indexOf("名称");
    const categoryIndex = headers.indexOf("分类");
    const packageIndex = headers.indexOf("封装");
    const brandIndex = headers.indexOf("品牌");
    const modelIndex = headers.indexOf("型号");
    const unitIndex = headers.indexOf("单位");
    const minStockIndex = headers.indexOf("最低库存");
    const locationIndex = headers.indexOf("仓位");
    const noteIndex = headers.indexOf("备注");
    if (codeIndex === -1 || nameIndex === -1) throw new Error("CSV 必须包含编码和名称列");
    const now = new Date().toISOString();
    let imported = 0; let skipped = 0; const errors: string[] = [];
    const transaction = this.db.transaction(() => {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]; const code = row[codeIndex]; const name = row[nameIndex];
        if (!code || !name) { errors.push(`行 ${i + 2}: 编码或名称为空`); continue; }
        const existing = this.db.prepare("SELECT id FROM parts WHERE code = ?").get(code);
        if (existing) { skipped++; continue; }
        const id = randomUUID();
        this.db.prepare("INSERT INTO parts (id, code, name, category, package, brand, model, unit, minStock, location, note, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(id, code, name, row[categoryIndex] || "", row[packageIndex] || "", row[brandIndex] || "", row[modelIndex] || "", row[unitIndex] || "pcs", parseInt(row[minStockIndex]) || 0, row[locationIndex] || "", row[noteIndex] || "", now, now);
        this.db.prepare("INSERT INTO stock (id, partId, quantity) VALUES (?, ?, 0)").run(randomUUID(), id);
        imported++;
      }
    });
    transaction();
    return { imported, skipped, errors: errors.slice(0, 10) };
  }
}
