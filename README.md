# 元器件库存管理系统

电子元器件入库出库管理系统，基于 Next.js + Tailwind CSS 构建，支持 SQLite 本地存储和 Upstash Redis 云端存储。

## 功能特性

### 登录认证
- 用户名密码登录，凭据通过环境变量配置
- Cookie 会话保持，登录状态持久化
- 未登录自动跳转登录页

### 仪表盘
- 统计概览：器件总数、低库存预警、今日入库/出库
- 快速操作：一键入库/出库
- 常用器件：最近使用器件快速访问
- 操作记录：最近出入库记录，点击可跳转器件详情
- 库存预警：低库存器件提醒，预警进度条，7天出入库趋势图
- 收藏器件：常用器件一键收藏，快速访问

### 器件管理
- 器件列表：搜索、分类筛选、排序、分页
- 器件详情：库存信息、出入库历史、收藏功能、产品图片
- 新增/编辑：表单验证、分类管理
- 排序功能：编码、名称、分类、品牌、库存、位置
- 批量操作：全选器件，批量入库/出库/删除/补全图片
- 高级搜索：多条件筛选（分类、品牌、库存范围、低库存、有库存），搜索历史，保存/加载搜索条件
- 产品图片：详情页显示 LCSC 产品图片，点击可放大查看

### 入库/出库
- 扫码输入：支持条码/二维码扫描
- 手动输入：器件编码查询
- 表单验证：数量、经手人、备注
- 重复操作：入库/出库成功后可快速继续
- 响应式设计：移动端和桌面端自适应布局

### 扫码入库工作台
- 连续扫码：支持连续扫码，自动去重（1.5秒内）
- 已有库存查询：扫码自动查询本地库存，显示已有库存数量
- 外部 API 集成：连接 LCEDA API 查询元器件数据
- 批量入库：一次提交多个器件入库
- 自动下载图片：入库时自动从 LCSC 下载产品图片并本地存储
- 手动输入：支持手动输入器件编码/二维码内容
- 手电筒：扫码时可开启手电筒照明

### 数据分析
- 趋势图表：30天出入库趋势
- 分类统计：各分类器件数量和库存分布
- 库存分布：饼图展示库存分布情况
- 活跃器件：Top 10 最活跃器件

### BOM 清单
- 创建/编辑：BOM 清单管理
- 零件搜索：快速添加器件到 BOM
- 库存检查：一键检查 BOM 库存充足性

### 仓库管理
- 多仓库支持：创建和管理多个仓库
- 默认仓库：设置默认仓库

### 数据导入导出
- CSV 导入：拖拽上传，自动解析列映射
- CSV/JSON 导出：多种格式导出数据

### 操作日志
- 记录追踪：所有操作记录完整保存
- 筛选过滤：按操作类型、实体类型筛选

### 设置
- 主题切换：浅色/深色/跟随系统
- 库存设置：低库存阈值、默认出库数量
- 操作设置：默认经手人
- 分类管理：自定义器件分类（添加/编辑/删除）

### 帮助中心
- 快速开始指南
- 功能说明文档
- 快捷键参考

### UI/UX
- 自定义字体：Sora (标题) + DM Sans (正文)
- CSS 变量主题：统一色彩系统，亮色/暗色模式切换
- 动画效果：页面过渡、卡片悬停、按钮交互
- 响应式设计：桌面侧边栏 + 移动端底部导航 + 更多菜单
- 快捷键支持：`/` 搜索、`?` 帮助、`g+p/i/o/a/b/w/l` 页面导航
- 暗色模式：支持亮色/暗色/跟随系统三种模式，所有页面完整支持

## 技术栈

- **前端**: Next.js 16, React 19, TypeScript
- **样式**: Tailwind CSS 4, CSS Variables, 响应式设计
- **存储**: SQLite (node:sqlite 内置模块) / Upstash Redis (可切换)
- **图表**: Chart.js + react-chartjs-2
- **图标**: Lucide React
- **外部 API**: LCEDA API (元器件数据查询)

## 快速开始

### 安装依赖

```bash
npm install
```

### 环境变量

复制 `.env.example` 为 `.env`，根据需要修改：

