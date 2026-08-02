# 分类筛选修复 + 双面包屑/搜索图标对齐 设计文档

- 日期：2026-08-02
- 状态：已确认（根因经数据库查询 + 代码链路核实；匹配语义经用户选择）
- 关联：`docs/superpowers/specs/2026-08-02-frontend-polish-design.md`（上一波视觉改造，本波为其遗留 bug 修复）

## 背景与根因

用户报告三个问题，根因全部核实：

1. **数据分析页双面包屑**：`src/app/analytics/page.tsx:110` 存在独立 `<Breadcrumb items={[{label:"数据分析"}]} />`，Task 3 引入 PageHeader 时又在 `:114` 的 `breadcrumb` prop 里嵌了第二个——两处同时渲染。

2. **器件列表搜索框放大镜不居中**：`src/app/parts/page.tsx:483` 图标 `absolute left-5`(20px)+`w-5`(20px) → 图标中心 30px；输入框 `:496` `pl-14`(56px) → 预留区中心 28px。图标中心与预留区中心差 2px，且图标右缘(40px)距文字起点(56px)有 16px 空隙，视觉明显偏左。根因：Task 3 换 `inputClass` 时给输入框加了 `pl-14`，但图标定位（Task 5 改类时保留的 `left-5 w-5`）与之不匹配。

3. **分类功能（三个子问题，同源）**：
   - **筛选结果变少/为空**：后端精确匹配（`db-sqlite.ts:116` `AND p.category = ?`、`db-redis.ts:156` `p.category === filters.category`），而下拉选项是 `CategoryInput.tsx:5` 硬编码 10 个；数据库真实分类（sqlite 实测：`贴片电阻`8、`电阻`2、`IC`1、`LED`1、`助焊剂/助焊膏`1、`电容`1）与选项脱节——"助焊剂/助焊膏"永远选不到；选"电阻"精确匹配只命中 2 个，"贴片电阻"8 个被排除。
   - **分类固定**：categories 表（settings 分类管理 CRUD 的数据源）实测为空，器件分类来自 LCEDA 扫码导入；硬编码选项与真实数据完全脱节，settings 建的分类也不会出现在下拉。
   - **样式重叠**：Combobox（上一波范围外组件）输入框 `px-5 py-4 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50`（`Combobox.tsx:40`），而 parts 页外层 Filter 图标 `left-4`(16px)+`w-4`(16px) 占 16-32px → 文字起点 20px 与图标 16-32px **重叠 12px**；且圆角/焦点环/高度与全站 inputClass 体系不一致。

## 方案决策（用户已选）

- 匹配语义：**B 包含匹配**——选"电阻"自动带出所有分类名含"电阻"的器件（"电阻"+"贴片电阻"）
- 下拉选项：**动态化**（真实在用分类 ∪ settings 管理分类），治"分类固定"与"筛不出"
- 离线兜底：拉取失败回退硬编码 10 个

## 设计

### §1 简单修复（两处）

1. **删重复面包屑**：`src/app/analytics/page.tsx:110` 删除独立 `<Breadcrumb items={[{label:"数据分析"}]} />`；保留 PageHeader `breadcrumb` prop 中的（`:114`）。删除后全文件 `<Breadcrumb` 仅剩 PageHeader prop 内 1 处。

2. **搜索框图标居中**：`src/app/parts/page.tsx:483` 图标类改 `absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4`（中心 24px）；`:496` 输入框 `pl-14` 改 `pl-12`（48px，中心 24px）。图标右缘 32px ≤ 文字起点 48px，无重叠且居中。

### §2 分类功能改造

**2.1 后端：新增分类列表接口 + 包含匹配**

- `src/lib/db.ts`：`Db` 接口加 `listPartCategories(): Promise<string[]>`——返回 `DISTINCT parts.category`（非空、去重、按使用数量倒序）+ `categories.name`（settings 分类）合并去重排序。实现于：
  - `src/lib/db-sqlite.ts`：`SELECT category, COUNT(1) as cnt FROM parts WHERE category != '' GROUP BY category ORDER BY cnt DESC` + `SELECT name FROM categories ORDER BY sortOrder, name`，合并 `Set` 去重
  - `src/lib/db-redis.ts`：遍历 parts hash 收集非空 category + categories set，同样合并去重
