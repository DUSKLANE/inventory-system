# 核心流程可用性修复设计文档（方案 A）

日期：2026-08-02
状态：已批准（用户确认方案 A）

## 背景与目标

系统功能面广（14 页面 / 27 API），但核心价值集中在三条链路：**扫码入库 → 器件查找 → 出库/领料**。当前存在 32 项设计问题（见 2026-08-02 UX 审计），其中最高影响的是：

- 扫码连续扫同码被去重逻辑吞掉（与累加功能自相矛盾）
- 扫码批量入库无事务，留孤儿数据
- BOM 无"一键领料出库"，库存检查只是展示
- 列表排序是"假排序"（只排当前页 20 条），筛选状态不写回 URL
- 设置页 5 个配置项无人消费（死配置）
- 仓库功能是无人消费的孤岛
- 32 处原生 alert/confirm/prompt、CSS 全局覆盖、主题首屏闪烁

**使用环境**：桌面为主、手机扫码、个人自用。移动端除扫码页外不做精细打磨；不引入新依赖；不重构认证、Redis 适配器、图表页。

**目标**：让三条核心链路好用、数据可信，顺手清理交互底座。

## 设计决策

### 1. 扫码入库链路

#### 1.1 修复扫码去重与累加冲突

现状：`QRScanner.tsx` 的 `scannedCodesRef` 在会话内去重（仅 `handleClose` 清空），与 scan 页同码累加逻辑冲突——连扫同码时第二次扫码完全无响应。

方案：
- `QRScanner` 移除会话级去重，只负责将每次扫码结果（原始文本）通过回调吐出，不做任何业务判断。
- 同码判定逻辑上移到 scan 页：1.5 秒窗口内收到相同编码视为连扫重复（忽略，可显示轻提示）；超过窗口则作为新条目并**累加数量**到已有待入库项。
- 手动输入路径（modal）同样走页面级归并逻辑。

#### 1.2 批量入库走事务（upsert）

现状：scan 页对每个条目串行 POST `/api/parts` + `/api/movements`，创建成功但流水失败会留孤儿器件。

方案：扩展 `POST /api/parts/batch`，新增 `action: "stock-in-upsert"`：

```jsonc
// 请求
{
  "action": "stock-in-upsert",
  "items": [
    {
      "code": "Z0001",            // 必填
      "name": "10KΩ 电阻",        // 器件不存在时必填
      "category": "电阻",          // 可选
      "package": "0603",          // 可选
      "unit": "pcs",              // 可选，默认读设置 default_unit
      "location": "A1-2",         // 可选
      "quantity": 100             // 必填，> 0
    }
  ],
  "reason": "扫码入库"
}
```

服务端行为（SQLite：单事务；Redis：逐条执行，尽力一致）：
- 编码已存在 → 直接入库 + 写流水
- 编码不存在 → 先创建器件（编码生成保持现有 `generateNextCode` 规则；若传入 code 使用传入值），再入库 + 写流水
- 返回 `{ success, results: [{ code, partId, success, message, newQuantity }], successCount, failCount }`

响应结构对齐现有 `batchMovement` 的 `BatchResult` 风格。DB 层新增方法 `batchStockInUpsert(items, operator, reason)`；SQLite 实现内部复用事务。

#### 1.3 扫码页直接创建新器件

- 未命中编码的条目卡片增加"创建并入库"能力：可编辑名称/封装/分类/位置，提交走 1.2 的 upsert 端点。
- 原有"本地查重 + LCEDA 查询"流程保留，但不再阻塞提交。

### 2. BOM 一键领料出库

#### 2.1 新增端点 `POST /api/boms/[id]/checkout`

```jsonc
// 请求
{
  "items": [{ "partId": "…", "quantity": 10 }],  // 来自 BOM 明细，可含部分项
  "reason": "BOM 领料"
}
```

服务端：单事务内校验每项库存充足，全部满足才提交（任一不满足则整体回滚，返回 409 + 缺料明细列表 `[{ partId, code, name, required, available, shortfall }]`，不产生任何流水）；通过则批量创建 OUT 流水 + 扣减库存 + 写 operation_log。operator 取登录用户。

响应（成功）：`{ success: true, results: [{ partId, code, name, quantity, success: true, newQuantity }] }`；失败：`{ success: false, error: "库存不足", insufficient: [...] }`（HTTP 409）。

复用 `batchMovement(type="OUT")` 的校验逻辑，但整体失败语义（BOM 领料要么全成要么全不成——前端已允许勾选跳过缺料项，提交的应是可满足子集；后端兜底防超卖）。

#### 2.2 BOM 详情页交互

- 新增"领料出库"按钮（查看模式）：弹窗列出每项 `需要 X / 库存 Y / 缺口 Z`，缺口项默认不勾选并标红；勾选项提交 2.1 端点；成功后刷新库存展示 + toast 汇总。
- 编辑模式加脏检查：有未保存改动时点击"取消/返回"弹确认（复用新 Confirm 组件）。

### 3. 器件列表（桌面主场景）

#### 3.1 服务端排序

- `GET /api/parts` 新增查询参数 `sortField` / `sortOrder`，白名单：`code | name | category | brand | stock | location | updatedAt | createdAt` × `asc | desc`。
- db-sqlite 的 `listParts` 改为参数化 ORDER BY（白名单映射，防注入）；db-redis 同步支持。
- 列表页移除客户端排序，改为请求级排序；默认值读设置 `default_sort_field/default_sort_order`。
- 排序跨页正确（服务端分页 + 服务端排序）。

