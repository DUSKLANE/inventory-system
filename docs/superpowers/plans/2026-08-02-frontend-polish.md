# 前端视觉体系化改造 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 全站统一为"中性专业"视觉体系：单一设计令牌（紫强调 `#5e6ad2`、深灰暗色 `#18181b`）、共享组件库、统一布局，逐页打磨，功能零改动、零新依赖。

**Architecture:** 以 `src/app/globals.css` 令牌重写为地基（保留 CSS 变量名仅换值，避免 ~100 处 TSX 引用 churn；`--primary` 更名 `--accent` 因仅死 CSS 引用）。暗色兼容采用渐进策略：Task 1 保留通用 `[data-theme="dark"] ... !important` 覆盖（仅改指向新令牌值）作为安全网，各页任务逐个把裸色类替换为令牌类并删除对应覆盖，Task 13 门禁归零。组件库为薄封装（`src/components/ui/`），常量导出优先、组件化替换分批。

**Tech Stack:** Next.js 16.2.12（App Router, client components）、React 19、Tailwind CSS v4（CSS-first，无 config 文件）、lucide-react ^1.17.0、vitest 4。**零新依赖。**

## Global Constraints

- 不引入任何新 npm 依赖；不新增/修改 API、认证、缓存逻辑；功能行为零改动（仅 className/结构性 JSX 调整）
- 深色模式机制：`[data-theme="dark"]` 属性选择器（globals.css:4 `@custom-variant dark`）——所有新写类必须带 `dark:` 变体或使用令牌变量
- 变量名约定：`--card`/`--card-border`/`--card-foreground`/`--background-subtle`/`--background-muted`/`--foreground-muted`/`--foreground-subtle`/`--ring`/`--shadow-*`/`--font-*` 名称不变（仅换值）；`--primary` 系列全部删除，由 `--accent` 系列接管
- 语义色：IN=success(emerald)、OUT=error(red)、低库存/警告=warning(amber)、分类标签=灰(neutral)、激活/选中=accent-soft 紫
- 圆角：控件 4px(`rounded`)、卡片/弹窗/页头 8px(`rounded-lg`)；不得再出现 `rounded-xl`/`rounded-2xl` 于新建/替换代码
- 组件库规范：`src/components/ui/` 内组件一律"use client"（若含 hooks）或纯函数组件；默认导出名与下方 Interfaces 一致；`className` 透传拼接
- 每任务提交一次，message 前缀 `style:`；验证命令：`npm run lint`（0 errors）、`npm run build`（通过，含类型检查）、需要时 `npm test`（vitest 51 项须全绿）
- 禁止新增 `focus:ring-*` 类（全局 `:focus-visible` 紫色 outline 已接管）；禁止彩色阴影（`shadow-*-200/50` 等）
- grep 门禁（Task 13 最终归零）：`from-blue-600|to-blue-600|indigo-500|from-indigo|to-indigo|shadow-blue|!important` 在 `src/` 内须为 0（globals.css 中 `!important` 归零）
- 复制文案保持中文，不修改任何用户可见文案

---

## File Structure

**新建：**
- `src/components/ui/constants.ts` — 输入/卡片等 className 常量（唯一来源）
- `src/components/ui/Button.tsx` — 按钮组件
- `src/components/ui/Card.tsx` — 卡片外壳
- `src/components/ui/Badge.tsx` — 语义徽章
- `src/components/ui/Modal.tsx` — 统一弹窗（Esc/滚动锁/遮罩）
- `src/components/ui/PageHeader.tsx` — 统一页头
- `src/components/ui/EmptyState.tsx` — 统一空状态
- `src/components/ui/Spinner.tsx` — 统一加载圈
- `src/components/ui/SelectField.tsx` — select 包装（含右箭头图标）
- `src/components/ui/Pagination.tsx` — 统一分页（Task 3）
- `src/components/ui/index.ts` — 统一再导出

**重写/修改：**
- `src/app/globals.css` — Task 1 令牌重写 + 死 CSS 删除 + 动画定义；Task 3 加 `.page-container-narrow`；各页任务删对应暗色覆盖
- `src/app/layout.tsx` — Task 1 移除 `noise-texture`；Task 12 移除 `maximumScale:1`
- `src/app/page.tsx`、`src/app/parts/page.tsx`、`src/app/parts/[id]/page.tsx`、`src/app/stock/page.tsx`、`src/app/movements/page.tsx`、`src/app/logs/page.tsx`、`src/app/boms/page.tsx`、`src/app/boms/[id]/page.tsx`、`src/app/analytics/page.tsx`、`src/app/settings/page.tsx`、`src/app/help/page.tsx`、`src/app/login/page.tsx` — 逐页打磨
- `src/components/KeyboardShortcuts.tsx`、`src/components/NumberInput.tsx`、`src/components/Breadcrumb.tsx`、`src/components/Navigation.tsx`、`src/components/StockItemCard.tsx` — Task 12
- `src/components/PartFormModal.tsx`、`src/components/CategoryInput.tsx`、`src/components/PackageInput.tsx`、`src/components/Combobox.tsx`、`src/components/QRScanner.tsx` — 各页任务中随调用处替换输入类

---

### Task 1: globals.css 令牌重写 + 死 CSS 清理

**Files:**
- Modify: `src/app/globals.css`（整体）
- Modify: `src/app/layout.tsx:33`（移除 `noise-texture`）

**Interfaces:**
- Consumes: 无（地基）
- Produces: 新令牌变量集（`:root` + `[data-theme="dark"]`）；`.animate-fade-in`、`.animate-pulse-soft` 类；删除 `.stagger-children` 等死类；保留 `@keyframes fadeIn/fadeInUp/fadeInScale/pulse-soft`、`main > div` 动画、`.modal-backdrop`、`.safe-area-pb`、`.main-content`、`.page-container`、`.section`、`:focus-visible`、滚动条、`mark`、`th,td` padding、`thead.sticky th`、`input/select/textarea:focus` 相关清理

- [ ] **Step 1: 替换第 1 行 Google Fonts @import**

删除第 1 行 `@import url('https://fonts.googleapis.com/...')`（内网部署必失败）。保留第 2 行 `@import "tailwindcss";`。

- [ ] **Step 2: 重写 :root 令牌块（第 6-75 行整体替换）**

```css
:root {
  /* Background & Surface */
  --background: #fafafa;
  --background-subtle: #f4f4f5;
  --background-muted: #e4e4e7;

  /* Foreground */
  --foreground: #18181b;
  --foreground-muted: #52525b;
  --foreground-subtle: #71717a;

  /* Card */
  --card: #ffffff;
  --card-foreground: #18181b;
  --card-border: #e4e4e7;

  /* Accent - Linear Violet */
  --accent: #5e6ad2;
  --accent-hover: #4a56c2;
  --accent-foreground: #ffffff;
  --accent-subtle: #f0f1fb;
  --accent-muted: #dde1f7;

  /* Success - Emerald */
  --success: #059669;
  --success-foreground: #ffffff;
  --success-subtle: #ecfdf5;

  /* Warning - Amber */
  --warning: #d97706;
  --warning-foreground: #ffffff;
  --warning-subtle: #fffbeb;

  /* Error - Red */
  --error: #dc2626;
  --error-foreground: #ffffff;
  --error-subtle: #fef2f2;

  /* Muted */
  --muted: #f4f4f5;
  --muted-foreground: #71717a;

  /* Border */
  --border: #e4e4e7;
  --border-hover: #d4d4d8;

  /* Ring */
  --ring: #5e6ad2;

  /* Radius */
  --radius: 8px;
  --radius-sm: 4px;

  /* Shadow */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.14);

  /* Font */
  --font-heading: system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  --font-body: system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  --font-mono: ui-monospace, "Cascadia Mono", "SF Mono", Consolas, monospace;
}
```

