# 分类筛选修复 + 双面包屑/搜索图标对齐 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复三个用户报告问题：分析页双面包屑、器件列表搜索框放大镜不居中、分类功能（下拉选项固定 + 筛选精确匹配导致结果变少 + Combobox 样式重叠）。

**Architecture:** 后端为分类筛选新增 `listPartCategories()` 接口（sqlite/redis 双适配器），将分类筛选从精确匹配改为包含匹配（LIKE %x% 带转义 / includes）。前端 `CategoryInput` 从硬编码 10 选项改为启动时拉取 API（失败回退硬编码），`Combobox` 输入框接入 `inputClass` 体系并新增 `inputClassName` 透传 prop。两处纯样式修复独立完成。

**Tech Stack:** Next.js 16.2.12（App Router）、React 19、Tailwind CSS v4、vitest 4。**零新依赖。**

## Global Constraints

- 不引入任何新 npm 依赖；不修改认证/缓存/日志逻辑；功能行为零改动（本计划仅改分类筛选匹配语义——这是设计文档明确要求的修复）
- 深色模式机制：`[data-theme="dark"]` 属性选择器——新写类必须带 `dark:` 变体或使用令牌变量
- 语义色：激活/选中=accent-soft 紫；圆角：控件 4px(`rounded`)、卡片 8px(`rounded-lg`)；无 `rounded-xl/2xl`、无 `focus:ring-*` 新增、无彩色阴影
- **Tailwind v4 裸 border 陷阱**：任何 `border` 类必须显式带边框色
- 匹配语义：**包含匹配**（设计文档 §2.1，用户选定）——选"电阻"命中"电阻"与"贴片电阻"；LIKE 通配符 `%`/`_` 必须转义
- 下拉选项：**真实在用分类 ∪ settings 管理分类**，拉取失败回退硬编码 10 个（`电阻/电容/电感/二极管/三极管/IC/连接器/晶振/LED/其他`）
- 验证命令：`npm run lint`（0 errors）、`npm run build`（通过）、`npm test`（vitest 全绿，现有 51 项 + 新增）
- 每任务单次提交，message 前缀：样式类 `fix:`、功能类 `feat:`

---

## File Structure

**新建：**
- `src/app/api/parts/categories/route.ts` — 分类列表 API（GET → `db.listPartCategories()`）

**修改：**
- `src/lib/db.ts` — `DatabaseAdapter` 接口加 `listPartCategories(): Promise<string[]>`
- `src/lib/db-sqlite.ts` — `listPartCategories()` 实现 + `listParts` 分类改 LIKE 包含匹配（带 ESCAPE）
- `src/lib/db-redis.ts` — `listPartCategories()` 实现 + `listParts` 分类改 `includes` 包含匹配
- `src/components/CategoryInput.tsx` — 动态选项 + 回退
- `src/components/Combobox.tsx` — 输入框接入 inputClass + `inputClassName` prop + 下拉面板圆角
- `src/app/parts/page.tsx` — 搜索框图标/输入框对齐、分类框 Filter 图标对齐、CategoryInput 传 `inputClassName="pl-12"`
- `src/app/analytics/page.tsx` — 删重复面包屑
- `src/lib/__tests__/db-sqlite.test.ts` — 新增 listPartCategories + LIKE 匹配 + 转义用例

---

### Task 1: 简单样式修复（双面包屑 + 搜索框图标居中）

**Files:**
- Modify: `src/app/analytics/page.tsx:110`（删独立面包屑）
- Modify: `src/app/parts/page.tsx:483,496`（搜索框图标/输入框对齐）

**Interfaces:**
- Consumes: 无
- Produces: 无（独立修复）

- [ ] **Step 1: 删除 analytics 页重复面包屑**

`src/app/analytics/page.tsx` 第 110 行，删除：
```tsx
      <Breadcrumb items={[{ label: "数据分析" }]} />
```
（保留第 114 行 PageHeader `breadcrumb` prop 中的那个。删除后若 `Breadcrumb` import 不再被使用，保留 import 不删——PageHeader prop 里仍引用 `Breadcrumb` 组件。）

- [ ] **Step 2: parts 搜索框图标/输入框对齐**

`src/app/parts/page.tsx`：
- 第 483 行搜索图标：`className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-[var(--foreground-subtle)]"` → `className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[var(--foreground-subtle)]"`
- 第 496 行输入框：`className={`${inputClass} pl-14 pr-10`}` → `className={`${inputClass} pl-12 pr-10`}`