- `src/app/api/parts/categories/route.ts`（新建）：`GET` → `db.listPartCategories()`，`force-dynamic`，错误返回 500 `{error:"获取分类失败"}`
- 匹配改包含：`db-sqlite.ts:116` `p.category = ?` → `p.category LIKE ?`，参数 `%${category}%`，并带 `ESCAPE '\'` 转义分类中的 `%`/`_`（`category.replace(/[\\%_]/g, (c) => "\\" + c)`）；`db-redis.ts:156` `===` → `includes(filters.category)`（大小写敏感与 sqlite LIKE 默认一致）

**2.2 前端：CategoryInput 动态选项 + Combobox 样式对齐**

- `src/components/CategoryInput.tsx`：删除硬编码 `CATEGORY_OPTIONS` 作为唯一来源，改为：
  - state `options` 初始为现有 10 个硬编码（占位/回退）
  - `useEffect` 挂载时 `fetch("/api/parts/categories")`，成功则 setOptions（含 API 返回）；失败静默保留硬编码
  - 传入 Combobox 的 options 用 state
- `src/components/Combobox.tsx`：
  - 输入框类改 `inputClass`（`@/components/ui/constants` 导入；保留 Combobox 无需的差异：下拉面板 `rounded-lg` 替换 `rounded-xl`、`border-[var(--card-border)]`、`max-h-52` 保留）
  - 过滤逻辑不变（`options.filter(opt => opt.toLowerCase().includes(value.toLowerCase()))`）
- `src/app/parts/page.tsx:539` 分类框：Filter 图标改 `left-4 w-4 h-4`（16px 起点，中心 24px）+ Combobox 输入框在 inputClass 基础上加 `pl-12`（48px，中心 24px）→ 与搜索框图标中心（24px）完全一致，消除 12px 文字/图标重叠

**2.3 测试**

- `src/lib/__tests__/db-sqlite.test.ts` 补：
  - `listPartCategories()` 返回去重合并集合（构造含 parts.category + categories.name 的数据）
  - `listParts({ category: "电阻" })` 用包含匹配命中"电阻"与"贴片电阻"
  - 分类含 `%`/`_` 时转义正确（不误命中）
- 现有 51 项 vitest 全绿不回归

## 涉及文件清单

- Modify: `src/app/analytics/page.tsx`（删重复面包屑）
- Modify: `src/app/parts/page.tsx`（搜索图标/输入框对齐、分类框图标对齐）
- Modify: `src/components/CategoryInput.tsx`（动态选项 + 回退）
- Modify: `src/components/Combobox.tsx`（inputClass 对齐、下拉面板圆角）
- Modify: `src/lib/db.ts`、`src/lib/db-sqlite.ts`、`src/lib/db-redis.ts`（listPartCategories + LIKE 匹配）
- Create: `src/app/api/parts/categories/route.ts`
- Modify: `src/lib/__tests__/db-sqlite.test.ts`（新用例）

## 范围外（不做）

- 分类管理界面增强（settings 分类 CRUD 已有，不动）
- 分类层级/父子分类、分类重命名联动（db 层已有重命名时同步 parts，不动）
- LCEDA 导入分类映射/规范化
- PartFormModal 分类表单行为（自动获得动态选项，无需改）
- 其他页面遗留样式（本次仅触两页 + 两组件）

## 验收标准

1. `/analytics` 页面只有一个面包屑
2. `/parts` 搜索框放大镜与文字起点无重叠、视觉居中（图标中心=预留区中心）
3. `/parts` 分类下拉包含"贴片电阻""助焊剂/助焊膏"等真实分类（非硬编码 10 个）
4. 选"电阻"筛选结果 = 分类名含"电阻"的全部器件（含"贴片电阻"）；手输"助焊"同样命中
5. 分类框文字与 Filter 图标无重叠，样式与全站 inputClass 一致（圆角 4px、紫焦点、标准高度）
6. `npm test` 全绿（含新增用例）、`npm run lint` 0 errors、`npm run build` 通过