```bash
# 存储模式: local=SQLite本地 | cloud=Upstash Redis
STORAGE_MODE=local

# Upstash Redis (cloud 模式必填)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# 登录凭据
AUTH_USERNAME=admin
AUTH_PASSWORD=admin123
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 构建生产版本

```bash
npm run build
npm start
```

## 项目结构

```
inventory-system/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/           # 认证 API
│   │   │   │   ├── login/      # 登录
│   │   │   │   ├── logout/     # 登出
│   │   │   │   └── me/         # 当前用户
│   │   │   ├── alerts/         # 库存预警 API
│   │   │   ├── analytics/      # 数据分析 API
│   │   │   ├── boms/           # BOM 清单 API
│   │   │   ├── categories/     # 分类管理 API
│   │   │   ├── dashboard/      # 仪表盘数据
│   │   │   ├── export/         # 数据导入导出 API
│   │   │   ├── favorites/      # 收藏 API
│   │   │   ├── images/         # 图片读取 API
│   │   │   │   └── [partId]/   # 器件图片 API
│   │   │   ├── lceda/          # LCEDA API 代理
│   │   │   ├── logs/           # 操作日志 API
│   │   │   ├── movements/      # 出入库记录
│   │   │   ├── parts/          # 器件管理
│   │   │   │   ├── batch/      # 批量操作 API
│   │   │   │   └── lookup/     # 器件查询 API
│   │   │   ├── settings/       # 设置 API
│   │   │   └── warehouses/     # 仓库管理 API
│   │   ├── analytics/          # 数据分析页面
│   │   ├── boms/               # BOM 清单页面
│   │   ├── help/               # 帮助页面
│   │   ├── login/              # 登录页面
│   │   ├── logs/               # 操作日志页面
│   │   ├── parts/              # 器件页面
│   │   ├── scan/               # 扫码入库工作台
│   │   ├── settings/           # 设置页面
│   │   ├── stock-in/           # 入库页面
│   │   ├── stock-out/          # 出库页面
│   │   ├── warehouses/         # 仓库管理页面
│   │   ├── globals.css         # 全局样式
│   │   ├── layout.tsx          # 根布局
│   │   └── page.tsx            # 仪表盘
│   ├── components/
│   │   ├── AppShell.tsx        # 条件布局（登录页隐藏侧边栏）
│   │   ├── Breadcrumb.tsx      # 面包屑导航
│   │   ├── KeyboardShortcuts.tsx  # 快捷键
│   │   ├── Navigation.tsx      # 侧边栏导航
│   │   ├── QRScanner.tsx       # 二维码扫描
│   │   └── ThemeProvider.tsx   # 主题管理
│   ├── lib/
│   │   ├── api/
│   │   │   └── lceda.ts        # LCEDA API 客户端
│   │   ├── db.ts               # 数据库适配器接口
│   │   ├── db-sqlite.ts        # SQLite 适配器
│   │   ├── db-redis.ts         # Redis 适配器
│   │   ├── image-store.ts      # 图片下载/存储工具
│   │   ├── logger.ts           # 操作日志记录
│   │   └── validations.ts      # 数据验证
│   └── middleware.ts           # 认证中间件
├── data/
│   ├── inventory.db            # SQLite 数据库
│   └── images/parts/           # 产品图片存储
├── edgeone.json                # EdgeOne Pages 配置
└── public/                     # 静态资源
```

## 数据库

支持两种存储模式，通过 `STORAGE_MODE` 环境变量切换：

| 模式 | 存储 | 适用场景 |
|------|------|----------|
| `local` | SQLite (better-sqlite3) | 本地部署、Docker |
| `cloud` | Upstash Redis | EdgeOne Pages、Vercel 等 Serverless 平台 |

### 表结构

- **parts**: 器件信息 (编码、名称、分类、品牌、型号、库存、位置、图片等)
- **stock**: 库存分配 (器件ID、仓库ID、数量)
- **stock_movements**: 出入库记录 (器件ID、类型、数量、经手人、备注等)
- **favorites**: 收藏器件 (器件ID)
- **boms**: BOM 清单 (名称、描述)
- **bom_items**: BOM 清单明细 (BOM ID、器件ID、数量)
- **warehouses**: 仓库信息 (名称、位置、描述)
- **stock_warehouse**: 库存分配 (器件ID、仓库ID、数量)
- **operation_logs**: 操作日志 (操作类型、实体类型、详情、时间)
- **settings**: 系统设置 (键值对存储)
- **categories**: 器件分类 (名称、描述、排序)

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `/` | 聚焦搜索框 |
| `?` | 显示快捷键帮助 |
| `g` → `p` | 跳转器件列表 |
| `g` → `i` | 跳转入库页面 |
| `g` → `o` | 跳转出库页面 |
| `g` → `a` | 跳转数据分析 |
| `g` → `b` | 跳转BOM清单 |
| `g` → `w` | 跳转仓库管理 |
| `g` → `l` | 跳转操作日志 |
| `g` → `s` | 跳转扫码入库 |
| `g` → `t` | 跳转设置 |
| `g` → `h` | 跳转帮助 |
| `Esc` | 关闭弹窗 |

## 主题模式

支持三种主题模式：
- 浅色模式
- 深色模式
- 跟随系统（默认）

可在侧边栏底部点击主题按钮切换，或在导航栏"设置"中设置。

## 扫码入库

### 功能说明
扫码入库工作台支持连续扫描 LCSC 二维码，自动识别器件信息并批量入库。

### 工作流程
1. 扫描 LCSC 二维码（格式：`{on:...,pc:C12345,...}`）
2. 自动解析器件编码（pc 字段）
3. 查询本地库存 → 查询 LCEDA API
4. 添加到待入库列表
5. 确认数量后批量入库

### 注意事项
- 扫码自动去重：1.5 秒内相同编码只记录一次
- 已有库存器件会显示绿色标记
- 支持手动输入器件编码

## 产品图片

### 功能说明
系统支持从 LCSC（嘉立创）自动下载元器件产品图片，本地存储避免跨域问题。

### 图片获取方式
- **扫码入库**：扫描 LCSC 二维码时自动下载产品图片
- **批量补全**：器件列表页选择器件 → 批量工具栏 → "补全图片"
- **手动获取**：通过 LCEDA API 查询并下载

### 存储说明
- **本地模式**：图片存储在 `data/images/parts/`，文件命名 `{partId}.{ext}`
- **云端模式**：图片 URL 存储在 Redis，通过 `/api/images/{partId}` 代理访问
- 删除器件时自动清理关联图片

## 移动端使用说明

### HTTPS 要求
扫码功能需要访问摄像头，移动端浏览器要求 HTTPS 环境：
- **HTTPS 访问**：直接使用，无需特殊配置
- **HTTP 访问**：需要添加 Chrome 白名单
  1. 打开 `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
  2. 添加 HTTP 地址（如 `http://192.168.1.100:3000`）
  3. 重启 Chrome

## 部署

详见 [部署指南](./docs/deployment.md)。

## 许可证

MIT
