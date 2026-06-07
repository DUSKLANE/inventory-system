// ── Shared Types ──

export interface Part {
  id: string;
  code: string;
  name: string;
  category: string;
  package: string;
  brand: string;
  model: string;
  unit: string;
  minStock: number;
  location: string;
  note: string;
  image: string;
  createdAt: string;
  updatedAt: string;
  stock?: { quantity: number };
}

export interface PartDetail extends Part {
  movements: Movement[];
}

export interface Movement {
  id: string;
  partId: string;
  type: string;
  quantity: number;
  operator: string;
  reason: string;
  code: string;
  createdAt: string;
  part?: { id?: string; code: string; name: string; unit: string };
}

export interface Bom {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  itemCount?: number;
}

export interface BomItem {
  id: string;
  bomId: string;
  partId: string;
  quantity: number;
  note: string;
  code?: string;
  name?: string;
  category?: string;
  unit?: string;
  currentStock?: number;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  description: string;
  isDefault: number;
  createdAt: string;
  updatedAt: string;
  partCount?: number;
  totalStock?: number;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
  createdAt: string;
  partCount?: number;
}

export interface Log {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName: string;
  details: string;
  operator: string;
  createdAt: string;
}

export interface DashboardData {
  totalParts: number;
  lowStockCount: number;
  todayInCount: number;
  todayOutCount: number;
  recentMovements: Record<string, unknown>[];
  recentParts: Record<string, unknown>[];
}

export interface AlertsData {
  lowStockParts: Record<string, unknown>[];
  outOfStockParts: Record<string, unknown>[];
  recentMovements: Record<string, unknown>[];
  activeParts: Record<string, unknown>[];
  stats: { totalParts: number; outOfStockCount: number; lowStockCount: number; criticalCount: number };
}

export interface AnalyticsData {
  categoryStats: Record<string, unknown>[];
  movementTrends: Record<string, unknown>[];
  topMovedParts: Record<string, unknown>[];
  stockValueByCategory: Record<string, unknown>[];
  movementTypeDistribution: Record<string, unknown>[];
  dailyAverages: { avgIn: number; avgOut: number; avgCount: number };
  stockDistribution: Record<string, unknown>[];
  period: number;
}

export interface PartFilters {
  q?: string;
  category?: string;
  package?: string;
  location?: string;
  brand?: string;
  stockMin?: number;
  stockMax?: number;
  hasStock?: boolean;
  lowStock?: boolean;
  page?: number;
  pageSize?: number;
}

export interface MovementFilters {
  partId?: string;
  type?: string;
  page?: number;
  pageSize?: number;
}

export interface LogFilters {
  entityType?: string;
  action?: string;
  page?: number;
  pageSize?: number;
}

export interface BatchResult {
  results: Array<{ partId: string; success: boolean; message?: string; newQuantity?: number }>;
  successCount: number;
  failCount: number;
}

// ── Database Adapter Interface ──

export interface DatabaseAdapter {
  // Dashboard & Analytics
  getDashboard(): Promise<DashboardData>;
  getAlerts(): Promise<AlertsData>;
  getAnalytics(period: number): Promise<AnalyticsData>;

  // Parts CRUD
  listParts(filters: PartFilters): Promise<{ parts: Part[]; total: number }>;
  getPart(id: string): Promise<PartDetail | null>;
  getPartByCode(code: string): Promise<Part | null>;
  generateNextCode(): Promise<string>;
  createPart(data: Record<string, unknown>): Promise<Part>;
  updatePart(id: string, data: Record<string, unknown>): Promise<Part>;
  deletePart(id: string): Promise<void>;

  // Movements
  listMovements(filters: MovementFilters): Promise<{ movements: Movement[]; total: number }>;
  createMovement(data: Record<string, unknown>): Promise<{ id: string; newQuantity: number }>;
  batchDelete(ids: string[]): Promise<void>;
  batchUpdate(ids: string[], updates: Record<string, unknown>): Promise<void>;
  batchMovement(items: Array<{ partId: string; quantity: number }>, type: "IN" | "OUT", operator?: string, reason?: string): Promise<BatchResult>;
  backfillImages(ids: string[]): Promise<BatchResult>;

  // Favorites
  listFavorites(): Promise<Part[]>;
  toggleFavorite(partId: string): Promise<{ favorited: boolean }>;

  // BOMs
  listBoms(): Promise<Bom[]>;
  getBom(id: string): Promise<(Bom & { items: BomItem[] }) | null>;
  createBom(data: { name: string; description?: string; items?: Array<{ partId: string; quantity: number; note?: string }> }): Promise<Bom>;
  updateBom(id: string, data: { name?: string; description?: string; items?: Array<{ partId: string; quantity: number; note?: string }> }): Promise<Bom & { items: BomItem[] }>;
  deleteBom(id: string): Promise<void>;

  // Warehouses
  listWarehouses(): Promise<Warehouse[]>;
  getWarehouse(id: string): Promise<(Warehouse & { items: Record<string, unknown>[] }) | null>;
  createWarehouse(data: Record<string, unknown>): Promise<Warehouse>;
  updateWarehouse(id: string, data: Record<string, unknown>): Promise<Warehouse>;
  deleteWarehouse(id: string): Promise<void>;

  // Settings
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;
  listSettings(): Promise<Record<string, string>>;

  // Categories
  listCategories(): Promise<Category[]>;
  getCategory(id: string): Promise<Category | null>;
  createCategory(data: { name: string; description?: string }): Promise<Category>;
  updateCategory(id: string, data: { name: string; description?: string; sortOrder?: number }): Promise<void>;
  deleteCategory(id: string): Promise<void>;

  // Logs
  listLogs(filters: LogFilters): Promise<{ logs: Log[]; total: number }>;
  logOperation(data: { action: string; entityType: string; entityId?: string; entityName?: string; details?: string; operator?: string }): Promise<void>;

  // Export
  exportParts(): Promise<Record<string, unknown>[]>;
  exportMovements(): Promise<Record<string, unknown>[]>;
  importParts(rows: string[][], headers: string[]): Promise<{ imported: number; skipped: number; errors: string[] }>;
}

// ── Storage mode & singleton ──

export type StorageMode = "local" | "cloud";

export function getStorageMode(): StorageMode {
  return (process.env.STORAGE_MODE as StorageMode) || "local";
}

let _db: DatabaseAdapter | null = null;

export function getDb(): DatabaseAdapter {
  if (!_db) {
    const mode = getStorageMode();
    if (mode === "cloud") {
      const { RedisAdapter } = require("./db-redis") as typeof import("./db-redis");
      _db = new RedisAdapter();
    } else {
      const { SqliteAdapter } = require("./db-sqlite") as typeof import("./db-sqlite");
      _db = new SqliteAdapter();
    }
  }
  return _db;
}

// Convenience: default export is the adapter instance (lazy)
const db: DatabaseAdapter = new Proxy({} as DatabaseAdapter, {
  get(_target, prop) {
    const adapter = getDb();
    const value = (adapter as unknown as Record<string, unknown>)[prop as string];
    if (typeof value === "function") {
      return value.bind(adapter);
    }
    return value;
  },
});

export default db;
