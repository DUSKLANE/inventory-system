# 前端视觉体系化改造设计文档

- 日期：2026-08-02
- 状态：已确认（视觉方向经浏览器对比选定）
- 关联：`docs/superpowers/plans/2026-08-02-user-flow.md`（上一波功能改造，本波为纯视觉改造，功能零改动）

## 背景与目标

审计发现（已核实行号）全站前端存在系统性视觉问题：

1. **两套主题体系并存**：globals.css 定义了完整设计令牌（`--primary:#4263eb` 等），但全站 95% 直接裸用 Tailwind 色值；约 40 条 `!important` 暗色覆盖互相打架（`.bg-gray-50` 双定义冲突）；`focus:ring-*` 30 处全部被全局 `input:focus` 盒阴影压制失效。
2. **双主色**：blue-600 渐变（10 处）与 indigo-500 纯色（10 处）并存，与令牌 `--primary` 三者互不相同；页面渐变页头 7 种配色。
3. **重复复制**：卡片外壳 23 处、弹窗外壳 10 处、关闭按钮 9 处、行 hover 8 处、spinner 6 份、空状态 6 种、分页 3 种——全部手搓且形态各异。
4. **布局失序**：页面容器 5 档宽度；卡片内边距 p-4~p-10 五档；表头 py 混排；底部留白双轨 136px。
5. **输入/控件**：4 套输入变体、5 个无箭头 select、3 套 checkbox、NumberInput 双控件。
6. **死代码**：`animate-fade-in`（22 处引用，类未定义，弹窗动画全失效）、仪表盘 `var(--tw-gradient-stops)` 死装饰、20+ 未使用类。
7. **语义色分裂**：IN 三色（emerald/blue/indigo）、OUT 三色（red/amber/blue）、低库存红/琥珀并存。
8. **其他**：Google Fonts `@import` 内网必失败、JetBrains Mono 声明未加载、`maximumScale:1` 禁缩放、KeyboardShortcuts 弹窗无暗色类、settings emoji+自制 toast、90 天图表标签重叠不可读。

**目标**：建立单一设计令牌体系，抽取共享组件库，逐页迁移打磨，一次根治上述问题。验收标准：grep 死代码归零、无跨文件样式复制、明暗两主题下所有页面观感一致。

## 视觉方向（用户已选定）

| 维度 | 决策 |
|---|---|
| 风格 | **C 中性专业**（Linear/Vercel 工具风）：黑白灰基底、无渐变、低饱和、小圆角、高信息密度 |
| 强调色 | **Linear 紫 `#5e6ad2`**（浅色 hover `#4a56c2`；暗色 `#767fe0`、hover `#8b93e6`） |
| 暗色基调 | **深灰 `#18181b`** 背景 / 卡片 `#27272a` / 边框 `#3f3f46` |
| 密度 | **标准**：行高 ≈44px、输入框 py-2.5、卡片 p-5 |
| 圆角 | 控件 4px（rounded）、卡片/弹窗 8px（rounded-lg） |
| 字体 | 系统字体栈（去掉 Google Fonts @import）；等宽 `ui-monospace` 栈 |
| 阴影 | 中性淡阴影，消灭全部彩色阴影（shadow-blue-500/25 等） |
| 焦点 | 全站统一 2px 紫 ring（替代全局 input:focus 盒阴影规则） |
| 依赖 | **不引入新依赖**；Modal/Combobox 以薄封装实现，接口预留未来可换底 |

## §1 设计令牌（globals.css 重写）

### 1.1 色板（CSS 变量，浅/暗两套）

