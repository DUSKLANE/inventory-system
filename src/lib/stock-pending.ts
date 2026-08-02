export type StockMode = "IN" | "OUT";

export interface StockItem {
  id: string;
  code: string;
  partId?: string;
  name: string;
  category: string;
  package: string;
  brand: string;
  model: string;
  unit: string;
  location: string;
  orderCode: string;
  quantity: number;
  stock?: number;
  status: "loading" | "ready" | "error";
  errorMessage?: string;
}

const DUPLICATE_WINDOW_MS = 1000;

export function normalizeMode(value: string | null | undefined): StockMode {
  return value === "OUT" ? "OUT" : "IN";
}

export function isDuplicateScan(
  last: { code: string; time: number } | null,
  code: string,
  now: number
): boolean {
  return !!last && last.code === code && now - last.time < DUPLICATE_WINDOW_MS;
}

interface LegacyItem {
  id?: unknown;
  scanData?: Record<string, unknown>;
  productInfo?: Record<string, unknown>;
  existingPartId?: unknown;
  customName?: unknown;
  location?: unknown;
  quantity?: unknown;
}

export function migrateLegacyItems(raw: unknown): StockItem[] {
  if (!Array.isArray(raw)) return [];
  const result: StockItem[] = [];
  for (const entry of raw) {
    const it = (entry ?? {}) as LegacyItem;
    const sd = it.scanData ?? {};
    const pi = it.productInfo ?? {};
    const code = typeof sd.pc === "string" ? sd.pc : "";
    if (!code) continue;
    const quantity = typeof it.quantity === "number" && it.quantity > 0 ? it.quantity : 1;
    const customName = typeof it.customName === "string" && it.customName ? it.customName : "";
    result.push({
      id: typeof it.id === "string" && it.id ? it.id : `${code}-${Date.now()}`,
      code,
      partId: typeof it.existingPartId === "string" ? it.existingPartId : undefined,
      name: customName || (typeof pi.name === "string" && pi.name ? pi.name : typeof sd.pm === "string" ? sd.pm : code),
      category: typeof pi.category === "string" ? pi.category : "",
      package: typeof pi.package === "string" ? pi.package : "",
      brand: typeof pi.brand === "string" ? pi.brand : "",
      model: typeof pi.model === "string" ? pi.model : typeof sd.pm === "string" ? sd.pm : "",
      unit: typeof pi.unit === "string" && pi.unit ? pi.unit : "pcs",
      location: typeof it.location === "string" ? it.location : "",
      orderCode: typeof sd.on === "string" ? sd.on : "",
      quantity,
      status: "ready",
    });
  }
  return result;
}

export function migratePendingKey(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">,
  newKey: string,
  oldKey: string
): void {
  try {
    if (storage.getItem(newKey)) return;
    const old = storage.getItem(oldKey);
    if (old) {
      storage.setItem(newKey, old);
      storage.removeItem(oldKey);
    }
  } catch {
    // ignore
  }
}

export function loadPendingItems(storage: Pick<Storage, "getItem">, key: string): StockItem[] {
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as StockItem[]) : [];
  } catch {
    return [];
  }
}

export function savePendingItems(storage: Pick<Storage, "setItem">, key: string, items: StockItem[]): void {
  try {
    storage.setItem(key, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function buildStockInPayload(items: StockItem[], reason: string) {
  return {
    action: "stock-in-upsert",
    reason,
    items: items.map((i) => ({
      code: i.code,
      name: i.name,
      category: i.category,
      package: i.package,
      brand: i.brand,
      model: i.model,
      unit: i.unit,
      location: i.location,
      orderCode: i.orderCode,
      quantity: i.quantity,
    })),
  };
}

export function buildStockOutPayload(items: StockItem[], reason: string) {
  return {
    action: "movement",
    type: "OUT",
    reason,
    items: items.map((i) => ({ partId: i.partId as string, quantity: i.quantity })),
  };
}

export function applyBatchResults(
  items: StockItem[],
  results: Array<{ partId?: string; code?: string; success: boolean; message?: string }>
): { removed: StockItem[]; kept: StockItem[] } {
  const removedIds = new Set<string>();
  for (const r of results) {
    if (!r.success) continue;
    for (const item of items) {
      if (removedIds.has(item.id)) continue;
      if (r.partId && item.partId && r.partId === item.partId) removedIds.add(item.id);
      else if (r.code && r.code === item.code) removedIds.add(item.id);
    }
  }
  return {
    removed: items.filter((i) => removedIds.has(i.id)),
    kept: items.filter((i) => !removedIds.has(i.id)),
  };
}
