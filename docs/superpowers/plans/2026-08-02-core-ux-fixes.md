# 核心流程可用性修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复扫码入库、BOM 领料、器件列表三大核心链路的设计问题，并统一交互底座（Toast/Confirm、NumberInput、CSS、主题防闪），接线设置项，下线仓库孤岛功能。

**Architecture:** 全站为 client fetch + 本地 state 的 App Router 应用，存储层为 DatabaseAdapter 接口（SQLite 本地 / Redis 云端双实现）。修复集中在：新增 db 层事务方法（upsert 入库、BOM 领料）、扩展 `/api/parts/batch` 与新增 `/api/boms/[id]/checkout` 端点、改造 scan/BOM/parts 三个页面、抽出共享组件（parse-qr、Toast、Confirm）。

**Tech Stack:** Next.js 16.2.12 (App Router, webpack dev) / React 19 / TypeScript / Tailwind CSS 4 / zod / vitest / node:sqlite

## Global Constraints

- 使用环境：桌面为主、手机扫码、个人自用。移动端除扫码页与列表批量外不做精细打磨。
- 不引入新依赖（不装 @testing-library/react、SWR 等）。
- 不重构认证体系、Redis 缓存一致性、深色模式 `!important` 体系、图表页。
- 新增/修改的 db 方法必须在 `DatabaseAdapter` 接口（`src/lib/db.ts`）中声明，SQLite 与 Redis 两个实现都要有（Redis 尽力一致即可）。
- 服务端排序字段必须走白名单映射，禁止字符串拼接 SQL。
- 事务内逐条失败不得抛出中断事务（沿用 `batchMovement` 的 per-item result 模式）；BOM 领料除外（整体失败语义）。
- 测试用 vitest，运行 `npx vitest run`；lint 用 `npx eslint .`。
- 每个任务结束时运行 `npx vitest run` 与 `npx eslint .`（涉及文件），通过后提交。
- 前端改动后用浏览器验证（dev server 运行 `npm run dev`，即 `next dev --webpack`，http://localhost:3000，admin/admin123 登录）。

---

### Task 1: parse-qr 二维码解析工具 + 单测

**Files:**
- Create: `src/lib/parse-qr.ts`
- Create: `src/lib/__tests__/parse-qr.test.ts`

**Interfaces:**
- Produces:
  - `export interface ScanResult { on?: string; pc?: string; pm?: string; qty?: string; mc?: string; cc?: string; pdi?: string; hp?: string; [key: string]: string | undefined }`
  - `export function parseScanData(raw: string): ScanResult | null` —— 从 scan 页 `src/app/scan/page.tsx:46-70` 原样迁移
  - `export function extractPartCode(raw: string): string` —— 供 StockMovement 使用；返回 pc 字段，纯编码输入原样返回

- [ ] **Step 1: 写失败测试**

```ts
import { describe, it, expect } from "vitest";
import { parseScanData, extractPartCode } from "../parse-qr";

describe("parseScanData", () => {
  it("解析纯编码", () => {
    expect(parseScanData("C2907002")).toEqual({ pc: "C2907002" });
  });
  it("解析嘉立创 JSON 格式", () => {
    const r = parseScanData('{on:SO123,pc:C2907002,pm:10K 电阻}');
    expect(r).toEqual({ on: "SO123", pc: "C2907002", pm: "10K 电阻" });
  });
  it("带大括号变体", () => {
    expect(parseScanData('{pc:C12345}')?.pc).toBe("C12345");
  });
  it("值包含冒号时保留", () => {
    expect(parseScanData('{pc:C12345,note:a:b}')?.note).toBe("a:b");
  });
  it("无法解析返回 null", () => {
    expect(parseScanData("")).toBeNull();
    expect(parseScanData("!!!")).toEqual({ "!!!": "!!!" }); // 现有行为：非空即返回
  });
});

describe("extractPartCode", () => {
  it("取 pc 字段", () => {
    expect(extractPartCode('{on:SO123,pc:C2907002}')).toBe("C2907002");
  });
  it("纯编码原样返回", () => {
    expect(extractPartCode("Z0001")).toBe("Z0001");
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/lib/__tests__/parse-qr.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 parse-qr.ts**

```ts
export interface ScanResult {
  on?: string;
  pc?: string;
  pm?: string;
  qty?: string;
  mc?: string;
  cc?: string;
  pdi?: string;
  hp?: string;
  [key: string]: string | undefined;
}