```css
:root {
  --bg: #fafafa;            /* 页面背景 */
  --card: #ffffff;
  --border: #e4e4e7;        /* 卡片/分割线 */
  --border-strong: #d4d4d8; /* 输入框/激活边框 */
  --text: #18181b;
  --text-secondary: #52525b;
  --text-muted: #71717a;
  --accent: #5e6ad2;
  --accent-hover: #4a56c2;
  --accent-soft: #f0f1fb;   /* 选中态/激活态浅紫底 */
  --success: #059669;       /* IN / 成功 */
  --success-soft: #ecfdf5;
  --danger: #dc2626;        /* OUT / 错误 */
  --danger-soft: #fef2f2;
  --warning: #d97706;       /* 低库存 / 警告 */
  --warning-soft: #fffbeb;
}
[data-theme="dark"] {
  --bg: #18181b;
  --card: #27272a;
  --border: #3f3f46;
  --border-strong: #52525b;
  --text: #e4e4e7;
  --text-secondary: #d4d4d8;
  --text-muted: #a1a1aa;
  --accent: #767fe0;
  --accent-hover: #8b93e6;
  --accent-soft: rgba(118,127,224,.15);
  --success: #34d399;
  --success-soft: rgba(16,185,129,.15);
  --danger: #f87171;
  --danger-soft: rgba(248,113,113,.15);
  --warning: #fbbf24;
  --warning-soft: rgba(251,191,36,.12);
}
```

旧令牌（`--primary/#4263eb`、`--accent/#f76707`、`--background-*`、`--foreground-*`、`--card-border` 等）全部替换；旧 `dark:` 类名引用（`dark:bg-[var(--card)]` 等）改新变量名 `dark:bg-[var(--card)]` 沿用（变量名 `--card` 不变，仅色值变），**变量更名需全局 grep 更新引用**。

### 1.2 语义色统一（全站）

| 语义 | 统一色 | 迁移点（现分裂色） |
|---|---|---|
| IN 入库 | success（emerald 系） | stock IN tab blue→emerald、parts/[id] 入库按钮 blue→emerald、analytics 柱状 emerald 色阶与 dashboard 统一 |
| OUT 出库 | danger（red 系） | parts 批量出库 amber→red、boms/[id] 领料确认 blue→red、stock OUT tab 保持 red |
| 低库存/警告 | warning（amber） | parts 表红/琥珀 → amber、parts/[id] amber 保持、dashboard 预警区 amber 保持 |
| 分类标签 | 灰底（zinc）为主 | boms/[id]、StockItemCard indigo/blue 分类标签 → 灰 |
| 激活/选中态 | accent-soft 紫底 | 侧栏激活 from-blue-50→accent-soft、help 激活 bg-indigo-50→accent-soft、表格选中 bg-blue-50→accent-soft |

### 1.3 其他令牌

- 圆角：`--radius-sm: 4px`（输入/按钮/徽章）、`--radius: 8px`（卡片/弹窗/页头）
- 字体：`--font-sans: system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif`；`--font-mono: ui-monospace, "Cascadia Mono", "SF Mono", Consolas, monospace`（删除 Google Fonts `@import` 与 Sora/DM Sans/JetBrains Mono 引用；login 页 `--font-heading` 内联 style 移除）
- 阴影：卡片 `0 1px 2px rgba(0,0,0,.04)`、hover 加深一档、弹窗 `0 8px 24px rgba(0,0,0,.12)`（暗色同但透明度降低）；删全部彩色阴影
- 焦点：全局 `:focus-visible` 统一 `outline: 2px solid rgba(94,106,210,.5); outline-offset: 1px`，删除 `input:focus` 盒阴影规则（消灭 30 处失效 focus:ring-*）
- 动画：**补 `.animate-fade-in { animation: fadeIn .18s ease-out }` 与 `.animate-pulse-soft` 定义**（22+1 处引用全部复活）；保留现有 @keyframes
- 布局：`.section` 双定义合并（16/24/32px 响应式一份）；`.main-content` 移动端 padding-bottom 由 56px 改为 0，底部留白单一来源由 AppShell 控制（`pb-20 md:pb-6`）
- 输入框底色：浅色 `#fff` + `--border-strong` 边框（由深色底 #f9fafb 改为白底，层级更清晰）；暗色 `--card` + `--border`；行 hover 底色 `rgba(0,0,0,.02)`（浅）/`rgba(255,255,255,.04)`（暗）