- [ ] **Step 3: 重写 [data-theme="dark"] 令牌块（第 78-137 行整体替换）**

```css
[data-theme="dark"] {
  --background: #18181b;
  --background-subtle: #212124;
  --background-muted: #3f3f46;
  --foreground: #e4e4e7;
  --foreground-muted: #d4d4d8;
  --foreground-subtle: #a1a1aa;
  --card: #27272a;
  --card-foreground: #e4e4e7;
  --card-border: #3f3f46;
  --accent: #767fe0;
  --accent-hover: #8b93e6;
  --accent-foreground: #ffffff;
  --accent-subtle: rgba(118, 127, 224, 0.15);
  --accent-muted: rgba(118, 127, 224, 0.3);
  --success: #34d399;
  --success-foreground: #0d2818;
  --success-subtle: rgba(16, 185, 129, 0.15);
  --warning: #fbbf24;
  --warning-foreground: #2d1f0e;
  --warning-subtle: rgba(251, 191, 36, 0.12);
  --error: #f87171;
  --error-foreground: #2d0f0f;
  --error-subtle: rgba(248, 113, 113, 0.15);
  --muted: #3f3f46;
  --muted-foreground: #a1a1aa;
  --border: #3f3f46;
  --border-hover: #52525b;
  --ring: #767fe0;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.35);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.45);
  --shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.55);
}
```

注意：**保留所有现有变量名**（`--background`/`--foreground` 等名称不变，仅换值），`--primary*`、`--accent`(旧橙)、`--radius-lg`/`--radius-xl` 不再定义（引用它们的全是死 CSS，随 Step 6 删除）。

- [ ] **Step 4: 通用暗色覆盖改为指向新令牌（第 139-223 行）**

保留这些 `[data-theme="dark"] ... !important` 规则**作为渐进迁移安全网**，但同步更新其引用值为新令牌（`--primary` → `--accent`，其余变量名未变无需改值，仅 `:focus` 边框色改 `var(--accent)`）。逐个核对：

- `input:focus, select:focus, textarea:focus`（第 201-206 行）：`border-color: var(--primary)` → `var(--accent)`
- `[data-theme="dark"] aside`（第 214-217 行）：`rgba(22,27,34,0.95)` → `rgba(24,24,27,0.95)`、`var(--card-border)` 不变
- `[data-theme="dark"] nav.fixed`（第 220-223 行）：`rgba(13,17,23,0.95)` → `rgba(24,24,27,0.95)`
- 其余规则（`.bg-white`、`.bg-gray-50/100`、`.text-gray-*`、`.border-gray-*`、`.divide-gray-100`、`.shadow-*`、输入框三件套）引用变量名未变，**保持不变**——它们是迁移期暗色正确性的保障，Task 13 才会删除

- [ ] **Step 5: 删除 input:focus 盒阴影全局规则（第 444-449 行）**

删除：
```css
input:focus, select:focus, textarea:focus {
  outline: none;
  box-shadow: 0 0 0 3px var(--primary-muted);
  border-color: var(--primary);
}
```
这使全站约 30 处 `focus:ring-*` 类失效问题根治——统一由既有 `:focus-visible` 规则（第 676-679 行，`outline: 2px solid var(--ring)`，ring 已为紫色）接管。

- [ ] **Step 6: 删除死 CSS（以下块整体删除）**

按行号删除（引用数已由审计确认均为 0）：
- `.stagger-children` 及 6 条 nth-child（第 327-336 行）
- `.card-hover` 及 ::before（第 358-385 行）
- `.card-gradient-border` 及 ::before（第 387-406 行）
- `.btn-press`（第 409-415 行）、`.btn-shimmer` 及 ::after（第 418-442 行）
- `.gradient-text`（第 462-467 行）、`.gradient-text-subtle`（第 470-475 行）
- `.noise-texture` 及 ::after（第 478-490 行）
- `.dot-pattern`（第 493-496 行）、`.grid-pattern`（第 499-504 行）、`.mesh-gradient`（第 507-512 行）
- `@keyframes shimmer` + `.skeleton`（第 515-529 行）
- `@keyframes spin-slow` + `.spinner-slow`（第 532-543 行）
- `.ripple` 及 ::before/::active（第 546-567 行）
- `.toast-enter`/`.toast-exit`（第 592-598 行）——**保留** `@keyframes slideIn/slideOut`（第 570-590 行，ToastProvider 可能引用；保留无害）
- `.badge`/`.badge-success`/`.badge-warning`/`.badge-error`/`.badge-info`/`.badge-accent`/`.badge-pill`（第 607-653 行）
- `.table-hover`/`.table-row-selected`/`.table-striped`（第 656-673 行）
- `.card` 及 md 变体（第 744-752 行）、`.btn`/`.btn-sm`/`.btn-lg`（第 755-765 行）

- [ ] **Step 7: 补动画类定义（在 @keyframes 区后追加）**

```css
.animate-fade-in {
  animation: fadeIn 0.18s ease-out;
}

.animate-pulse-soft {
  animation: pulse-soft 2s ease-in-out infinite;
}
```

- [ ] **Step 8: thead.sticky th 去硬编码（第 738-741 行与第 793-795 行）**

```css
thead.sticky th {
  background: var(--card);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
```
删除第 793-795 行 `[data-theme="dark"] thead.sticky th { background: #161b22; }`（`var(--card)` 自动适配暗色）。

- [ ] **Step 9: 更新 layout.tsx body 类**

`src/app/layout.tsx:33`：`className="bg-[var(--background)] antialiased noise-texture"` → 删除 `noise-texture`。

- [ ] **Step 10: 验证**

```bash
npm run lint
npm run build
```
Expected：lint 0 errors；build 通过。另用 `npx grep -rn "stagger-children\|card-hover\|gradient-text\|noise-texture\|dot-pattern\|skeleton\|spinner-slow\|table-hover\|badge-" src/app src/components --include="*.tsx"` 确认无 TSX 引用残留（仅可剩 `fadeInUp|fadeInScale|pulse-soft` 等 @keyframes 相关）。

- [ ] **Step 11: 提交**

```bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "style: 设计令牌重写（紫强调/深灰暗色/系统字体）+ 死 CSS 清理 + 动画类补全"
```

---

### Task 2: UI 组件库（constants + 8 组件）

**Files:**
- Create: `src/components/ui/constants.ts`
- Create: `src/components/ui/Button.tsx`
- Create: `src/components/ui/Card.tsx`
- Create: `src/components/ui/Badge.tsx`
- Create: `src/components/ui/Modal.tsx`
- Create: `src/components/ui/PageHeader.tsx`
- Create: `src/components/ui/EmptyState.tsx`
- Create: `src/components/ui/Spinner.tsx`
- Create: `src/components/ui/SelectField.tsx`
- Create: `src/components/ui/index.ts`