export function parseScanData(raw: string): ScanResult | null {
  try {
    let cleaned = raw.trim();
    if (/^[A-Za-z]\d+$/.test(cleaned)) return { pc: cleaned };
    if (cleaned.startsWith("{") && cleaned.endsWith("}")) cleaned = cleaned.slice(1, -1);
    const result: ScanResult = {};
    const pairs = cleaned.split(",");
    for (const pair of pairs) {
      const [key, ...valueParts] = pair.split(":");
      if (key) result[key.trim()] = valueParts.join(":").trim();
    }
    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
}

export function extractPartCode(raw: string): string {
  const trimmed = raw.trim();
  const parsed = parseScanData(trimmed);
  if (parsed?.pc) return parsed.pc;
  return trimmed;
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run src/lib/__tests__/parse-qr.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/lib/parse-qr.ts src/lib/__tests__/parse-qr.test.ts
git commit -m "feat: 统一嘉立创二维码解析工具 parse-qr"
```

---

### Task 2: NumberInput 显示/计算 bug 修复

**Files:**
- Modify: `src/components/NumberInput.tsx`

**Interfaces:**
- Consumes: 无（props 不变：`value: string; onChange: (value: string) => void; min?: number; max?: number; className?: string`）
- Produces: 修复后的 NumberInput（外部 value 变化时显示同步、`value="0"`+`min=1` 时步进正确、非法输入不截断）

- [ ] **Step 1: 重写 NumberInput.tsx 主体逻辑**

```tsx
export default function NumberInput({ value, onChange, min = 1, max, className = "" }: NumberInputProps) {
  const [editingValue, setEditingValue] = useState<string | null>(null);

  // 外部 value 变化时丢弃未提交的编辑值，避免显示陈旧值（如扫码页同码累加）
  useEffect(() => {
    setEditingValue(null);
  }, [value]);

  const parsed = parseInt(value, 10);
  const numValue = Number.isFinite(parsed) ? parsed : min;

  const handleDecrement = () => {
    setEditingValue(null);
    onChange(String(Math.max(min, numValue - 1)));
  };

  const handleIncrement = () => {
    setEditingValue(null);
    const next = numValue + 1;
    onChange(max !== undefined ? String(Math.min(max, next)) : String(next));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEditingValue(val);
    const num = Number(val);
    if (val !== "" && val !== "-" && Number.isInteger(num) && num >= 0) {
      onChange(String(num));
    }
  };

  const handleBlur = () => {
    setEditingValue(null);
    const parsedVal = Number(value);
    const finalVal = Number.isFinite(parsedVal) ? parsedVal : min;
    const clamped = Math.min(max ?? finalVal, Math.max(min, finalVal));
    onChange(String(clamped));
  };

  return (/* JSX 不变：displayValue = editingValue !== null ? editingValue : value */);
}
```

- [ ] **Step 2: 手动验证**

Run: dev server，进入 `/parts` → 批量入库弹窗（min=0）与 `/scan`（min=1）各验证：输入 `0` 后按 `+` 得到正确值；输入 `12abc` 不截断；外部 value 变化（scan 页同码累加）后输入框显示最新值。

- [ ] **Step 3: 提交**

```bash
git add src/components/NumberInput.tsx
git commit -m "fix: NumberInput 显示与步进计算不一致 bug"
```

---

### Task 3: Toast + Confirm 组件

**Files:**
- Create: `src/components/ToastProvider.tsx`
- Create: `src/components/ConfirmProvider.tsx`
- Modify: `src/app/layout.tsx`（挂载 Provider）

**Interfaces:**
- Produces:
  - `export function ToastProvider({ children }: { children: ReactNode })` —— context 提供 `toast(message: string, type?: "success" | "error" | "info")`
  - `export function useToast(): { toast: (message: string, type?: "success" | "error" | "info") => void }`
  - `export function ConfirmProvider({ children }: { children: ReactNode })` —— context 提供 `confirmDialog(options): Promise<boolean>`
  - `export function useConfirm(): (options: { title: string; message: string; confirmText?: string; cancelText?: string; danger?: boolean }) => Promise<boolean>`

- [ ] **Step 1: 创建 ToastProvider.tsx**

```tsx
"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Check, X, Info } from "lucide-react";

interface ToastItem { id: number; message: string; type: "success" | "error" | "info" }
interface ToastContextType { toast: (message: string, type?: ToastItem["type"]) => void }

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toast = useCallback((message: string, type: ToastItem["type"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  const icons = {
    success: <Check className="w-4 h-4" />,
    error: <X className="w-4 h-4" />,
    info: <Info className="w-4 h-4" />,
  } as const;
  const colors = {
    success: "bg-emerald-500",
    error: "bg-red-500",
    info: "bg-blue-500",
  } as const;

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[200] space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className={`${colors[t.type]} text-white px-4 py-3 rounded-xl shadow-lg animate-fade-in flex items-center gap-2`}>
            {icons[t.type]}
            <span className="text-sm font-medium">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() { return useContext(ToastContext); }
```

- [ ] **Step 2: 创建 ConfirmProvider.tsx**

```tsx
"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface ConfirmOptions { title: string; message: string; confirmText?: string; cancelText?: string; danger?: boolean }
type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;
interface PendingConfirm extends ConfirmOptions { resolve: (v: boolean) => void }

const ConfirmContext = createContext<ConfirmFn>(() => Promise.resolve(false));

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const confirmDialog = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => setPending({ ...options, resolve }));
  }, []);

  const close = (result: boolean) => {
    pending?.resolve(result);
    setPending(null);
  };

  return (
    <ConfirmContext.Provider value={confirmDialog}>
      {children}
      {pending && (
        <div className="fixed inset-0 modal-backdrop z-[150] flex items-center justify-center p-4 animate-fade-in" onClick={() => close(false)}>
          <div className="bg-white dark:bg-[var(--card)] rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center ${pending.danger ? "bg-red-100 dark:bg-red-500/20" : "bg-blue-100 dark:bg-blue-500/20"}`}>
                <AlertTriangle className={`w-5 h-5 ${pending.danger ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-[var(--card-foreground)]">{pending.title}</h3>
                <p className="text-sm text-gray-500 dark:text-[var(--foreground-subtle)] mt-1">{pending.message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => close(false)} className="px-4 py-2 text-gray-700 dark:text-[var(--foreground-muted)] hover:bg-gray-100 dark:hover:bg-[var(--background-subtle)] rounded-lg transition-colors">
                {pending.cancelText || "取消"}
              </button>
              <button
                onClick={() => close(true)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${pending.danger ? "bg-red-500 text-white hover:bg-red-600" : "bg-blue-600 text-white hover:bg-blue-700"}`}
              >
                {pending.confirmText || "确认"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() { return useContext(ConfirmContext); }
```

- [ ] **Step 3: layout.tsx 挂载 Provider**

```tsx
import { ToastProvider } from "@/components/ToastProvider";
import { ConfirmProvider } from "@/components/ConfirmProvider";

// 在 <ThemeProvider> 内部包裹：
<ThemeProvider>
  <ToastProvider>
    <ConfirmProvider>
      <AppShell>{children}</AppShell>
    </ConfirmProvider>
  </ToastProvider>
</ThemeProvider>
```

- [ ] **Step 4: 验证 + 提交**

Run: `npx eslint src/components/ToastProvider.tsx src/components/ConfirmProvider.tsx src/app/layout.tsx`（0 error）
验证：dev server 首页无报错。
```bash
git add src/components/ToastProvider.tsx src/components/ConfirmProvider.tsx src/app/layout.tsx
git commit -m "feat: Toast 与 Promise 式 Confirm 组件"
```

---

### Task 4: 全站原生弹窗替换（alert/confirm/prompt）

**Files:**
- Modify: `src/app/parts/page.tsx`（alert ×6、confirm ×4、prompt ×1、行内报错）
- Modify: `src/app/parts/[id]/page.tsx`（alert ×2）
- Modify: `src/app/boms/page.tsx`（alert ×2、confirm ×2）
- Modify: `src/app/boms/[id]/page.tsx`（alert ×5）
- Modify: `src/app/scan/page.tsx`（confirm ×1）
- Modify: `src/components/PartFormModal.tsx`（alert ×2）
- Modify: `src/components/StockMovement.tsx`（无原生弹窗，但见 Task 4 末步移除操作人输入框）

**Interfaces:**
- Consumes: `useToast()`、`useConfirm()`（Task 3）

- [ ] **Step 1: parts/page.tsx —— alert 换 toast**

每个页面组件顶部加：
```tsx
const { toast } = useToast();
```
规则：错误 → `toast(data.error || "导出失败", "error")`；成功 → `toast("已删除", "success")`。
替换点（行号为替换前）：
- L215 `alert("导出失败")` → `toast("导出失败", "error")`
- L303 `alert("删除失败")` → `toast("删除失败", "error")`
- L353 `alert(...)`、L357、L379、L384、L388、L1054、L1168 等按同样模式替换（先读文件确认语义再改）
- fetch 失败处（L281-284 catch）补 `toast("加载失败", "error")`，避免误显示"暂无器件"

- [ ] **Step 2: parts/page.tsx —— confirm 换 useConfirm**

```tsx
const confirm = useConfirm();
```
- L297 `handleDelete`：`if (!confirm(...)) return;` → `const ok = await confirm({ title: "删除器件", message: `确定删除器件"${name}"？此操作不可撤销。`, danger: true }); if (!ok) return;`
- L335 `handleBatchDelete`、其余 confirm（L349、L1168 附近）同模式，danger: true

- [ ] **Step 3: parts/page.tsx —— prompt 换内联弹窗（保存搜索名）**

- 删除 L152 `const name = prompt("请输入搜索名称:")` 逻辑，改为状态驱动：
```tsx
const [showSaveSearch, setShowSaveSearch] = useState(false);
const [saveSearchName, setSaveSearchName] = useState("");
```
- `saveCurrentSearch` 改为打开弹窗；新增确认按钮提交（复用现有 `params` 构造逻辑与 `setSavedSearches`）：
```tsx
const confirmSaveSearch = () => {
  const name = saveSearchName.trim();
  if (!name) return;
  const params: Record<string, string> = {};
  if (search) params.q = search;
  if (category) params.category = category;
  if (brand) params.brand = brand;
  if (stockMin) params.stockMin = stockMin;
  if (stockMax) params.stockMax = stockMax;
  if (lowStockOnly) params.lowStock = "true";
  if (hasStockOnly) params.hasStock = "true";
  const newSaved = [...savedSearches, { name, params }];
  setSavedSearches(newSaved);
  localStorage.setItem("savedSearches", JSON.stringify(newSaved));
  setShowSaveSearch(false);
  setSaveSearchName("");
  toast("搜索条件已保存", "success");
};
```
- 页面 JSX 末尾加与现有 modal 样式一致的弹窗（`fixed inset-0 modal-backdrop z-50 ...`），含名称输入框与取消/确认按钮。

- [ ] **Step 4: parts/[id]/page.tsx、boms/page.tsx、boms/[id]/page.tsx、scan/page.tsx**

同 Step 1-2 模式逐个替换（boms/[id] L62/L97/L145/L153、boms L41/L47/L162/L175/L181、scan L246 clearAll、parts/[id] L50）。删除操作一律 `danger: true`。

- [ ] **Step 5: PartFormModal.tsx**

- 报错 `alert`（L68/L74 附近）→ `toast(data.error || "保存失败", "error")`
- 先读该文件确认行号与上下文（它内部有 form 校验）

- [ ] **Step 6: StockMovement.tsx —— 移除操作人输入框**

- 删除 `operator` state（L52）、操作人 input JSX（L300-311）
- 在器件卡（part && 区块）显示只读当前用户：`useEffect` 拉取 `/api/auth/me` 存 `const [username, setUsername] = useState("")`，展示 `<p className="text-xs ...">操作人: {username}</p>`
- `handleSubmit` body 中删除 `operator` 字段（服务端 `movements/route.ts:31-32` 本就用 session 用户覆盖）

- [ ] **Step 7: 验证 + 提交**

Run: `npx eslint src/app/parts/page.tsx src/app/parts/[id]/page.tsx src/app/boms/page.tsx "src/app/boms/[id]/page.tsx" src/app/scan/page.tsx src/components/PartFormModal.tsx src/components/StockMovement.tsx`
Run: `npx vitest run`
验证：`Get-ChildItem src -Recurse -Include *.tsx,*.ts | Select-String -Pattern "\b(alert|confirm|prompt)\(" | Where-Object { $_.Line -notmatch "//" }` 结果为空（除注释外）
```bash
git add -A src
git commit -m "refactor: 原生弹窗替换为 Toast/Confirm 组件，移除操作人输入框"
```

---

### Task 5: 扫码去重冲突修复（QRScanner + scan 页）

**Files:**
- Modify: `src/components/QRScanner.tsx`
- Modify: `src/app/scan/page.tsx`

**Interfaces:**
- Consumes: Task 1 的 `parseScanData`
- Produces: QRScanner 每次扫码都回调；scan 页实现 1.5s 窗口去重 + 超窗口同码累加

- [ ] **Step 1: QRScanner 移除会话级去重**

- 删除 `scannedCodesRef`（L25）、`handleClose` 中的 `scannedCodesRef.current.clear()`（L172）
- 扫码回调（L114-119）删除去重判断，直接 `handleScanResult(decodedText)`

- [ ] **Step 2: scan 页去重/累加窗口逻辑**

```tsx
const lastScanRef = useRef<{ code: string; time: number }>({ code: "", time: 0 });

const processScanData = useCallback((raw: string) => {
  const scanData = parseScanData(raw);
  if (!scanData || !scanData.pc) return;

  const now = Date.now();
  if (lastScanRef.current.code === scanData.pc && now - lastScanRef.current.time < 1500) {
    return; // 1.5s 内连扫同码视为误触发
  }
  lastScanRef.current = { code: scanData.pc, time: now };

  const scanQty = parseInt(scanData.qty || "1", 10) || 1;
  setPendingItems((prev) => {
    const existing = prev.find((item) => item.scanData.pc === scanData.pc);
    if (existing) {
      return prev.map((item) =>
        item.scanData.pc === scanData.pc ? { ...item, quantity: item.quantity + scanQty } : item
      );
    }
    const itemId = Date.now().toString() + Math.random().toString(36).slice(2);
    const newItem: PendingItem = { id: itemId, scanData, productInfo: null, status: "loading", quantity: scanQty, location: "" };
    // 注意：async lookup 后续仍用 setPendingItems(prev => ...) 函数式更新，避免闭包陈旧
    return [newItem, ...prev];
  });
  // ... lookup/LCEDA 部分保持，但内部 setPendingItems 已用函数式更新（现状即是），
  // 依赖数组由 [pendingItems] 改为 []，函数内部不再引用 pendingItems
}, []);
```

- 关键：`processScanData` 的 `useCallback` 依赖数组从 `[pendingItems]` 改为 `[]`（内部全部函数式更新），彻底消除快速连扫同码的竞态漏判。

- [ ] **Step 3: scan 页防抖提示（可选轻提示）**

扫描 1.5s 窗口内重复时不做任何事（静默）即可；如需要可见反馈，可加 `toast("重复扫码已忽略", "info")`。

- [ ] **Step 4: 验证 + 提交**

Run: `npx eslint src/components/QRScanner.tsx src/app/scan/page.tsx`；`npx vitest run`
验证：/scan 连扫同码两次（间隔 <1.5s）无新条目；间隔 >1.5s 后同码数量累加；手动输入同码也累加。
```bash
git add src/components/QRScanner.tsx src/app/scan/page.tsx
git commit -m "fix: 扫码去重与累加逻辑冲突（去重窗口上移至页面）"
```

---

### Task 6: db 层 batchStockInUpsert（SQLite + Redis）+ 单测

**Files:**
- Modify: `src/lib/db.ts`（接口）
- Modify: `src/lib/db-sqlite.ts`
- Modify: `src/lib/db-redis.ts`
- Create: `src/lib/__tests__/db-sqlite.test.ts`

**Interfaces:**
- Consumes: `Part`、`BatchResult` 模式
- Produces（接口新增）:
```ts
export interface StockInUpsertItem {
  code: string;
  name: string;
  category?: string;
  package?: string;
  brand?: string;
  model?: string;
  unit?: string;
  location?: string;
  quantity: number;
}
export interface StockInUpsertResult {
  results: Array<{ code: string; partId: string; success: boolean; message?: string; newQuantity?: number }>;
  successCount: number;
  failCount: number;
}
// DatabaseAdapter 新增：
batchStockInUpsert(items: StockInUpsertItem[], operator?: string, reason?: string): Promise<StockInUpsertResult>;
```

- [ ] **Step 1: 写失败测试（db-sqlite.test.ts）**

```ts
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
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/lib/__tests__/db-sqlite.test.ts`
Expected: FAIL（`batchStockInUpsert` 不存在）

- [ ] **Step 3: db.ts 接口 + db-sqlite.ts 实现**

db.ts 增加上述接口与类型（放在 `BatchResult` 定义后）。

db-sqlite.ts 实现（事务内逐条 try/catch，复用现有逻辑）：
```ts
async batchStockInUpsert(items: StockInUpsertItem[], operator?: string, reason?: string): Promise<StockInUpsertResult> {
  const now = new Date().toISOString();
  const results: StockInUpsertResult["results"] = [];
  this.runInTransaction(() => {
    for (const item of items) {
      try {
        const existing = this.db.prepare("SELECT p.*, s.quantity as stockQuantity FROM parts p LEFT JOIN stock s ON s.partId = p.id WHERE p.code = ?").get(item.code) as Record<string, unknown> | undefined;
        let partId: string;
        let currentQty: number;
        if (existing) {
          partId = existing.id as string;
          currentQty = (existing.stockQuantity as number) ?? 0;
        } else {
          const id = randomUUID();
          this.db.prepare("INSERT INTO parts (id, code, name, category, package, brand, model, unit, minStock, location, note, image, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, '', '', ?, ?)").run(
            id, item.code, item.name, item.category || "", item.package || "", item.brand || "", item.model || "", item.unit || "pcs", item.location || "", now, now
          );
          this.db.prepare("INSERT INTO stock (id, partId, quantity) VALUES (?, ?, 0)").run(randomUUID(), id);
          partId = id;
          currentQty = 0;
        }
        const newQty = currentQty + item.quantity;
        this.db.prepare("INSERT INTO stock_movements (id, partId, type, quantity, operator, reason, code, createdAt) VALUES (?, ?, 'IN', ?, ?, ?, '', ?)").run(randomUUID(), partId, item.quantity, operator || "", reason || "扫码入库", now);
        this.db.prepare("UPDATE stock SET quantity = ?, updatedAt = ? WHERE partId = ?").run(newQty, now, partId);
        this.db.prepare("UPDATE parts SET updatedAt = ? WHERE id = ?").run(now, partId);
        results.push({ code: item.code, partId, success: true, newQuantity: newQty });
      } catch (e) {
        results.push({ code: item.code, partId: "", success: false, message: e instanceof Error ? e.message : "入库失败" });
      }
    }
  });
  return { results, successCount: results.filter(r => r.success).length, failCount: results.filter(r => !r.success).length };
}
```

- [ ] **Step 4: db-redis.ts 实现（尽力一致）**

循环 items：`getPartByCode` 命中则 `createMovement({partId, type:"IN", quantity, operator, reason})`；未命中则 `createPart` 后 `createMovement`。catch 单条失败，收集 results。`newQuantity` 从 createMovement 返回值取。

- [ ] **Step 5: 运行测试通过 + lint + 提交**

Run: `npx vitest run`（全部通过）；`npx eslint src/lib/db.ts src/lib/db-sqlite.ts src/lib/db-redis.ts`
```bash
git add src/lib/db.ts src/lib/db-sqlite.ts src/lib/db-redis.ts src/lib/__tests__/db-sqlite.test.ts
git commit -m "feat: db 层事务性批量扫码入库 batchStockInUpsert"
```

---

### Task 7: /api/parts/batch 新增 stock-in-upsert + scan 页提交改造

**Files:**
- Modify: `src/app/api/parts/batch/route.ts`
- Modify: `src/app/scan/page.tsx`

**Interfaces:**
- Consumes: Task 6 的 `batchStockInUpsert`
- Produces:
  - `POST /api/parts/batch` body `{ action: "stock-in-upsert", items: StockInUpsertItem[], reason?: string }` → `{ success: true, ...StockInUpsertResult }`

- [ ] **Step 1: batch/route.ts 增加 action**

```ts
const stockInUpsertSchema = z.object({
  items: z.array(z.object({
    code: z.string().min(1),
    name: z.string().min(1),
    category: z.string().optional().default(""),
    package: z.string().optional().default(""),
    brand: z.string().optional().default(""),
    model: z.string().optional().default(""),
    unit: z.string().optional().default("pcs"),
    location: z.string().optional().default(""),
    quantity: z.number().int().positive(),
  })).min(1),
  reason: z.string().optional(),
});

if (action === "stock-in-upsert") {
  const { items, reason } = stockInUpsertSchema.parse(body);
  const sessionUser = await verifySessionToken(request.cookies.get(AUTH_COOKIE)?.value);
  const result = await db.batchStockInUpsert(items, sessionUser || "", reason || "扫码入库");
  return NextResponse.json({ success: true, ...result });
}
```

- [ ] **Step 2: scan 页 handleBatchSubmit 改为单请求**

```tsx
const handleBatchSubmit = async () => {
  const readyItems = pendingItems.filter((item) => item.status === "ready");
  if (readyItems.length === 0) return;
  setIsSubmitting(true);
  setSubmitResult(null);
  try {
    const res = await fetch("/api/parts/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "stock-in-upsert",
        reason: "扫码入库",
        items: readyItems.map((item) => ({
          code: item.scanData.pc!,
          name: item.customName || item.productInfo?.name || item.scanData.pm || item.scanData.pc!,
          category: item.productInfo?.category || "",
          package: item.productInfo?.package || "",
          brand: item.productInfo?.brand || "",
          model: item.productInfo?.model || item.scanData.pm || "",
          unit: item.productInfo?.unit || "pcs",
          location: item.location,
          quantity: item.quantity,
        })),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "批量入库失败");
    const okIds = new Set(
      data.results.filter((r: { success: boolean }) => r.success).map((r: { code: string }) => {
        const item = readyItems.find((i) => i.scanData.pc === r.code);
        return item?.id;
      })
    );
    setSubmitResult({
      success: data.successCount,
      failed: data.failCount,
      message: `入库完成：成功 ${data.successCount} 件${data.failCount > 0 ? `，失败 ${data.failCount} 件` : ""}`,
    });
    if (okIds.size > 0) {
      setPendingItems((prev) => prev.filter((item) => !okIds.has(item.id)));
    }
  } catch {
    setSubmitResult({ success: 0, failed: readyItems.length, message: "批量入库失败，请重试" });
  } finally {
    setIsSubmitting(false);
  }
};
```

- 说明：`PendingItem.productInfo` 类型 `LcedaProduct` 可能无 `unit` 字段——用 `(item.productInfo as { unit?: string })?.unit || "pcs"` 兜底。失败条目保留在列表并标记 error（沿用原逻辑：失败项不移除）。

- [ ] **Step 3: 验证 + 提交**

Run: `npx eslint src/app/api/parts/batch/route.ts src/app/scan/page.tsx`；`npx vitest run`
验证：/scan 扫两个新编码 → 全部入库 → 一次请求成功、无孤儿器件（数据/目录无残留）；再扫已存在编码 → 库存累加。
```bash
git add src/app/api/parts/batch/route.ts src/app/scan/page.tsx
git commit -m "feat: 扫码批量入库改走事务性 upsert 端点"
```

---

### Task 8: db 层 BOM 领料 checkoutBomItems + 单测

**Files:**
- Modify: `src/lib/db.ts`（接口）
- Modify: `src/lib/db-sqlite.ts`
- Modify: `src/lib/db-redis.ts`
- Modify: `src/lib/__tests__/db-sqlite.test.ts`

**Interfaces:**
- Produces（接口新增）:
```ts
export interface CheckoutResult {
  success: true;
  results: Array<{ partId: string; code: string; name: string; quantity: number; newQuantity: number }>;
}
export interface CheckoutInsufficient {
  success: false;
  insufficient: Array<{ partId: string; code: string; name: string; required: number; available: number; shortfall: number }>;
}
// DatabaseAdapter 新增：
checkoutBomItems(items: Array<{ partId: string; quantity: number }>, operator?: string, reason?: string): Promise<CheckoutResult | CheckoutInsufficient>;
```

- [ ] **Step 1: 追加失败测试**

```ts
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
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/lib/__tests__/db-sqlite.test.ts`
Expected: FAIL（`checkoutBomItems` 不存在）

- [ ] **Step 3: db-sqlite.ts 实现**

```ts
async checkoutBomItems(items: Array<{ partId: string; quantity: number }>, operator?: string, reason?: string): Promise<CheckoutResult | CheckoutInsufficient> {
  const insufficient: CheckoutInsufficient["insufficient"] = [];
  for (const item of items) {
    const part = this.db.prepare("SELECT p.id, p.code, p.name, COALESCE(s.quantity, 0) as available FROM parts p LEFT JOIN stock s ON s.partId = p.id WHERE p.id = ?").get(item.partId) as { id: string; code: string; name: string; available: number } | undefined;
    if (!part) { insufficient.push({ partId: item.partId, code: "?", name: "器件不存在", required: item.quantity, available: 0, shortfall: item.quantity }); continue; }
    if (part.available < item.quantity) {
      insufficient.push({ partId: item.partId, code: part.code, name: part.name, required: item.quantity, available: part.available, shortfall: item.quantity - part.available });
    }
  }
  if (insufficient.length > 0) return { success: false, insufficient };

  const now = new Date().toISOString();
  const results: CheckoutResult["results"] = [];
  this.runInTransaction(() => {
    for (const item of items) {
      const part = this.db.prepare("SELECT p.id, p.code, p.name, COALESCE(s.quantity, 0) as available FROM parts p LEFT JOIN stock s ON s.partId = p.id WHERE p.id = ?").get(item.partId) as { id: string; code: string; name: string; available: number };
      if (part.available < item.quantity) throw new Error("库存不足"); // 事务内二次校验，竞态时整体回滚
      const newQty = part.available - item.quantity;
      this.db.prepare("INSERT INTO stock_movements (id, partId, type, quantity, operator, reason, code, createdAt) VALUES (?, ?, 'OUT', ?, ?, ?, '', ?)").run(randomUUID(), item.partId, item.quantity, operator || "", reason || "BOM 领料", now);
      this.db.prepare("UPDATE stock SET quantity = ?, updatedAt = ? WHERE partId = ?").run(newQty, now, item.partId);
      this.db.prepare("UPDATE parts SET updatedAt = ? WHERE id = ?").run(now, item.partId);
      results.push({ partId: item.partId, code: part.code, name: part.name, quantity: item.quantity, newQuantity: newQty });
    }
  });
  return { success: true, results };
}
```

- [ ] **Step 4: db-redis.ts 实现（尽力一致）**

先逐个 `getPart` 校验库存，任一不足返回 `{ success: false, insufficient }`；全部充足则逐个 `createMovement`（OUT）收集 results。

- [ ] **Step 5: 测试通过 + lint + 提交**

Run: `npx vitest run`；`npx eslint src/lib/db.ts src/lib/db-sqlite.ts src/lib/db-redis.ts`
```bash
git add src/lib/db.ts src/lib/db-sqlite.ts src/lib/db-redis.ts src/lib/__tests__/db-sqlite.test.ts
git commit -m "feat: db 层 BOM 领料整体事务 checkoutBomItems"
```

---

### Task 9: POST /api/boms/[id]/checkout 端点

**Files:**
- Create: `src/app/api/boms/[id]/checkout/route.ts`

**Interfaces:**
- Consumes: Task 8 的 `checkoutBomItems`
- Produces:
  - `POST /api/boms/[id]/checkout` body `{ items: [{ partId, quantity }], reason?: string }`
  - 成功 → 200 `{ success: true, results: [...] }`
  - 缺料 → 409 `{ success: false, error: "库存不足", insufficient: [...] }`

- [ ] **Step 1: 实现端点**

```ts
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
```

- [ ] **Step 2: 验证 + 提交**

验证：dev server 用浏览器或 curl：先入库 Z0001×10，POST `/api/boms/{任意id}/checkout` `{items:[{partId, quantity:5}]}` → 200；`{quantity:99}` → 409 insufficient。
Run: `npx eslint "src/app/api/boms/[id]/checkout/route.ts"`
```bash
git add "src/app/api/boms/[id]/checkout/route.ts"
git commit -m "feat: BOM 领料出库端点"
```

---

### Task 10: BOM 详情页领料出库 UI + 编辑脏检查

**Files:**
- Modify: `src/app/boms/[id]/page.tsx`

**Interfaces:**
- Consumes: Task 9 端点、Task 3 `useToast`/`useConfirm`

- [ ] **Step 1: 领料出库弹窗**

- 查看模式下新增"领料出库"按钮（放在"编辑"旁）：
```tsx
const [showCheckout, setShowCheckout] = useState(false);
const [checkoutItems, setCheckoutItems] = useState<Record<string, boolean>>({}); // partId -> 勾选
const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
const { toast } = useToast();
```
- 打开时初始化：`setCheckoutItems(Object.fromEntries(bom.items.map(i => [i.partId, i.currentStock >= i.quantity])))`（缺料默认不勾选）
- 弹窗内每行：`需要 {quantity} / 库存 {currentStock}`，缺口项红色加 `缺口 {shortfall}`，checkbox 控制勾选
- 确认提交：
```tsx
const handleCheckout = async () => {
  const selected = bom.items.filter((i) => checkoutItems[i.partId]);
  if (selected.length === 0) { toast("请至少选择一项", "error"); return; }
  setCheckoutSubmitting(true);
  try {
    const res = await fetch(`/api/boms/${params.id}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: selected.map((i) => ({ partId: i.partId, quantity: i.quantity })) }),
    });
    const data = await res.json();
    if (!res.ok) { toast(data.error || "领料失败", "error"); return; }
    toast(`领料成功：${data.results.length} 项`, "success");
    setShowCheckout(false);
    fetchBom();
  } catch {
    toast("领料失败", "error");
  } finally {
    setCheckoutSubmitting(false);
  }
};
```

- [ ] **Step 2: 编辑脏检查**

```tsx
const isDirty = editing && (
  editName !== bom.name ||
  editDescription !== bom.description ||
  JSON.stringify(editItems.map((i) => ({ partId: i.partId, quantity: i.quantity }))) !==
    JSON.stringify(bom.items.map((i) => ({ partId: i.partId, quantity: i.quantity })))
);
```
- "取消"按钮（L227-232）改为：
```tsx
const handleCancelEdit = async () => {
  if (isDirty) {
    const ok = await confirm({ title: "放弃修改", message: "有未保存的改动，确定放弃？", danger: true });
    if (!ok) return;
  }
  setEditing(false);
  setEditItems(bom.items || []);
  setEditName(bom.name);
  setEditDescription(bom.description);
};
```

- [ ] **Step 3: 验证 + 提交**

Run: `npx eslint "src/app/boms/[id]/page.tsx"`
验证：/boms/[id] 点领料出库 → 全满足成功并刷新库存；有缺料项时默认不勾选、标红；后端 409 时 toast 错误。编辑模式改数量后点取消 → 弹确认。
```bash
git add "src/app/boms/[id]/page.tsx"
git commit -m "feat: BOM 领料出库 UI 与编辑脏检查"
```

---

### Task 11: 服务端排序 + 设置项全接线

**Files:**
- Modify: `src/lib/db.ts`（PartFilters 加字段）
- Modify: `src/lib/db-sqlite.ts`（listParts 排序）
- Modify: `src/lib/db-redis.ts`（listParts 排序）
- Modify: `src/lib/validations.ts`（searchSchema 加排序字段）
- Modify: `src/app/api/parts/route.ts`（透传排序参数）
- Modify: `src/app/parts/page.tsx`（移除客户端排序、默认值读设置、pageSize 读设置）
- Modify: `src/app/api/dashboard/route.ts`（无改动，见 Step 5）
- Modify: `src/lib/db-sqlite.ts`（getDashboard/getAlerts 读 low_stock_threshold，见 Step 5）
- Modify: `src/components/PartFormModal.tsx`（default_unit，见 Step 6）

**Interfaces:**
- Produces:
  - `PartFilters` 增加 `sortField?: string; sortOrder?: "asc" | "desc"`
  - `GET /api/parts` 支持 `sortField`（`code|name|category|brand|stock|location|updatedAt|createdAt`）与 `sortOrder`（`asc|desc`）

- [ ] **Step 1: 类型与白名单（db.ts + validations.ts + db-sqlite.ts + db-redis.ts）**

db.ts：
```ts
export interface PartFilters {
  // ...现有字段
  sortField?: string;
  sortOrder?: "asc" | "desc";
}
```
validations.ts searchSchema 增加：
```ts
sortField: z.enum(["code", "name", "category", "brand", "stock", "location", "updatedAt", "createdAt"]).optional(),
sortOrder: z.enum(["asc", "desc"]).optional(),
```
db-sqlite.ts listParts：把 L125 的 `ORDER BY p.updatedAt DESC` 替换为：
```ts
const sortFieldMap: Record<string, string> = {
  code: "p.code", name: "p.name", category: "p.category", brand: "p.brand",
  stock: "COALESCE(s.quantity, 0)", location: "p.location", updatedAt: "p.updatedAt", createdAt: "p.createdAt",
};
const sortField = filters.sortField && sortFieldMap[filters.sortField] ? filters.sortField : "updatedAt";
const sortOrder = filters.sortOrder === "asc" ? "ASC" : "DESC";
const orderBy = `${sortFieldMap[sortField]} ${sortOrder}`;
// SQL 改为：... ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?
```
db-redis.ts listParts：内存过滤后按同样字段排序（`localeCompare`/数值，参考现 parts 页 L81-104 逻辑迁移过来）。

- [ ] **Step 2: /api/parts GET 透传**

```ts
sortField: searchParams.get("sortField") || undefined,
sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || undefined,
```

- [ ] **Step 3: parts 页移除客户端排序、接默认设置**

- `SortField` 类型扩展 `"updatedAt" | "createdAt"`；删除 `sortedParts`（L81-104），所有使用处改为 `data.parts`
- 删除 `handleSort` 的客户端逻辑，改为写入状态（fetch 触发）
- 挂载时拉设置：
```tsx
const [pageSize, setPageSize] = useState(20);
const [settingsLoaded, setSettingsLoaded] = useState(false);
useEffect(() => {
  fetch("/api/settings").then((r) => r.json()).then((s) => {
    if (s?.page_size) setPageSize(Number(s.page_size) || 20);
    if (s?.default_sort_field) setSortField((s.default_sort_field as SortField) || "name");
    if (s?.default_sort_order) setSortDirection((s.default_sort_order as SortDirection) || "asc");
  }).catch(() => {}).finally(() => setSettingsLoaded(true));
}, []);
```
- `fetchParts`：`params.set("pageSize", String(pageSize))`；`params.set("sortField", sortField)`；`params.set("sortOrder", sortDirection)`；依赖数组加 `pageSize, sortField, sortDirection`
- 注意：`settingsLoaded` 之前不要发起 fetch（fetchParts 依赖 `settingsLoaded` 或用空加载守卫）

- [ ] **Step 4: 验证排序跨页**

验证：/parts 点"库存"列排序 → 第二页排序正确（服务端）；设置页改默认排序/每页条数 → 保存后 parts 页生效。

- [ ] **Step 5: low_stock_threshold 接线（db 层）**

db-sqlite.ts：
- `getDashboard()` 与 `getAlerts()` 开头读取 `const thresholdRow = await this.getSetting("low_stock_threshold")`，`const threshold = parseInt(thresholdRow || "10", 10)`
- 语义：有效预警值 = `minStock > 0 ? minStock : threshold`
  - `getAlerts` L88 lowStockParts WHERE 改为 `AND COALESCE(s.quantity, 0) < CASE WHEN p.minStock > 0 THEN p.minStock ELSE ? END`（参数 threshold）
  - `getAlerts` L92 stats 同步改
  - `getDashboard` L78 lowStockCount 同步改
- db-redis.ts 尽力一致（读 setting 后内存过滤）
- parts 页 lowStock 筛选（db-sqlite L120）：同样改为 CASE 语义
- 验证：设置阈值 50 → 库存 20 且 minStock=0 的器件出现在仪表盘预警

- [ ] **Step 6: default_unit 接线（PartFormModal）**

先读 `src/components/PartFormModal.tsx` 确认现有单位输入（审计：L38 硬编码 "pcs"）。改为：新增时（无 editPart）在弹窗打开时 `fetch("/api/settings")` 取 `default_unit` 作为单位初始值；有 editPart 时用器件自身 unit。

- [ ] **Step 7: 验证 + lint + 提交**

Run: `npx eslint src/lib/db.ts src/lib/db-sqlite.ts src/lib/db-redis.ts src/lib/validations.ts src/app/api/parts/route.ts src/app/parts/page.tsx src/components/PartFormModal.tsx`；`npx vitest run`
```bash
git add src/lib src/app/api/parts src/app/parts/page.tsx src/components/PartFormModal.tsx
git commit -m "feat: 服务端排序 + 设置项真实接线（排序/每页/阈值/单位）"
```

---

### Task 12: parts 筛选/排序/分页状态写回 URL

**Files:**
- Modify: `src/app/parts/page.tsx`

**Interfaces:**
- Consumes: Task 11 的状态字段
- Produces: URL searchParams 与筛选状态双向同步（q/category/brand/stockMin/stockMax/lowStock/hasStock/page/pageSize/sortField/sortOrder）

- [ ] **Step 1: mount 时从 URL 初始化**

把 L40-47 的 useState 初始化改为读取 searchParams（q、category、brand、stockMin、stockMax、lowStock、hasStock、page、sortField、sortOrder、pageSize 均读 URL，缺省用默认值）。注意 Task 11 中默认值来自 settings——初始化优先级：URL 参数 > 设置默认值 > 内置默认。

- [ ] **Step 2: 状态变化写回 URL（防抖 300ms）**

```tsx
const router = useRouter();
const firstRender = useRef(true);

useEffect(() => {
  if (firstRender.current) { firstRender.current = false; return; }
  const params = new URLSearchParams();
  if (search) params.set("q", search);
  if (category) params.set("category", category);
  if (brand) params.set("brand", brand);
  if (stockMin) params.set("stockMin", stockMin);
  if (stockMax) params.set("stockMax", stockMax);
  if (lowStockOnly) params.set("lowStock", "true");
  if (hasStockOnly) params.set("hasStock", "true");
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  params.set("sortField", sortField);
  params.set("sortOrder", sortDirection);
  const t = setTimeout(() => {
    router.replace(`/parts?${params.toString()}`, { scroll: false });
  }, 300);
  return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [search, category, brand, stockMin, stockMax, lowStockOnly, hasStockOnly, page, pageSize, sortField, sortDirection]);
```

- 关键：该 effect 只负责写 URL，不触发 fetch；fetch 仍由 fetchParts 依赖驱动，避免双重请求。`useSearchParams` 在 `next/navigation`，页面已在 Suspense 包裹（`PartsPageContent` 存在，确认外层有 `<Suspense>`；如无则参照 StockMovement 补上）。

- [ ] **Step 3: 验证 + 提交**

Run: `npx eslint src/app/parts/page.tsx`
验证：/parts 搜索"电阻"→ 地址栏出现 `?q=电阻`；刷新后筛选保持；浏览器后退恢复上一筛选；直接打开分享链接筛选生效。
```bash
git add src/app/parts/page.tsx
git commit -m "feat: parts 筛选/排序/分页状态同步到 URL"
```

---

### Task 13: CSS 全局覆盖移除 + 主题防闪

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Modify: `src/components/ThemeProvider.tsx`

- [ ] **Step 1: 移除全局覆盖**

删除 globals.css 中：
```css
.bg-white.rounded-2xl,
.bg-white.rounded-xl {
  padding: 10px;
}
.gap-5, .gap-6 {
  gap: 10px;
}
```
（保留 `th, td` 与 `.section` 规则——它们不是 Tailwind 类冲突）

- [ ] **Step 2: 逐页间距回归检查**

移除后 `gap-5`=20px、`gap-6`=24px、卡片默认 padding 恢复 Tailwind 默认（p-* 内联类生效）。用浏览器逐页检查：/、/parts、/parts/[id]、/stock-in、/scan、/boms、/boms/[id]、/analytics、/logs、/settings、/login。若某处间距明显异常（原代码依赖 10px），在该元素补 `gap-[10px]` 或调整内联类，不要加回全局覆盖。

- [ ] **Step 3: 主题防闪（layout.tsx 内联脚本）**

```tsx
<html lang="zh-CN" suppressHydrationWarning>
  <head>
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){try{var t=localStorage.getItem("theme")||"system";var r=t==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):t;document.documentElement.setAttribute("data-theme",r);}catch(e){}})();`,
      }}
    />
  </head>
  ...
```

- [ ] **Step 4: ThemeProvider 首帧同步**

`ThemeProvider` 的 mount effect 已会 `resolveAndApply(savedTheme)`——内联脚本已预涂，此处二次应用同一值，无闪烁。若想彻底避免，可将 `mounted` gate 提前：初始化 state 时读取 `localStorage.getItem("theme")`（useState 初始值函数在客户端执行）：
```tsx
const [theme, setThemeState] = useState<Theme>(() => {
  if (typeof window === "undefined") return "system";
  return (localStorage.getItem("theme") as Theme) || "system";
});
```
保留 `if (!mounted) return <>{children}</>` 结构不变（避免 SSR/CSR 差异），内联脚本保证首帧颜色正确。

- [ ] **Step 5: 验证 + 提交**

Run: `npx eslint src/app/layout.tsx src/components/ThemeProvider.tsx`
验证：浏览器 DevTools 将主题切到深色 → 刷新 → 首帧无白闪；浅色/系统模式同样验证。
```bash
git add src/app/globals.css src/app/layout.tsx src/components/ThemeProvider.tsx
git commit -m "fix: 移除 CSS 全局覆盖破坏间距 + 主题首帧防闪"
```

---

### Task 14: 仓库功能下线 + 帮助文档同步 + 快捷键补齐

**Files:**
- Modify: `src/components/Navigation.tsx`（移除仓库入口）
- Modify: `src/components/KeyboardShortcuts.tsx`（补齐 g+a/b/w/l/s/t/h，改 router.push）
- Delete: `src/app/warehouses/page.tsx`
- Delete: `src/app/api/warehouses/route.ts`、`src/app/api/warehouses/[id]/route.ts`
- Modify: `src/app/help/page.tsx`（同步快捷键表、移除失效功能宣传、移除仓库条目）

**Interfaces:**
- Consumes: 无（纯清理）
- Produces: 快捷键 `g+p/i/o/a/b/l/s/t/h` 全部可用（`g+s`=scan、`g+t`=settings、`g+h`=help）；`/warehouses` 及 API 404

- [ ] **Step 1: Navigation 移除仓库**

`mainLinks` 删除 `{ href: "/warehouses", label: "仓库管理", icon: Warehouse }`，删除 `Warehouse` 导入（L5）。移动端"更多"菜单 `mainLinks.slice(4)` 自动同步。

- [ ] **Step 2: KeyboardShortcuts 补齐**

```tsx
import { useRouter } from "next/navigation";
// 组件内：
const router = useRouter();
// handleKeyDown 中替换 switch：
switch (e.key) {
  case "p": router.push("/parts"); return;
  case "i": router.push("/stock-in"); return;
  case "o": router.push("/stock-out"); return;
  case "a": router.push("/analytics"); return;
  case "b": router.push("/boms"); return;
  case "l": router.push("/logs"); return;
  case "s": router.push("/scan"); return;
  case "t": router.push("/settings"); return;
  case "h": router.push("/help"); return;
}
```
- `pageShortcuts` 表（L18-27）补齐 `g a / g b / g l / g s / g t / g h` 条目（label 与帮助页一致）

- [ ] **Step 3: 删除仓库页面与路由**

```bash
Remove-Item src/app/warehouses/page.tsx
Remove-Item src/app/api/warehouses/route.ts
Remove-Item src/app/api/warehouses/[id]/route.ts
```
（保留 db 层 warehouses 方法与数据表——数据安全，无迁移）

- [ ] **Step 4: 帮助页同步**

先读 `src/app/help/page.tsx`，然后：
- 删除仓库相关条目（"多仓库支持""分仓库存查询"）
- 删除失效宣传："批量补全图片""自动下载产品图片""时间范围查询"
- 快捷键表与 Step 2 实际实现一致

- [ ] **Step 5: 验证 + 提交**

Run: `npx eslint src/components/Navigation.tsx src/components/KeyboardShortcuts.tsx src/app/help/page.tsx`；`npx vitest run`
验证：`/warehouses` 返回 404；快捷键 g+s/g+t/g+h 生效（SPA 跳转无整页刷新）；帮助页无仓库/失效功能条目。
```bash
git add src/components/Navigation.tsx src/components/KeyboardShortcuts.tsx src/app/help/page.tsx
git rm src/app/warehouses/page.tsx src/app/api/warehouses/route.ts "src/app/api/warehouses/[id]/route.ts"
git commit -m "refactor: 下线仓库孤岛功能，同步帮助文档与快捷键"
```

---

### Task 15: 移动端列表复选框 + 批量操作栏

**Files:**
- Modify: `src/app/parts/page.tsx`

**Interfaces:**
- Consumes: Task 11 移除 sortedParts 后的 `data.parts`、现有批量状态（selectedIds/toggleSelect/toggleSelectAll/批量按钮）
- Produces: 移动卡片视图支持勾选与批量工具栏

- [ ] **Step 1: 移动卡片加复选框**

先读 parts/page.tsx 移动卡片渲染段（约 L915-953）。每张卡片左上角加：
```tsx
<button onClick={() => toggleSelect(part.id)} className="p-2 shrink-0">
  {selectedIds.has(part.id) ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5 text-gray-400" />}
</button>
```
（`CheckSquare`/`Square` 已在 L6 导入）

- [ ] **Step 2: 移动端批量工具栏**

- 选中数 > 0 时，在卡片列表上方（或复用桌面批量工具栏逻辑）显示悬浮条：`已选 {n} 项` + 批量入库/出库/删除按钮（复用桌面已有的 `handleBatchMovement`/`handleBatchDelete` 与弹窗，先读 L340-460 确认现有批量 UI 结构再复用）
- 列表底部加"全选"开关（`toggleSelectAll` 基于 `data.parts`）

- [ ] **Step 3: 验证 + 提交**

Run: `npx eslint src/app/parts/page.tsx`
验证：浏览器 DevTools 移动端模式（375px）→ /parts 勾选多个 → 批量入库弹窗正常 → 提交成功。
```bash
git add src/app/parts/page.tsx
git commit -m "feat: 移动端列表复选框与批量操作"
```

---

### Task 16: 全量验收

- [ ] **Step 1: 自动化**

Run: `npx eslint .`（0 errors）
Run: `npx vitest run`（全部通过）

- [ ] **Step 2: 手动验收清单（浏览器，dev server）**

对照 `docs/superpowers/specs/2026-08-02-core-ux-fixes-design.md` 第 5.2 节逐项勾选：
- [ ] 连扫同码：1.5s 内重复被忽略，超窗口累加数量
- [ ] 扫码页新编码可"创建并入库"，一次提交无孤儿数据
- [ ] BOM 领料：全满足一次成功；缺料勾选跳过可部分领料；后端 409 防超卖
- [ ] parts 排序跨页正确（服务端排序）
- [ ] 筛选/排序/页码写回 URL；刷新、后退恢复
- [ ] 设置页 5 项全部生效（page_size、阈值、单位、默认排序）
- [ ] 全站无 alert/confirm/prompt 残留（grep 验证）
- [ ] 移除 CSS 覆盖后关键页面间距正常
- [ ] 深色模式首屏不闪白
- [ ] 仓库入口/页面/API 已移除，帮助页无失效宣传
- [ ] 登录、扫码、出入库主流程回归通过

- [ ] **Step 3: 收尾提交（如验收中发现残留问题，单独修并提交）**

```bash
git add -A
git commit -m "chore: 核心流程可用性修复验收"
```

---

## 自检记录

- **Spec 覆盖**：设计文档 5 节 → T1(4.6) T2(4.1/P13) T3(4.1) T4(4.1/P14) T5(1.1) T6(1.2) T7(1.2/1.3) T8-10(2.1/2.2) T11(3.1/3.3/P3) T12(3.2/P6) T13(4.2/4.3/P19/P20) T14(4.5/4.7/P2/P11/P21) T15(3.4/P12) T16(验收)。无遗漏。
- **占位符扫描**：无 TBD/TODO；每个代码步骤含完整代码。
- **类型一致性**：`batchStockInUpsert`（Task 6）→ `/api/parts/batch`（Task 7）签名一致；`checkoutBomItems`（Task 8）→ 端点（Task 9）→ 页面（Task 10）一致；`parseScanData`/`extractPartCode`（Task 1）在 Task 5/StockMovement 中复用；PartFilters 扩展在 Task 11 内自洽。