### 1.4 旧变量迁移映射表（全站 grep 更新）

| 旧变量 | 新变量/替代 |
|---|---|
| `--primary` `--primary-muted` | `--accent`；focus 环改全局 focus-visible 规则 |
| `--accent`（#f76707 橙） | 删除；橙色语义由 `--warning` 承担 |
| `--background-subtle` | 输入底 → 白/`--card`；行 hover → `rgba(0,0,0,.02)`/`rgba(255,255,255,.04)` |
| `--background-muted` | `--bg` |
| `--card-border` | `--border` |
| `--foreground-subtle` | `--text-secondary` |
| `--foreground-muted` | `--text-muted` |
| `--card` | 保留变量名，仅暗色值 `#21262d`→`#27272a` |
| 裸 Tailwind 色值（blue-600/indigo-500 等 90+ 处） | §4 逐页迁移到令牌/语义色/组件 |

### 1.5 清理清单

- 删除约 40 条 `[data-theme="dark"] ... !important` 覆盖（含 `.bg-gray-50`/`.bg-gray-100` 冲突对、输入框全局背景强制、`:833-844` 脆弱补丁、`thead.sticky th` 硬编码背景、`aside` 覆盖）
- 删除死 CSS：`.card`、`.btn/.btn-sm/.btn-lg`、`.badge` 系列、`.card-hover`、`.card-gradient-border`、`.btn-press`、`.btn-shimmer`、`.stagger-children`、`.gradient-text*`、`.dot-pattern`、`.grid-pattern`、`.mesh-gradient`、`.skeleton`、`.spinner-slow`、`.ripple`、`.table-hover/.table-striped/.table-row-selected`、`.toast-enter/.toast-exit`、`.dark-card/.dark-text/.dark-muted/.dark-icon-bg`
- 保留但收敛：`.page-container`（改两档）、`.modal-backdrop`、`.section`

## §2 共享组件库（src/components/ui/）

**原则**：组件薄封装 + className 常量导出。全部手写，不引入依赖。Modal/Combobox 接口保持"可无痛换底"（内部实现隔离）。

| 组件/常量 | 内容 | 消灭的复制 |
|---|---|---|
| `inputClass` 等常量（`ui/constants.ts`） | Input/Select/Textarea 统一类串；Select 常量内含右箭头图标定位（wrapper 方案）；含暗色与 focus-visible 态 | 4 套输入变体 20+ 处、5 个无箭头 select |
| `Button.tsx` | variants: primary(紫实心)/outline/ghost/danger/success；sizes: sm/md；支持 asChild/onClick/disabled 态 | blue 渐变 10 处 + indigo 10 处 + 各页按钮杂类 |
| `Card.tsx` | 统一外壳 `bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-card` + 可选 header/body/padding 档位 | 23 处卡片外壳 |
| `Badge.tsx` | variants: in/out/warning/neutral/category；尺寸 sm | IN/OUT/分类/低库存标签 10+ 处 |
| `Modal.tsx` | 统一 z-[200]、遮罩、外壳、header（标题+关闭按钮）、footer、Esc 关闭、body 滚动锁 | 10 处弹窗 + 9 处关闭按钮 + 3 种 z 层级 |
| `PageHeader.tsx` | 标题 + 副标题 + 右侧操作区 + 可选面包屑；无渐变块 | 4 种页头模式 7 种渐变 |
| `EmptyState.tsx` | 图标章（w-12 h-12 rounded-lg bg-中性底）+ 标题 + 说明 + 可选操作 | 6 种空状态 |
| `Spinner.tsx` | 单圆环 spinner（尺寸 sm/md） | 6 份双圈 spinner 复制 |
| `ConfirmProvider/ToastProvider` | **不重写**，仅样式微调对齐新令牌（z 层级保留） | — |

**使用规则**：新页面一律用组件；存量页面在 §4 迁移中替换。`inputClass` 常量优先（侵入最小），组件化替换分批进行。