对齐结果：图标起点 16px + 宽 16px → 中心 24px；输入框 `pl-12`(48px) → 预留区中心 24px。图标右缘 32px ≤ 文字起点 48px。

- [ ] **Step 3: 验证**

```bash
npm run lint
npm run build
```
Expected：0 errors；build 通过。

- [ ] **Step 4: 提交**

```bash
git add src/app/analytics/page.tsx src/app/parts/page.tsx
git commit -m "fix: 分析页双面包屑删除 + 器件列表搜索框放大镜居中"
```

---

### Task 2: 后端——分类列表接口 + 包含匹配

**Files:**
- Modify: `src/lib/db.ts:235`（Categories 区块加接口签名）
- Modify: `src/lib/db-sqlite.ts:112-142`（listParts 分类匹配）+ 新增 `listPartCategories()`
- Modify: `src/lib/db-redis.ts:152-185`（listParts 分类匹配）+ 新增 `listPartCategories()`
- Create: `src/app/api/parts/categories/route.ts`
- Test: `src/lib/__tests__/db-sqlite.test.ts`

**Interfaces:**
- Consumes: 无
- Produces:
  - `DatabaseAdapter.listPartCategories(): Promise<string[]>` — 返回真实在用分类（parts.category 非空去重按数量倒序）+ settings 分类（categories.name 按 sortOrder）合并去重
  - `listParts(filters)` 的 `filters.category` 语义：**从精确匹配改为包含匹配**
  - `GET /api/parts/categories` → `string[]`（200）或 `{ error: "获取分类失败" }`（500）

- [ ] **Step 1: 写失败测试（db-sqlite.test.ts 追加 describe 块）**

在 `src/lib/__tests__/db-sqlite.test.ts` 文件末尾追加：

```ts
describe("listPartCategories", () => {
  it("合并 parts 在用分类与 settings 分类并去重", async () => {
    await db.createPart({ code: "Z0001", name: "A", category: "贴片电阻" });
    await db.createPart({ code: "Z0002", name: "B", category: "电阻" });
    await db.createPart({ code: "Z0003", name: "C", category: "贴片电阻" });
    await db.createCategory({ name: "电容" });
    const cats = await db.listPartCategories();
    expect(cats).toEqual(expect.arrayContaining(["贴片电阻", "电阻", "电容"]));
    expect(new Set(cats).size).toBe(cats.length); // 无重复
  });
});

describe("listParts category 包含匹配", () => {
  it("选电阻命中电阻与贴片电阻", async () => {
    await db.createPart({ code: "Z0001", name: "A", category: "电阻" });
    await db.createPart({ code: "Z0002", name: "B", category: "贴片电阻" });
    await db.createPart({ code: "Z0003", name: "C", category: "电容" });
    const r = await db.listParts({ category: "电阻" });
    expect(r.parts.map(p => p.code).sort()).toEqual(["Z0001", "Z0002"]);
    expect(r.total).toBe(2);
  });

  it("分类含 LIKE 通配符时转义不误命中", async () => {
    await db.createPart({ code: "Z0001", name: "A", category: "100%电阻" });
    await db.createPart({ code: "Z0002", name: "B", category: "100X电阻" });
    const r = await db.listParts({ category: "100%电阻" });
    expect(r.parts.map(p => p.code)).toEqual(["Z0001"]);
    expect(r.total).toBe(1);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
npx vitest run src/lib/__tests__/db-sqlite.test.ts
```
Expected：FAIL——`db.listPartCategories is not a function`；包含匹配用例失败（现为精确匹配，`total` 为 1 不是 2）。

- [ ] **Step 3: db.ts 接口加签名**

`src/lib/db.ts` 第 235 行 `// Categories` 区块，在 `listCategories` 前加：

```ts
  // Categories
  listPartCategories(): Promise<string[]>;
  listCategories(): Promise<Category[]>;
```

- [ ] **Step 4: db-sqlite.ts 实现**

`src/lib/db-sqlite.ts`：

(a) `listParts` 第 116 行分类匹配改为包含匹配 + 转义。替换：
```ts
    if (filters.category) { where += " AND p.category = ?"; params.push(filters.category); }
```
为：
```ts
    if (filters.category) { where += " AND p.category LIKE ? ESCAPE '\\'"; params.push(`%${escapeLike(filters.category)}%`); }
```