#### 3.2 筛选状态写回 URL

- parts 页所有筛选（q、分类、品牌、库存范围、低库存、有库存）、排序、页码均通过 `router.replace` 同步到 searchParams。
- mount 时从 URL 初始化（含 q/分类/排序/页码）。
- 前进/后退、刷新、分享链接可恢复状态。
- 搜索历史/保存搜索（localStorage）保留。

#### 3.3 设置页真实接线

| 设置键 | 消费点 |
|---|---|
| `page_size` | parts 列表每页条数（默认 20） |
| `low_stock_threshold` | 仪表盘低库存预警、parts 低库存筛选 |
| `default_unit` | 新建器件表单单位默认值（PartFormModal） |
| `default_sort_field/order` | parts 列表默认排序 |

设置页保留以上 5 项真实配置；无其他死配置残留。

#### 3.4 移动端列表批量操作

- 移动端卡片视图补复选框 + 选中后显示批量操作栏（复用桌面批量逻辑：批量出入库/删除）。

### 4. 交互底座与清理

#### 4.1 Toast + Confirm 组件

- 新增 `src/components/Toast.tsx`（`useToast` hook + 容器）与 `src/components/ConfirmDialog.tsx`（Promise 式 `confirm()` 替代）。
- 替换全部 32 处 `alert/confirm/prompt`：
  - `alert` → toast（错误/成功）
  - `confirm` → ConfirmDialog（async/await 包装）
  - `prompt`（保存搜索名）→ 内联输入框或 Modal 表单
- 涉及文件：parts/page.tsx、parts/[id]/page.tsx、boms/page.tsx、boms/[id]/page.tsx、scan/page.tsx、warehouses/page.tsx（下线）、PartFormModal.tsx、StockMovement.tsx 等。

#### 4.2 移除 CSS 全局覆盖

- 删除 `globals.css` 中 `.gap-5, .gap-6 { gap: 10px }` 与 `.bg-white.rounded-2xl { padding: 10px }` 覆盖。
- 逐页检查受影响的间距/内边距，按需补齐内联类。
- 不处理深色模式 `!important` 体系（范围外，见 6）。

#### 4.3 主题防闪（FOUC）

- `layout.tsx` 的 `<head>` 加内联脚本：读取 localStorage 主题 + matchMedia 系统偏好，在首帧渲染前设置 `data-theme`。

#### 4.4 移除操作人输入框

- `StockMovement.tsx` 删除"操作人"输入框，改为只读显示当前登录用户（服务端本就用 session 用户覆盖）。

#### 4.5 仓库功能下线

- 移除：Navigation 入口、`/warehouses` 页面、`/api/warehouses` 与 `/api/warehouses/[id]` 路由、帮助文档提及。
- 保留：数据库表 `warehouses` / `stock_warehouse`（数据安全，无迁移）。

#### 4.6 统一二维码解析工具

- 新增 `src/lib/parse-qr.ts`：`parseLcscQrCode(text): { pc?: string; on?: string } | null`（解析 `{on:…,pc:C12345,…}` 格式）。
- scan 页与 `StockMovement` 复用；移除两处重复实现。

#### 4.7 帮助文档同步

- 快捷键表与实际实现一致（g+p/g+i/g+o 现有；其余补齐实现或删除文档条目——补齐实现优先，成本低）。
- 删除"批量补全图片/自动下载图片""时间范围查询""多仓库/分仓库存"等失效宣传。
- 若补齐快捷键实现，需一并更新 KeyboardShortcuts.tsx（用 next/navigation router 跳转替代整页刷新）。

### 5. 测试与验收

#### 5.1 自动化测试（vitest）

- `parseLcscQrCode`：合法/非法/多字段顺序/JSON 变体。
- db-sqlite `batchStockInUpsert`：已有编码、新编码、部分失败（编码冲突）、事务回滚。
- db-sqlite BOM checkout（或 db 层 batch OUT 校验）：缺料整体失败。
- 现有测试保持通过。

#### 5.2 手动验收清单

- [ ] 连扫同码：1.5s 内重复被忽略，超窗口后累加数量
- [ ] 扫码页新编码可"创建并入库"，一次提交无孤儿数据
- [ ] BOM 领料：全满足一次成功；有缺料时勾选跳过可部分领料；后端防超卖
- [ ] parts 排序跨页正确（服务端排序）
- [ ] 筛选/排序/页码写回 URL；刷新、后退恢复
- [ ] 设置页 5 项全部生效（page_size、阈值、单位、默认排序）
- [ ] 全站无 alert/confirm/prompt 残留（grep 验证）
- [ ] 移除 CSS 覆盖后关键页面间距正常（首页、parts、详情、scan）
- [ ] 深色模式首屏不闪白
- [ ] 仓库功能入口/页面/API 全部移除，帮助页无失效宣传
- [ ] 登录、扫码、出入库主流程回归通过

## 范围外（明确不做）

- Redis 适配器性能与一致性重构（KEYS、缓存 60s、movements_index 无界）
- 认证体系改造（secure cookie、CSRF、速率限制）
- 深色模式 CSS 变量化重构（当前 `!important` 体系保持）
- 图表页重构、数据导入导出扩展
- 引入 SWR/React Query 等数据层
- 移动端除扫码页与列表批量外的精细打磨