**Interfaces:**
- Consumes: Task 1 令牌变量（`--accent`、`--card`、`--card-border`、`--error`、`--success`、`--warning`、`--background-subtle`、`--foreground*`、`--ring`）
- Produces（后续任务唯一依赖来源，签名必须一致）:
  - `inputClass`、`textareaClass`：`string`；`selectClass`：`string`（含 `appearance-none pr-9`，配合 SelectField 使用）
  - `Button({ variant?: "primary"|"outline"|"ghost"|"danger"|"success", size?: "sm"|"md", className?, ...ButtonHTMLAttributes })`
  - `Card({ className?, ...HTMLAttributes<HTMLDivElement> })` → `bg-white dark:bg-[var(--card)] border border-[var(--card-border)] rounded-lg`
  - `Badge({ variant?: "in"|"out"|"warning"|"neutral"|"category", className?, ...HTMLAttributes<HTMLSpanElement> })`
  - `Modal({ open: boolean, onClose: () => void, title: ReactNode, children: ReactNode, footer?: ReactNode, width?: string })`
  - `PageHeader({ breadcrumb?: ReactNode, title: string, subtitle?: string, actions?: ReactNode })`
  - `EmptyState({ icon: ReactNode, title: string, description?: string, action?: ReactNode })`
  - `Spinner({ size?: "sm"|"md", className? })`
  - `SelectField({ className?, ...SelectHTMLAttributes })` → 相对定位容器 + select(selectClass) + `ChevronDown` 绝对定位图标（`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--foreground-subtle)]`）
  - `ui/index.ts` 再导出以上全部（`export * from "./Button"` 等）

- [ ] **Step 1: 写 constants.ts**

```ts
export const inputClass =
  "w-full rounded px-3 py-2.5 text-sm bg-white dark:bg-[var(--card)] border border-[var(--border)] hover:border-[var(--border-hover)] text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

export const selectClass = `${inputClass} appearance-none pr-9 cursor-pointer`;

export const textareaClass = inputClass;

export const cardClass =
  "bg-white dark:bg-[var(--card)] border border-[var(--card-border)] rounded-lg";
```

- [ ] **Step 2: 写 Button.tsx**

```tsx
import { forwardRef, type ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "outline" | "ghost" | "danger" | "success";
export type ButtonSize = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-1.5 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]";

const sizes: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm",
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]",
  outline:
    "bg-transparent border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--background-subtle)]",
  ghost: "bg-transparent text-[var(--foreground-muted)] hover:bg-[var(--background-subtle)]",
  danger: "bg-[var(--error)] text-white hover:opacity-90",
  success: "bg-[var(--success)] text-white hover:opacity-90",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...rest }, ref) => (
    <button
      ref={ref}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className ?? ""}`}
      {...rest}
    />
  )
);
Button.displayName = "Button";
```

注意：**不设默认 `type`**（保持原生 submit 语义，避免破坏表单提交按钮）。

- [ ] **Step 3: 写 Card.tsx**

```tsx
import type { HTMLAttributes } from "react";
import { cardClass } from "./constants";

export const Card = ({ className, ...rest }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`${cardClass} ${className ?? ""}`} {...rest} />
);
```

- [ ] **Step 4: 写 Badge.tsx**

```tsx
import type { HTMLAttributes } from "react";

export type BadgeVariant = "in" | "out" | "warning" | "neutral" | "category";