(b) 在类内（`listParts` 之后、`getPart` 之前）新增私有辅助与公开方法：
```ts
  private escapeLike(s: string): string {
    return s.replace(/[\\%_]/g, (c) => "\\" + c);
  }

  async listPartCategories(): Promise<string[]> {
    const partCats = this.db.prepare("SELECT category, COUNT(1) as cnt FROM parts WHERE category != '' GROUP BY category ORDER BY cnt DESC, category").all() as { category: string }[];
    const catNames = this.db.prepare("SELECT name FROM categories ORDER BY sortOrder, name").all() as { name: string }[];
    const set = new Set<string>();
    for (const c of partCats) set.add(c.category);
    for (const c of catNames) set.add(c.name);
    return [...set];
  }
```
注意：第 (a) 步中 `escapeLike` 在 `listParts` 内被调用，必须在类中定义——按 (b) 放置。若实现时 `escapeLike` 定义在 `listParts` 之后，类方法提升不适用（class 方法需在实例调用前定义即可，同 class 内顺序无关）。

- [ ] **Step 5: db-redis.ts 实现**

`src/lib/db-redis.ts`：

(a) `listParts` 第 156 行：`if (filters.category) filtered = filtered.filter(p => p.category === filters.category);` → `if (filters.category) filtered = filtered.filter(p => p.category.includes(filters.category as string));`

(b) 在 `listParts` 之后新增：
```ts
  async listPartCategories(): Promise<string[]> {
    const { parts } = await this.loadCache();
    const catNames = (await this.listCategories()).map(c => c.name);
    const set = new Set<string>();
    for (const p of parts) if (p.category) set.add(p.category);
    for (const n of catNames) set.add(n);
    return [...set];
  }
```
（`listCategories` 为既有接口方法，RedisAdapter 已实现。）

- [ ] **Step 6: 新建 API route**

创建 `src/app/api/parts/categories/route.ts`：

```ts
import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const categories = await db.listPartCategories();
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Failed to fetch part categories:", error);
    return NextResponse.json({ error: "获取分类失败" }, { status: 500 });
  }
}
```

- [ ] **Step 7: 跑测试确认通过**

```bash
npx vitest run src/lib/__tests__/db-sqlite.test.ts
```
Expected：PASS（新 describe 块 + 既有用例全过）。

- [ ] **Step 8: 全量验证**

```bash
npm run lint
npm run build
npm test
```
Expected：lint 0 errors；build 通过；vitest 全绿（51 项既有 + 3 项新增）。

- [ ] **Step 9: 提交**

```bash
git add src/lib/db.ts src/lib/db-sqlite.ts src/lib/db-redis.ts src/app/api/parts/categories/route.ts src/lib/__tests__/db-sqlite.test.ts
git commit -m "feat: 分类列表接口 + 分类筛选改包含匹配（LIKE 转义）"
```

---

### Task 3: 前端——分类下拉动态化 + Combobox 样式对齐

**Files:**
- Modify: `src/components/CategoryInput.tsx`（动态选项 + 回退 + `inputClassName` 透传）
- Modify: `src/components/Combobox.tsx`（inputClass 接入 + `inputClassName` prop + 下拉面板圆角）
- Modify: `src/app/parts/page.tsx:539`（分类框 Filter 图标对齐 + CategoryInput 传 `inputClassName="pl-12"`）

**Interfaces:**
- Consumes: Task 2 的 `GET /api/parts/categories`（`string[]`）；既有 `inputClass` 常量（`@/components/ui/constants`，`w-full rounded px-3 py-2.5 text-sm bg-white dark:bg-[var(--card)] border border-[var(--border)] ...`）
- Produces:
  - `Combobox({ value, onChange, options, placeholder?, inputClassName? })` — 新 prop `inputClassName?: string`，拼接到输入框 className 尾部
  - `CategoryInput({ value, onChange, placeholder?, inputClassName? })` — 透传给 Combobox

- [ ] **Step 1: Combobox 接入 inputClass + inputClassName prop**

重写 `src/components/Combobox.tsx`：