## §3 页面布局统一

1. **容器两档**：`.page-container`（1400px）：仪表盘、器件列表、日志、分析、BOM 列表；`.page-container-narrow`（1024px）：器件详情、BOM 详情、出入库、流水（数据列少）、设置、帮助。padding 16/32px 不变。settings/help 移除自带 `max-w-3xl/4xl` 包裹。
2. **页头统一**：PageHeader = 面包屑（可选）+ 标题（text-2xl font-semibold）+ 副标题（text-sm text-muted）+ 右侧操作按钮。删除全部渐变图标块。
3. **面包屑补全**：parts 列表、settings、help 新增；Breadcrumb chevron 补暗色类。
4. **分页统一**（列表类页）：`上一页/下一页` 按钮对 + `第 X / Y 页` + 跳页输入 + 每页条数 select（10/20/50/100）——以 parts 现完整版为基准；movements/logs 补齐完整版（两页 API 均已支持 pageSize）。
5. **空状态统一**：EmptyState 组件全站替换。
6. **杂项**：表头 py 统一 `py-3`；底部留白单源；sticky 提交条 `bottom-20 md:bottom-4` 与底部导航间距复核；弹窗内边距统一 p-6；流水/日志行距统一 `px-6`；`ml-15` 魔数改 `gap-3` 弹性布局。

## §4 逐页打磨清单

### 仪表盘（src/app/page.tsx）
- 删 `:281-282` 死装饰（`--tw-gradient-stops` 无效渐变块）
- 统计卡统一 Card + 数值 `text-3xl`（收敛 text-2xl/4xl 混用）、装饰去彩色
- 预警区折叠补过渡动画；库存趋势柱状图与 analytics 色阶统一（同 emerald/red 深浅）
- `:580` stagger `animationDelay` 依赖死类 → 删除或补 stagger-children

### 器件列表（src/app/parts/page.tsx）
- 表头 py 混排统一；`max-h-[calc(100vh-320px)]` 魔数移除（表格区高度自适应内容，sticky 表头同步移除，避免魔数与滚动依赖）
- 选中态三态归一（表格 bg-accent-soft / 工具栏 bg-accent-soft / 移动端补）
- 复制图标 `text-gray-300` → text-muted；高级筛选按钮与输入框对齐（同高 py）
- 批量按钮 OUT 色 amber→danger；保存搜索弹窗并入 Modal

### 器件详情（src/app/parts/[id]/page.tsx）
- 库存大字 `text-4xl sm:text-6xl` → `text-3xl sm:text-4xl`，单位比例协调
- 低库存统一 amber；进度条分母 `minStock*2` → `minStock`（语义化）
- 卡内边距统一 p-6；入库按钮 blue→success、出库按钮统一 danger
- 图片放大层 `bg-black/80` → 统一 modal-backdrop

### 出入库（src/app/stock/page.tsx）
- 模式 Tab 激活态与全站统一（现 from-blue-600 渐变 → accent 实底白字或下划线式）
- 手动输入/添加弹窗输入框并入 inputClass（border-gray-300+indigo focus 分叉消除）
- StockItemCard：勾选框补边框（未选中态改为描边方框）、rounded-xl→rounded-lg 对齐、分类标签灰色
- 提交结果条并入卡片样式；sticky 条间距复核

### 流水（src/app/movements/page.tsx）
- 容器改 narrow；搜索输入 py-2 → py-2.5；行距 px-4 sm:px-8 → px-6；chip 搜索结果行高协调；分页补齐统一版

### 日志（src/app/logs/page.tsx）
- 两个无箭头 select 补箭头图标（Select wrapper）；页头灰渐变去灰改中性；空状态用 EmptyState

### BOM 列表/详情（src/app/boms/page.tsx、boms/[id]/page.tsx）
- 列表卡 hover 暗色态修复；新增弹窗输入并入 inputClass
- `ml-15` → gap 布局；领料 checkbox accent-blue-600 → 统一样式；确认领料按钮 blue→danger
- 头部卡片 shadow-sm 补暗色处理；编辑态输入 py-3 对齐