const variants: Record<BadgeVariant, string> = {
  in: "bg-[var(--success-subtle)] text-[var(--success)]",
  out: "bg-[var(--error-subtle)] text-[var(--error)]",
  warning: "bg-[var(--warning-subtle)] text-[var(--warning)]",
  neutral: "bg-[var(--background-subtle)] text-[var(--foreground-muted)]",
  category: "bg-[var(--background-subtle)] text-[var(--foreground-muted)]",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export const Badge = ({ variant = "neutral", className, ...rest }: BadgeProps) => (
  <span
    className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium whitespace-nowrap ${variants[variant]} ${className ?? ""}`}
    {...rest}
  />
);
```

- [ ] **Step 5: 写 Modal.tsx**

```tsx
"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}

export function Modal({ open, onClose, title, children, footer, width = "max-w-md" }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const el = panelRef.current?.querySelector<HTMLElement>(
      "input, select, textarea, button, [tabindex]:not([tabindex='-1'])"
    );
    el?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="modal-backdrop absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${width} bg-white dark:bg-[var(--card)] border border-[var(--card-border)] rounded-lg shadow-xl animate-fade-in`}
      >
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--card-border)]">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="p-1.5 rounded text-[var(--foreground-subtle)] hover:bg-[var(--background-subtle)] hover:text-[var(--foreground)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-[var(--card-border)] flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: 写 PageHeader.tsx / EmptyState.tsx / Spinner.tsx**

```tsx
// PageHeader.tsx
import type { ReactNode } from "react";

interface PageHeaderProps {
  breadcrumb?: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ breadcrumb, title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-6">
      {breadcrumb}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-[var(--foreground-subtle)]">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
```

```tsx
// EmptyState.tsx
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-lg bg-[var(--background-subtle)]">
        {icon}
      </div>
      <p className="text-sm font-medium text-[var(--foreground)]">{title}</p>
      {description && <p className="mt-1 text-sm text-[var(--foreground-subtle)]">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
```

```tsx
// Spinner.tsx
interface SpinnerProps {
  size?: "sm" | "md";
  className?: string;
}

export function Spinner({ size = "md", className }: SpinnerProps) {
  const sizeClass = size === "sm" ? "h-4 w-4 border-2" : "h-8 w-8 border-[3px]";
  return (
    <div
      role="status"
      aria-label="加载中"
      className={`${sizeClass} animate-spin rounded-full border-[var(--border)] border-t-[var(--accent)] ${className ?? ""}`}
    />
  );
}
```

- [ ] **Step 7: 写 SelectField.tsx**

```tsx
import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { selectClass } from "./constants";

export const SelectField = ({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <div className="relative">
    <select className={`${selectClass} ${className ?? ""}`} {...rest} />
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--foreground-subtle)]" />
  </div>
);
```

- [ ] **Step 8: 写 index.ts**

```ts
export * from "./Button";
export * from "./Card";
export * from "./Badge";
export * from "./Modal";
export * from "./PageHeader";
export * from "./EmptyState";
export * from "./Spinner";
export * from "./SelectField";
export * from "./constants";
```

- [ ] **Step 9: 验证**

```bash
npm run lint
npm run build
```
Expected：0 errors，build 通过。注意：组件此时尚未被任何页面引用，属纯增量。

- [ ] **Step 10: 提交**

```bash
git add src/components/ui
git commit -m "style: 新增 UI 组件库（Button/Card/Badge/Modal/PageHeader/EmptyState/Spinner/SelectField + 常量）"
```

---

### Task 3: 布局统一（容器窄档 / 页头 / 面包屑 / 分页 / 空状态）

**Files:**
- Modify: `src/app/globals.css`（加 `.page-container-narrow`）
- Create: `src/components/ui/Pagination.tsx`
- Modify: `src/app/parts/page.tsx`（页头 → PageHeader + 面包屑；分页 → Pagination；空状态 → EmptyState；输入框 → inputClass/SelectField）
- Modify: `src/app/movements/page.tsx`（容器窄档、页头 → PageHeader、空状态 → EmptyState、分页 → Pagination、搜索输入 → inputClass）
- Modify: `src/app/logs/page.tsx`（页头、空状态、分页 → Pagination、select → SelectField）
- Modify: `src/app/settings/page.tsx`、`src/app/help/page.tsx`（页头 → PageHeader + 面包屑；去自身 max-w 包裹，用窄档容器）
- Modify: `src/app/stock/page.tsx`、`src/app/boms/page.tsx`、`src/app/analytics/page.tsx`（页头统一 + 空状态 → EmptyState，仅页头/空状态部分）

**Interfaces:**
- Consumes: Task 2 的 `PageHeader`/`EmptyState`/`SelectField`/`inputClass`；既有 `Breadcrumb`（`src/components/Breadcrumb.tsx`，props：`items: Array<{ label: string; href?: string }>`）
- Produces:
  - `.page-container-narrow`：`max-width: 1024px; margin: 0 auto; padding: 16px 0;` + md 断点 `padding: 32px 0;`
  - `Pagination({ page, totalPages, total, pageSize, onPageChange, onPageSizeChange })`，pageSize 选项 `[10, 20, 50, 100]`，含上一页/下一页按钮、`第 X / Y 页` 文本、跳页输入、每页条数 SelectField

- [ ] **Step 1: globals.css 追加 .page-container-narrow（在 .page-container 块后）**

```css
.page-container-narrow {
  max-width: 1024px;
  margin: 0 auto;
  padding: 16px 0;
}

@media (min-width: 768px) {
  .page-container-narrow {
    padding: 32px 0;
  }
}
```

- [ ] **Step 2: 写 Pagination.tsx**

```tsx
"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SelectField } from "./SelectField";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const [jump, setJump] = useState("");

  const goToPage = () => {
    const p = parseInt(jump, 10);
    if (Number.isFinite(p) && p >= 1) onPageChange(Math.min(p, totalPages));
    setJump("");
  };

  const btn =
    "inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-[var(--foreground-muted)] border border-[var(--border)] rounded hover:bg-[var(--background-subtle)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-[var(--card-border)]">
      <div className="flex items-center gap-3">
        <span className="text-sm text-[var(--foreground-subtle)]">共 {total} 条</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--foreground-subtle)]">每页</span>
          <SelectField
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="w-20 py-1.5 text-sm"
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </SelectField>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button className={btn} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="w-4 h-4" />
          上一页
        </button>
        <span className="text-sm text-[var(--foreground-subtle)]">
          第 {page} / {totalPages} 页
        </span>
        <button
          className={btn}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          下一页
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1 ml-1">
          <input
            value={jump}
            onChange={(e) => setJump(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && goToPage()}
            className="w-14 rounded px-2 py-1.5 text-sm bg-white dark:bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
            placeholder="页"
            inputMode="numeric"
          />
          <button className={btn} onClick={goToPage}>
            跳转
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: parts 列表页页头 → PageHeader + 面包屑**

在 `src/app/parts/page.tsx`：删除现有 `<h1>`/副标题块（约 180-200 行区域的页头 div），替换为：

```tsx
<PageHeader
  breadcrumb={<Breadcrumb items={[{ label: "器件列表" }]} />}
  title="器件列表"
  subtitle="管理库存器件，支持高级搜索与批量出入库"
  actions={<Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" />新增器件</Button>}
/>
```

导入：`import { PageHeader, Button, EmptyState, Spinner, Pagination, inputClass, SelectField } from "@/components/ui";`、`import Breadcrumb from "@/components/Breadcrumb";`。若原页面有独立"新增器件"按钮于他处，删除原按钮保留此处。

- [ ] **Step 4: parts 分页 → Pagination 组件**

现有分页区块（约 1350-1420 行，含 prev/next/跳页/pageSize）整体替换为：

```tsx
{data && (
  <Pagination
    page={page}
    totalPages={data.totalPages}
    total={data.total}
    pageSize={pageSize}
    onPageChange={(p) => setPage(p)}
    onPageSizeChange={(s) => setPageSize(s)}
  />
)}
```
确认 `setPage` 已有 URL 同步逻辑（`useEffect` 监听 page/pageSize 写入 searchParams）无需改动。删除原 `jumpPage` state 与 `goToPage` 函数（若不再被引用）。

- [ ] **Step 5: parts 空状态 → EmptyState + 加载态 → Spinner**

表格区 `data.parts.length === 0` 分支（约 800 行附近）替换为：

```tsx
<EmptyState
  icon={<Boxes className="w-7 h-7 text-[var(--foreground-subtle)]" />}
  title="未找到器件"
  description="调整搜索条件或新增器件"
  action={
    <Button onClick={() => setShowAdd(true)} size="sm">
      <Plus className="w-4 h-4" />新增器件
    </Button>
  }
/>
```
loading 分支的 `Loader2` 双圈 → `<div className="flex justify-center py-16"><Spinner /></div>`。

- [ ] **Step 6: parts 搜索/筛选输入框 → inputClass/SelectField**

页面内所有 `border-gray-300`/`border-gray-200` + `focus:ring-2 focus:ring-blue-500` 组合的 input/select/textarea，替换为：

- input：`className={inputClass}`（带图标时加 `pl-9`）
- select：`<SelectField className="...">`（若宽度特殊需覆盖 w-*，否则直接替换）
- textarea：`className={textareaClass}`

- [ ] **Step 7: movements 页 → 窄档容器 + PageHeader + 空状态 + Pagination**

`src/app/movements/page.tsx`：
- 最外层 `page-container` → `page-container-narrow`
- 页头（106-108 行区域）→ `<PageHeader breadcrumb={<Breadcrumb items={[{ label: "流水记录" }]} />} title="流水记录" subtitle="全部出入库明细" />`
- 搜索输入（147 行）→ `inputClass` + `pl-9`
- 空状态（184-193 行区域）→ `<EmptyState icon={<Inbox className="w-7 h-7 text-[var(--foreground-subtle)]" />} title="暂无流水记录" description="完成入库或出库操作后，记录将显示在这里" />`
- 底部 `共 X 条` + prev/next（234-260 行区域）→ `<Pagination ... />`（movements 接口已支持 `pageSize` 参数；URL 同步逻辑按现有 page 参数模式加 pageSize）
- 确认该页已有 `page`/`totalPages`/`total` state；若无 pageSize state，新增 `const [pageSize, setPageSize] = useState(20)` 并随 fetch URL 附带

- [ ] **Step 8: logs 页 → 页头 + 空状态 + Pagination + SelectField**

`src/app/logs/page.tsx`：页头 → PageHeader（title="操作日志"）；空状态 → EmptyState；分页（若为简化版 prev/next）→ Pagination（若接口不支持 pageSize，用 `onPageSizeChange` 内部仍传参但 API 层可忽略——**先读该页代码确认接口参数**，不支持则省略每页条数 UI：Pagination 仅在有 pageSize 变化需求时传 onPageSizeChange）；两个无箭头 `select` → SelectField。

- [ ] **Step 9: settings/help → 窄档容器 + PageHeader + 面包屑**

- settings：外层容器改为 `page-container-narrow`，删除自身 `max-w-3xl mx-auto` 包裹；页头 → `<PageHeader breadcrumb={<Breadcrumb items={[{ label: "设置" }]} />} title="设置" subtitle="偏好与系统配置" />`
- help：外层 `page-container` → `page-container-narrow`，删除自身 `max-w-4xl` 包裹；页头（61 行区域）→ `<PageHeader breadcrumb={<Breadcrumb items={[{ label: "帮助中心" }]} />} title="帮助中心" subtitle="操作指引与快捷键说明" />`

- [ ] **Step 10: stock/boms/analytics 页头与空状态收敛（仅此部分）**

- `stock/page.tsx`：页头（338-339 行区域）→ `<PageHeader breadcrumb={<Breadcrumb items={[{ label: "出入库" }]} />} title="出入库" subtitle="扫码 / 手动输入，支持批量操作" />`
- `boms/page.tsx`：页头（81-82 行区域）→ `<PageHeader ... title="BOM清单" subtitle="项目物料清单管理" />`；空状态（95-101 行区域）→ EmptyState
- `analytics/page.tsx`：页头 → PageHeader（title="数据分析"，保留周期按钮组于 actions）
- 以上三页**仅**改页头/空状态，其余内容由 Task 4-11 处理

- [ ] **Step 11: 验证**

```bash
npm run lint
npm run build
```
Expected：0 errors，build 通过。手测（可选，`npm run dev`）：器件/流水/日志/设置/帮助/出入库/分析页页头一致、容器宽度正确、分页统一。

- [ ] **Step 12: 提交**

```bash
git add src/app/globals.css src/components/ui/Pagination.tsx src/app/parts/page.tsx src/app/movements/page.tsx src/app/logs/page.tsx src/app/settings/page.tsx src/app/help/page.tsx src/app/stock/page.tsx src/app/boms/page.tsx src/app/analytics/page.tsx
git commit -m "style: 布局统一（窄档容器/PageHeader/面包屑/Pagination/EmptyState/输入类接入）"
```

---

### Task 4: 仪表盘打磨

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: Task 2 的 `Card`/`Badge`/`Button`；Task 1 令牌

- [ ] **Step 1: 删除死装饰（281-282 行）**

删除 stat 卡内渐变装饰 div：
```tsx
<div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br opacity-5 group-hover:opacity-10 transition-opacity duration-300 rounded-bl-[100%]" 
     style={{background: `linear-gradient(135deg, var(--tw-gradient-stops))`}} />
```

- [ ] **Step 2: stat 卡装饰去彩色**

图标容器（285 行）：`bg-gradient-to-br ${s.gradient} ... shadow-lg ${s.shadowColor} dark:shadow-none` → `bg-[var(--accent-subtle)] shadow-sm`；图标 `text-white` → `text-[var(--accent)]`。数值 `text-2xl sm:text-4xl` → `text-3xl`。卡片 hover `hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-black/20` → `hover:shadow-lg transition-shadow`。
同步清理 stats 数组定义（约 230-260 行）：删除每项的 `gradient`/`shadowColor`/`textColor` 字段（textColor 若用于 IN/OUT 语义色，改为由 Badge/语义类表达：入库数 → `text-[var(--success)]`、出库数 → `text-[var(--error)]`、其余 → `text-[var(--foreground)]`），不删除字段对应 JSX 引用则一并改。

- [ ] **Step 3: 预警区（300-330 行区域）去渐变 + 令牌化**

- 容器：`bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl` → `bg-[var(--warning-subtle)] border border-[var(--warning)]/20 rounded-lg`
- 图标容器：`bg-amber-100 dark:bg-amber-500/20 rounded-xl` → `bg-[var(--warning-subtle)] rounded-lg`；`Bell` `text-amber-600 dark:text-amber-400` → `text-[var(--warning)]`
- 展开按钮：`text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300` → `text-[var(--warning)] hover:opacity-80`
- 预警卡内数量（337 行）：`text-red-600 dark:text-red-400` → `text-[var(--error)]`
- 预警卡 hover（325 行）：`bg-white/80 dark:bg-[var(--card)]/80 rounded-xl hover:bg-white dark:hover:bg-[var(--card)]` → `bg-white dark:bg-[var(--card)] rounded-lg hover:bg-[var(--background-subtle)] transition-colors`

- [ ] **Step 4: 删除 globals.css 对应琥珀色覆盖（833-860 行）**

删除 `[data-theme="dark"] .bg-gradient-to-r.from-amber-50.to-orange-50` 三条 + `.bg-amber-100`/`.bg-amber-50`/`.text-amber-600`/`.text-amber-700` 五条覆盖——**仅当** grep `bg-amber-100|bg-amber-50|text-amber-600|text-amber-700` 于 `src/app src/components` 计数为 0（amber 语义类已被令牌替换）。若有残留（如 parts/详情页低库存），保留覆盖，本任务只删渐变块三条。

- [ ] **Step 5: 库存趋势柱状图与 analytics 色阶统一**

`recentMovements` 柱状图（约 400-450 行）：IN 柱 `bg-emerald-*`/`bg-blue-*` 与 OUT 柱统一为 `bg-[var(--success)]` / `bg-[var(--error)]`（透明度差异用 opacity，不新增色阶）。

- [ ] **Step 6: 验证**

```bash
npm run lint
npm run build
```
Expected：0 errors。`npx grep -rn "tw-gradient-stops" src` 为 0。

- [ ] **Step 7: 提交**

```bash
git add src/app/page.tsx src/app/globals.css
git commit -m "style: 仪表盘去渐变死装饰/预警区令牌化/图表语义色统一"
```

---

### Task 5: 器件列表页打磨

**Files:**
- Modify: `src/app/parts/page.tsx`
- Modify: `src/components/PartFormModal.tsx`（若其中含裸输入类）

**Interfaces:**
- Consumes: Task 2/3 产物（inputClass/SelectField/Badge/Modal 视需要）；Task 1 令牌

- [ ] **Step 1: 表头 py 统一**

表格 `thead` 内 `th`：`py-3` 统一（存在 `py-2`/`py-2.5` 混排则统一为 `py-3`），加 `text-[var(--foreground-muted)] text-xs font-medium` 标准表头样式。

- [ ] **Step 2: 移除表格 max-h 魔数**

`max-h-[calc(100vh-320px)]` 及其配套 `overflow-y-auto` 移除（表格区高度自适应内容），并同步删除 `thead.sticky` 类（避免页面级滚动下 sticky 无效）——若该页 sticky 依赖存在且移除破坏排序交互，则保留 `thead` 但去掉 max-h 与滚动容器。

- [ ] **Step 3: 选中态三态归一**

- 表头全选/行 checkbox 选中列：`bg-blue-50` → `bg-[var(--accent-subtle)]`
- 工具栏批量操作条（含已选数量）：`bg-blue-50` → `bg-[var(--accent-subtle)]`
- 行选中背景（若有 `bg-blue-50`）：同上
- checkbox 本身 `accent-blue-600` → `accent-[var(--accent)]`

- [ ] **Step 4: 复制图标 + 筛选按钮对齐**

- 复制图标 `text-gray-300 hover:text-gray-500` → `text-[var(--foreground-subtle)] hover:text-[var(--foreground)]`
- 高级筛选按钮与搜索输入框同高：按钮 `py-2` → `py-2.5`（与 inputClass 的 py-2.5 一致）

- [ ] **Step 5: 批量按钮 OUT 色统一**

批量出库按钮（现 amber 系，约 1050-1100 行）：`bg-amber-500`/`text-amber-700` 等 → `variant="danger"` 的 Button（`<Button variant="danger" ...>`）；批量入库 → `variant="success"`；普通主操作（新增/保存搜索）→ `variant="primary"`。

- [ ] **Step 6: 验证**

```bash
npm run lint
npm run build
```

- [ ] **Step 7: 提交**

```bash
git add src/app/parts/page.tsx src/components/PartFormModal.tsx
git commit -m "style: 器件列表页表头/选中态/复制图标/批量按钮语义色统一"
```

---

### Task 6: 器件详情页打磨

**Files:**
- Modify: `src/app/parts/[id]/page.tsx`

**Interfaces:**
- Consumes: Task 2/3 产物；Task 1 令牌

- [ ] **Step 1: 库存大字收敛**

库存数字 `text-4xl sm:text-6xl` → `text-3xl sm:text-4xl`；单位 `text-lg sm:text-xl` → `text-base`。

- [ ] **Step 2: 低库存统一 amber + 进度条分母语义化**

- 低库存标签：`text-red-600`/`bg-red-50` 等 → Badge `variant="warning"`（`<Badge variant="warning">库存不足</Badge>`）
- 进度条：`width: ${(stock / (minStock * 2)) * 100}%` → `(Math.min(stock, minStock) / minStock) * 100`；颜色 `bg-red-500` → `bg-[var(--warning)]`

- [ ] **Step 3: 卡内边距统一 p-6**

详情卡 `p-4`/`p-8` 等 → `p-6`（`sm:p-6` 若存在一并收敛）；卡片圆角 `rounded-xl`/`rounded-2xl` → `rounded-lg`。

- [ ] **Step 4: 入库/出库按钮语义色**

- 入库按钮 `bg-blue-600 hover:bg-blue-700` → `<Button variant="success">`
- 出库按钮 → `<Button variant="danger">`
- 其他操作按钮（编辑/复制等 outline）→ `<Button variant="outline" size="sm">`

- [ ] **Step 5: 图片放大层统一**

图片放大遮罩 `bg-black/80` → `modal-backdrop`（若放大层为 fixed 全屏）；弹窗统一走 Modal 组件（若有自建弹窗结构则替换）。

- [ ] **Step 6: 验证 + 提交**

```bash
npm run lint
npm run build
git add "src/app/parts/[id]/page.tsx"
git commit -m "style: 器件详情页库存大字/低库存琥珀/进度条分母/按钮语义色"
```

---

### Task 7: 出入库页打磨

**Files:**
- Modify: `src/app/stock/page.tsx`
- Modify: `src/components/StockItemCard.tsx`

**Interfaces:**
- Consumes: Task 2/3 产物；Task 1 令牌

- [ ] **Step 1: 模式 Tab 激活态统一**

`grid grid-cols-2 gap-1 p-1 bg-gray-100 dark:bg-[var(--background-muted)] rounded-2xl` 容器 → `rounded-lg`；激活项（现 `bg-white dark:bg-[var(--card)] shadow-sm rounded-xl`）→ `bg-white dark:bg-[var(--card)] shadow-sm rounded` + 文字 `text-[var(--accent)] font-medium`；非激活 `text-gray-600 dark:text-[var(--foreground-muted)] hover:bg-white dark:hover:bg-[var(--card)]` 保持中性。

- [ ] **Step 2: 手动输入/添加弹窗输入框并入 inputClass**

弹窗内所有 `border-gray-300 ... focus:ring-2 focus:ring-blue-500`（约 466 行区域）→ `inputClass`（textarea 用 textareaClass；select 用 SelectField）。

- [ ] **Step 3: StockItemCard 勾选框 + 圆角 + 分类标签**

`src/components/StockItemCard.tsx`：
- 勾选框：未选中态补描边方框（`<input type="checkbox">` 加 `class="h-4 w-4 rounded border-[var(--border)] accent-[var(--accent)]"`；若为自定义 div 复刻，统一为原生 checkbox + accent）
- 卡片 `rounded-xl` → `rounded-lg`；`border-gray-200` → `border-[var(--card-border)]`
- 分类标签（indigo/blue 系）→ Badge `variant="category"`

- [ ] **Step 4: 提交结果条 + sticky 条**

- 提交结果条（成功/失败条）→ `bg-[var(--success-subtle)] text-[var(--success)]` / `bg-[var(--error-subtle)] text-[var(--error)]` + `rounded-lg`
- sticky 提交条（453 行）：`rounded-2xl` → `rounded-lg`；`shadow-lg` 保留；`bottom-20 md:bottom-4` 保留（与底部导航间距）
- 空状态（414-421 行区域）若 Task 3 未覆盖 → EmptyState

- [ ] **Step 5: 验证 + 提交**

```bash
npm run lint
npm run build
git add src/app/stock/page.tsx src/components/StockItemCard.tsx
git commit -m "style: 出入库页模式 Tab/弹窗输入/勾选框/结果条令牌化"
```

---

### Task 8: 流水 + 日志页打磨

**Files:**
- Modify: `src/app/movements/page.tsx`
- Modify: `src/app/logs/page.tsx`

**Interfaces:**
- Consumes: Task 3 产物（两页页头/空状态/分页已换）；Task 1 令牌

- [ ] **Step 1: movements 行距统一**

流水行（203 行）：`px-4 sm:px-8 py-4` → `px-6 py-3.5`；行 hover `hover:bg-gray-50/80 dark:hover:bg-[var(--background-subtle)]` → `hover:bg-[var(--background-subtle)] transition-colors`；行内图标容器 `rounded-xl` → `rounded-lg`。

- [ ] **Step 2: movements 筛选 chip**

chip 搜索结果行（173 行区域）：`rounded-xl border hover:border-blue-300 dark:hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-blue-500/10` → `rounded-lg border hover:border-[var(--accent)] hover:bg-[var(--accent-subtle)] transition-colors`。

- [ ] **Step 3: logs 灰渐变页头清理**

若 logs 页头仍有 `bg-gradient-to-r from-gray-50 to-gray-100` 类渐变块 → 删除（页头已由 PageHeader 接管）。

- [ ] **Step 4: logs 表格与行样式**

日志行/表头：`border-gray-200` → `border-[var(--card-border)]`；操作类型徽章 → Badge（in/out/warning 语义按现有文案映射）；无箭头 select 确认已由 Task 3 SelectField 处理。

- [ ] **Step 5: 验证 + 提交**

```bash
npm run lint
npm run build
git add src/app/movements/page.tsx src/app/logs/page.tsx
git commit -m "style: 流水/日志页行距圆角/筛选 chip/徽章语义色统一"
```

---

### Task 9: BOM 列表 + 详情页打磨

**Files:**
- Modify: `src/app/boms/page.tsx`
- Modify: `src/app/boms/[id]/page.tsx`

**Interfaces:**
- Consumes: Task 2/3 产物；Task 1 令牌

- [ ] **Step 1: boms 列表卡**

- 卡片（107 行区域）：`rounded-2xl ... hover:shadow-lg hover:border-gray-300 dark:hover:border-[var(--card-border)]` → `rounded-lg hover:shadow-md hover:border-[var(--border-hover)] transition-all`；`p-6` 保留
- 编辑/删除图标按钮（116-122 行）：`hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10` → `hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)]`；删除按钮红色系保留但用 `hover:text-[var(--error)] hover:bg-[var(--error-subtle)]`
- 空状态（Task 3 已处理则跳过）

- [ ] **Step 2: boms 新建弹窗**

`src/app/boms/page.tsx` 弹窗（195-230 行区域）：
- 弹窗外壳 `rounded-2xl max-w-lg shadow-2xl` → `rounded-lg max-w-md shadow-xl`；header `px-8 py-6` → `px-6 py-4`（关闭按钮保留）；body `p-6`
- 输入（209/218 行）：`px-5 py-4 bg-gray-50 dark:bg-[var(--background-subtle)] ... focus:ring-2 focus:ring-blue-500` → `inputClass` / `textareaClass`
- 取消按钮（227 行）→ `variant="outline"`；创建按钮 → `variant="primary"`
- 若弹窗结构符合 Modal 模式（title+关闭+body），直接替换为 `<Modal>` 组件

- [ ] **Step 3: boms 详情 `ml-15` 魔数 → gap 布局**

`src/app/boms/[id]/page.tsx`：`ml-15` → 父容器改 `flex gap-3`（或 `ml-15` 上下文为图标+文本 → `gap-3`）。

- [ ] **Step 4: 领料区**

- 领料 checkbox `accent-blue-600` → `accent-[var(--accent)]`
- 确认领料按钮 `bg-blue-600` → `<Button variant="danger">`（领料为扣减操作，语义 OUT）
- 头部卡片 `shadow-sm` 补暗色（若硬编码 `bg-white` 无 dark 类 → `bg-white dark:bg-[var(--card)]`；`border-gray-200` → `border-[var(--card-border)]`）

- [ ] **Step 5: 验证 + 提交**

```bash
npm run lint
npm run build
git add src/app/boms/page.tsx "src/app/boms/[id]/page.tsx"
git commit -m "style: BOM 列表/详情卡圆角/弹窗规范化/领料语义色/ml-15 消除"
```

---

### Task 10: 分析页打磨（含 90 天图表可读性）

**Files:**
- Modify: `src/app/analytics/page.tsx`

**Interfaces:**
- Consumes: Task 2/3 产物；Task 1 令牌

- [ ] **Step 1: 90 天图表改横向滚动 + 周聚合标签**

柱状图容器（`h-48` 定高 + 全部日期标签旋转）：改为：
- 容器：`overflow-x-auto` + 内层 `min-w-[720px]`（30 天）或 `min-w-[1080px]`（90 天，按数据长度动态：`trends.length > 45 ? "min-w-[1080px]" : "min-w-[720px]"`）
- 标签：每 7 天显示一个（`(i % 7 === 0 ? dateLabel : "")`），格式 `MM-DD`，不旋转（`rotate-0`），`text-[10px] text-[var(--foreground-subtle)]`
- 柱组 `flex gap-0.5` 保留；tooltip 用 `title` 属性显示完整日期
- 图例 IN/OUT 色：`bg-emerald-500`/`bg-blue-500` → `bg-[var(--success)]`/`bg-[var(--error)]`

- [ ] **Step 2: 周期按钮激活态**

周期按钮组（30/90 天等）：激活 → `bg-[var(--accent)] text-white`；非激活 → `text-[var(--foreground-muted)] hover:bg-[var(--background-subtle)]`；容器 `rounded-xl` → `rounded-lg`。

- [ ] **Step 3: 统计卡收敛**

统计卡数值 `text-2xl`/`text-4xl` 混用 → `text-3xl`；卡 `rounded-xl` → `rounded-lg`；`shadow-sm` 补暗色令牌。

- [ ] **Step 4: 验证 + 提交**

```bash
npm run lint
npm run build
git add src/app/analytics/page.tsx
git commit -m "style: 分析页 90 天图表横滚+周聚合/周期按钮激活态/统计卡收敛"
```

---

### Task 11: 设置 + 帮助 + 登录页打磨

**Files:**
- Modify: `src/app/settings/page.tsx`
- Modify: `src/app/help/page.tsx`
- Modify: `src/app/login/page.tsx`

**Interfaces:**
- Consumes: Task 2/3 产物；Task 1 令牌

- [ ] **Step 1: settings 输入并入 inputClass**

页面内 `border-gray-300`（无 focus 紫变体）的输入 → `inputClass`；select → SelectField；checkbox → 统一 `h-4 w-4 accent-[var(--accent)]`。

- [ ] **Step 2: settings emoji → lucide**

主题选择器（☀️/🌙/💻 三按钮）→ lucide 图标（`Sun`/`Moon`/`Monitor`，从 `lucide-react` 导入），激活态 → `bg-[var(--accent-subtle)] text-[var(--accent)] border-[var(--accent)]`。

- [ ] **Step 3: settings 删自制 toast**

删除页面内自建 toast 显示（固定定位 top-right 的临时 div 及 state），改用 `useToast()`（`src/components/ToastProvider`）：保存成功 `toast("已保存", "success")`，失败 `toast("保存失败", "error")`。确认无残留 `setTimeout` 清理逻辑。同步确认 ToastProvider z 层级（应为 z-[300]，高于 Modal 的 z-[200]——**读 ToastProvider.tsx 确认**，若低于 200 改为 300）。

- [ ] **Step 4: settings 分类弹窗并入 Modal**

分类管理弹窗 → `<Modal>` 组件（含 header 标题 + 关闭按钮）；输入 → inputClass。

- [ ] **Step 5: help indigo → accent**

全页 `indigo-500/600`/`indigo-50`/`indigo-100` → `var(--accent)` 系列（`text-[var(--accent)]`、`bg-[var(--accent-subtle)]`）；StepCard 圆点 `bg-indigo-500` → `bg-[var(--accent)]`；卡片 `rounded-2xl` → `rounded-lg`。

- [ ] **Step 6: login 令牌化**

`src/app/login/page.tsx`：
- 输入（`focus:ring-2` 等）→ `inputClass`
- 硬编码 `bg-gray-900`/`text-white` 区域 → `bg-[var(--background)] text-[var(--foreground)]`（暗色自动适配）
- 删除内联 `style={{ fontFamily: 'var(--font-heading)' }}`（font-heading 已是系统字体，无特殊感）
- 背景渐变块收敛：保留但改 `from-[var(--background)] to-[var(--accent-subtle)]` 类中性紫调（或纯 `bg-[var(--background)]` + 左侧 accent-subtle 装饰条）
- `focus:ring-2 focus:ring-indigo-500` 移除（全局 focus-visible 已接管）
- 登录按钮 `bg-gradient-to-r from-blue-600 to-indigo-600` → `bg-[var(--accent)] hover:bg-[var(--accent-hover)]`

- [ ] **Step 7: 验证 + 提交**

```bash
npm run lint
npm run build
git add src/app/settings/page.tsx src/app/help/page.tsx src/app/login/page.tsx
git commit -m "style: 设置/帮助/登录页令牌化（emoji→lucide、去自制 toast、去渐变）"
```

---

### Task 12: 共享组件 + 无障碍

**Files:**
- Modify: `src/components/KeyboardShortcuts.tsx`（暗色类 + z-[200] + animate-fade-in）
- Modify: `src/components/NumberInput.tsx`（`appearance-none` 隐藏原生箭头）
- Modify: `src/components/Breadcrumb.tsx`（chevron 暗色 + 统一样式）
- Modify: `src/components/Navigation.tsx`（激活态 accent-soft；`animate-pulse-soft` 复活或删除）
- Modify: `src/app/layout.tsx`（viewport 移除 `maximumScale:1`）
- Modify: `src/components/Modal 调用处`（若散落自建弹窗未并入 Modal：逐页任务已处理，此处核对残余）

**Interfaces:**
- Consumes: Task 1 令牌

- [ ] **Step 1: KeyboardShortcuts 弹窗**

`src/components/KeyboardShortcuts.tsx`：弹窗容器补暗色类（`bg-white dark:bg-[var(--card)] border-[var(--card-border)]`）；`z-[100]` → `z-[200]`；加 `animate-fade-in`；kbd 样式 `bg-gray-100` → `bg-[var(--background-subtle)] text-[var(--foreground)] border-[var(--border)]`。

- [ ] **Step 2: NumberInput 原生箭头隐藏**

`src/components/NumberInput.tsx` 内 input 加 `appearance-none`（需在 globals.css 或该组件内补：

```css
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
```
将该规则加到 globals.css 末尾）。若组件自带加减按钮保留；若存在原生箭头+自定义按钮并存，删自定义按钮保留原生（取决于现有实现——**读组件确认**，保持一致即可，趋势是统一为无原生箭头+自定义按钮）。

- [ ] **Step 3: Breadcrumb chevron**

`src/components/Breadcrumb.tsx`：分隔 chevron `text-gray-400` → `text-[var(--foreground-subtle)]`；当前页 `text-gray-900` → `text-[var(--foreground)]`；链接 hover 补暗色。

- [ ] **Step 4: Navigation 激活态**

`src/components/Navigation.tsx`：激活项 `from-blue-50`/`bg-indigo-50` → `bg-[var(--accent-subtle)] text-[var(--accent)]`；未激活 `text-gray-500` → `text-[var(--foreground-subtle)]`；`animate-pulse-soft` 引用若存在且无副作用 → 保留（Task 1 已定义类）；设置/帮助重复项复核，删除重复链接。

- [ ] **Step 5: viewport 放开缩放**

`src/app/layout.tsx` metadata viewport：`maximumScale: 1` 移除（保留 `width: "device-width", initialScale: 1`）。

- [ ] **Step 6: 图标按钮 aria-label 补全**

grep `className="[^"]*p-[12](\s|\")` 附近的 icon-only `<button>`（无可见文本），逐个补 `aria-label`（如"复制"、"删除"、"关闭"）。重点文件：parts/page.tsx、parts/[id]/page.tsx、boms/page.tsx、settings/page.tsx、Navigation.tsx。**跳过已有 title 属性的按钮**。

- [ ] **Step 7: 验证 + 提交**

```bash
npm run lint
npm run build
git add src/components/KeyboardShortcuts.tsx src/components/NumberInput.tsx src/components/Breadcrumb.tsx src/components/Navigation.tsx src/app/layout.tsx src/app/globals.css
git commit -m "style: 共享组件暗色/焦点/无障碍（快捷键弹窗/NumberInput/面包屑/导航/缩放放开）"
```

---

### Task 13: 暗色覆盖清零 + 全量回归

**Files:**
- Modify: `src/app/globals.css`（删除全部剩余 `!important` 暗色覆盖）
- 视 grep 结果微调各页（残留裸色类补 `dark:` 变体）

**Interfaces:**
- Consumes: 全部前置任务

- [ ] **Step 1: grep 残留裸色类**

```bash
rg -c "bg-white|bg-gray-50|bg-gray-100|text-gray-900|text-gray-700|text-gray-600|text-gray-500|text-gray-400|border-gray-200|border-gray-100|hover:bg-gray-50|divide-gray-100" src/app src/components -g "*.tsx" | rg -v ":0"
```
逐个文件核对：**每个裸色类必须已带 `dark:` 对应变体**（如 `bg-white dark:bg-[var(--card)]`）。缺失的补上（替换规则见下）。

- [ ] **Step 2: 补全暗色变体（替换表）**

| 裸色类 | 替换为 |
|---|---|
| `bg-white` | `bg-white dark:bg-[var(--card)]` |
| `bg-gray-50` | `bg-[var(--background-subtle)]`（暗色自适应，无需 dark:） |
| `bg-gray-100` | `bg-[var(--background-muted)]` |
| `text-gray-900` | `text-[var(--foreground)]` |
| `text-gray-700`/`text-gray-600` | `text-[var(--foreground-muted)]` |
| `text-gray-500`/`text-gray-400` | `text-[var(--foreground-subtle)]` |
| `border-gray-200`/`border-gray-100` | `border-[var(--card-border)]` |
| `hover:bg-gray-50` | `hover:bg-[var(--background-subtle)]` |
| `divide-gray-100` | `divide-[var(--card-border)]` |

- [ ] **Step 3: 删除全部暗色覆盖**

`src/app/globals.css` 删除所有 `[data-theme="dark"] ... { ... !important }` 规则（139-223 行剩余 + 793-898 行剩余 + 琥珀块）。保留 `[data-theme="dark"]` 令牌变量块与 thead.sticky（已用 var(--card)）。

- [ ] **Step 4: 门禁检查**

```bash
rg -n "!important" src/app/globals.css
rg -n "from-blue-600|to-blue-600|indigo-500|from-indigo|to-indigo|shadow-blue|shadow-indigo|shadow-amber|tw-gradient-stops" src/app src/components
rg -n "rounded-2xl|rounded-xl" src/app src/components
```
Expected：三组全部为 0。**例外**：`rounded-2xl/rounded-xl` 允许残留在本波范围外文件（QRScanner.tsx、Combobox.tsx 等未列入本计划文件清单的组件）；若任务 4-11 改造过某文件后其中仍有 xl/2xl，则必须替换为 `rounded-lg`/`rounded` 后归零。

- [ ] **Step 5: 全量回归**

```bash
npm run lint
npm run build
npm test
```
Expected：lint 0 errors；build 通过；vitest 51 项全绿。

- [ ] **Step 6: 手动验收（对照设计文档"手动验收清单"）**

`npm run dev` 后走查：浅色+暗色各一遍所有页面；检查页头/容器/弹窗/select 箭头/focus 可见/移动端底部留白；功能抽查：出入库提交、扫码、领料、搜索/筛选/分页/复制、设置保存、快捷键 `?`、登录。此步由主 agent 与用户共同完成，不在子代理范围内。

- [ ] **Step 7: 提交**

```bash
git add src/app/globals.css src/app src/components
git commit -m "style: 暗色 !important 覆盖清零 + 全量回归（门禁归零/vitest/lint/build）"
```

---

## 范围外（不实现）

- 图表库引入/重写（仅现有柱状图可读性修复，Task 10）
- 功能、API、认证、缓存逻辑改动
- 移动端底部导航重构（仅留白与间距）
- 任何新依赖
- QRScanner/Combobox 内部重写（仅随调用处换输入类）

## Self-Review 记录

- **Spec coverage**：设计文档 §1→Task 1；§2→Task 2；§3→Task 3；§4 各页→Task 4-11；无障碍清单→Task 12 + Modal/Esc/aria 内建于 Task 2；实施顺序一致（令牌→组件→布局→逐页→无障碍+验收）。设计文档 §1.3 "输入框底色改白底"→Task 2 inputClass；"底部留白单源"（AppShell `pb-20 md:pb-6`）→ 无独立任务，并入 Task 12 时核对 AppShell（若 .main-content 移动 padding-bottom 56px 保留且 AppShell 已有 pb，则仅确认未双轨，不强行改——纳入 Task 12 Step 4 复核）。
- **Placeholder scan**：无 TBD/TODO；每任务含实际代码或精确替换串。
- **Type consistency**：`ButtonVariant`/`BadgeVariant`/`ModalProps`/`PaginationProps` 全计划唯一且一致；`inputClass`/`selectClass`/`textareaClass`/`cardClass` 命名唯一。
- **风险**：Task 4 Step 4 琥珀覆盖删除条件依赖 grep 归零，条件不满足则保留——已写明。Task 5 Step 2 sticky 表头移除可能影响交互，已写保留分支。