```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { inputClass } from "@/components/ui/constants";

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  inputClassName?: string;
}

export default function Combobox({ value, onChange, options, placeholder = "选择或输入", inputClassName }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = value
    ? options.filter((opt) => opt.toLowerCase().includes(value.toLowerCase()))
    : options;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        className={`${inputClass} ${inputClassName ?? ""}`}
        placeholder={placeholder}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-52 overflow-y-auto bg-white dark:bg-[var(--card)] border border-[var(--card-border)] rounded-lg shadow-lg">
          {filtered.map((opt) => (
            <button
              key={opt}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-sm text-[var(--foreground)] hover:bg-[var(--background-subtle)] active:bg-[var(--background-muted)] transition-colors min-h-[44px] flex items-center"
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```
变更点：输入框 `px-5 py-4 bg-gray-50 ... rounded-xl focus:ring-2 focus:ring-blue-500 ...` → `${inputClass} ${inputClassName}`；下拉面板 `rounded-xl` → `rounded-lg`、`border-gray-200 dark:border-[var(--card-border)]` → `border-[var(--card-border)]`、`shadow-lg` 保留、选项行裸灰色类 → 令牌（`text-[var(--foreground)]`、`hover:bg-[var(--background-subtle)]`、`active:bg-[var(--background-muted)]`）。逻辑（onChange/onFocus/onBlur/过滤/onMouseDown preventDefault）逐字保留。

- [ ] **Step 2: CategoryInput 动态选项 + inputClassName 透传**

重写 `src/components/CategoryInput.tsx`：

```tsx
"use client";

import { useEffect, useState } from "react";
import Combobox from "@/components/Combobox";

const FALLBACK_OPTIONS = [
  "电阻", "电容", "电感", "二极管", "三极管", "IC", "连接器", "晶振", "LED", "其他",
];

interface CategoryInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputClassName?: string;
}

export default function CategoryInput({ value, onChange, placeholder = "选择或输入分类", inputClassName }: CategoryInputProps) {
  const [options, setOptions] = useState<string[]>(FALLBACK_OPTIONS);

  useEffect(() => {
    fetch("/api/parts/categories")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: unknown) => {
        if (Array.isArray(data) && data.length > 0) {
          setOptions(data as string[]);
        }
      })
      .catch(() => {});
  }, []);

  return <Combobox value={value} onChange={onChange} options={options} placeholder={placeholder} inputClassName={inputClassName} />;
}
```

- [ ] **Step 3: parts 页分类框图标对齐 + 传 inputClassName**

`src/app/parts/page.tsx` 第 539 行区域：

(a) Filter 图标：`className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[var(--foreground-subtle)] pointer-events-none z-10"`（保持——已是 left-4 w-4，中心 24px）

(b) CategoryInput 加 prop：
```tsx
              <CategoryInput
                value={category}
                onChange={(val) => { setCategory(val); setPage(1); }}
                placeholder="全部分类"
                inputClassName="pl-12"
              />
```

对齐结果：Filter 图标中心 24px = 输入框 `pl-12`(48px) 预留区中心 24px，消除原 12px 文字/图标重叠（原：文字起点 20px < 图标右缘 32px）。

- [ ] **Step 4: 验证**

```bash
npm run lint
npm run build
npm test
```
Expected：0 errors；build 通过；vitest 全绿。

- [ ] **Step 5: 提交**

```bash
git add src/components/CategoryInput.tsx src/components/Combobox.tsx src/app/parts/page.tsx
git commit -m "fix: 分类下拉动态化（API+回退）+ Combobox 对齐 inputClass 体系"
```

---

## Self-Review 记录

- **Spec coverage**：设计文档 §1→Task 1；§2.1 后端→Task 2；§2.2 前端→Task 3；验收标准 1-2→Task 1、3-5→Task 2+3、6→各任务验证步骤。范围外（分类管理增强/层级/LCEDA 映射/PartFormModal）均未纳入任务。
- **Placeholder scan**：无 TBD/TODO；每步含完整代码。
- **Type consistency**：`listPartCategories(): Promise<string[]>` 在 db.ts 接口与两个适配器一致；`inputClassName?: string` 在 Combobox 与 CategoryInput 一致；API 返回 `string[]` 与前端 `setOptions(data as string[])` 一致。
- **补充决策**（计划对设计文档的细化）：Combobox 新增 `inputClassName` prop 而非硬编码 `pl-12`——因为 PartFormModal 也用 Combobox 但无左侧图标，硬编码会造成无图标冗余内边距。此细化不改变设计意图（parts 分类框视觉结果一致）。
- **风险**：Task 2 的 `escapeLike` 若定义为类私有方法需确认调用点（`listParts`）先于定义仍可用（class 方法无提升问题，运行时已定义）。LIKE 的 `ESCAPE '\'` 在 JS 字符串中写作 `"ESCAPE '\\'"`——SQLite 接收 `ESCAPE '\'`。