### 分析（src/app/analytics/page.tsx）
- **90 天图表**：`h-48` 内 90 组双柱+旋转标签不可读 → 改横向滚动（overflow-x-auto + min-width）+ 标签每 7 天一个 + tooltip title；周档聚合展示
- 周期按钮激活态统一（accent 实底）；统计卡数值字号与仪表盘统一 text-3xl

### 设置（src/app/settings/page.tsx）
- 并入 page-container-narrow；C 变体输入（border-gray-300 无 focus）并入 inputClass
- emoji 主题选择器（☀️🌙💻）→ lucide（Sun/Moon/Monitor）
- 删自制 toast（与 ToastProvider top-4 right-4 冲突）；分类弹窗并入 Modal（补 header/关闭按钮）

### 帮助（src/app/help/page.tsx）
- 并入 page-container-narrow + 面包屑；indigo 全页 → accent 统一；StepCard 圆点 indigo→accent

### 登录（src/app/login/page.tsx）
- 硬编码 gray 暗色 → 设计令牌；focus:ring-2 移除（全局 focus-visible 生效）；背景渐变保留但收敛为中性+紫调；内联 `--font-heading` style 移除

### 快捷键弹窗（src/components/KeyboardShortcuts.tsx）
- 补暗色类；z-[100]→z-[200] 统一；补 animate-fade-in

### 组件（其他）
- NumberInput：加 `appearance-none` 隐藏原生箭头；加减按钮尺寸对齐 md
- Breadcrumb：chevron 补暗色；mb-6 由调用方控制
- Navigation：`animate-pulse-soft` 复活或删除；激活态改 accent-soft；更多菜单重复项复核（设置/帮助）

## §5 范围外（不做）

- 图表库引入/重写（仅现有柱状图可读性修复）
- 功能、API、认证、缓存逻辑改动
- 移动端底部导航重构（仅留白与间距修正）
- 引入任何新依赖

## 无障碍清单（手写组件补偿）

- Modal：Esc 关闭、焦点入框（首个可聚焦元素）、body 滚动锁、遮罩点击可选关闭、aria-modal 标注
- 所有图标按钮补 aria-label 或 title
- 焦点可见性由全局 focus-visible 规则保障（不依赖被压制的前 focus:ring 类）
- `maximumScale:1` 移除（允许缩放）
- 颜色对比：text-muted #71717a 在浅色、#a1a1aa 在暗色均满足 WCAG AA（正文级别）

## 手动验收清单

1. 浅色 + 暗色各走一遍：仪表盘 → 器件列表 → 详情 → 出入库（含弹窗/扫码）→ 流水 → BOM → 分析 → 日志 → 设置 → 帮助 → 登录
2. 检查每页：页头一致、容器宽度正确、卡片/输入/按钮/徽章风格统一、无残留渐变块、无彩色阴影
3. 弹窗：打开/关闭动画、Esc 关闭、暗色下正常、z 层级不打架（快捷键弹窗 vs toast vs confirm）
4. select 全站有箭头；focus 态可见（Tab 遍历）
5. 移动端（375px）：底部留白正常、无横向溢出、可缩放
6. grep 验证：`from-blue-600|indigo-500|shadow-blue|animate-fade-in(定义存在)|!important` 归零
7. `npx vitest run` 全绿 + `npm run lint` 0 errors
8. 功能回归：出入库提交、扫码、领料、搜索/筛选/分页/复制、设置保存、快捷键

## 实施顺序

1. §1 令牌重写（globals.css）+ 全站变量名迁移 + 清理清单
2. §2 组件库搭建（constants 先行）
3. §3 布局统一（容器/页头/面包屑/分页/空状态）
4. §4 逐页迁移（每页一个工作单元，含视觉+语义色+组件替换）
5. 无障碍清单 + 手动验收 + 回归
