# 元器件库存管理系统

电子元器件入库出库管理系统，基于 Next.js + Tailwind CSS + SQLite 构建。

## 功能特性

### 仪表盘
- 统计概览：器件总数、低库存预警、今日入库/出库
- 快速操作：一键入库/出库
- 常用器件：最近使用器件快速访问
- 操作记录：最近出入库记录，点击可跳转器件详情

### 器件管理
- 器件列表：搜索、分类筛选、排序、分页
- 器件详情：库存信息、出入库历史
- 新增/编辑：表单验证、分类管理
- 排序功能：编码、名称、分类、品牌、库存、位置

### 入库/出库
- 扫码输入：支持条码/二维码扫描
- 手动输入：器件编码查询
- 表单验证：数量、经手人、备注
- 重复操作：入库/出库成功后可快速继续

### UI/UX 优化
- 自定义字体：Sora (标题) + DM Sans (正文)
- CSS 变量主题：统一色彩系统
- 动画效果：页面过渡、卡片悬停、按钮交互
- 响应式设计：桌面侧边栏 + 移动端底部导航
- 快捷键支持：`/` 搜索、`?` 帮助、`g+p/i/o` 页面导航

## 技术栈

- **前端**: Next.js 16, React 19, TypeScript
- **样式**: Tailwind CSS 4, CSS Variables
- **数据库**: SQLite (better-sqlite3)
- **图标**: Lucide React

## 快速开始

### 安装依赖

```bash
npm install
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
│   │   ├── api/              # API 路由
│   │   │   ├── dashboard/    # 仪表盘数据
│   │   │   ├── movements/    # 出入库记录
│   │   │   └── parts/        # 器件管理
│   │   ├── parts/            # 器件页面
│   │   ├── stock-in/         # 入库页面
│   │   ├── stock-out/        # 出库页面
│   │   ├── globals.css       # 全局样式
│   │   ├── layout.tsx        # 根布局
│   │   └── page.tsx          # 仪表盘
│   ├── components/
│   │   ├── Breadcrumb.tsx    # 面包屑导航
│   │   ├── KeyboardShortcuts.tsx  # 快捷键
│   │   ├── Navigation.tsx    # 侧边栏导航
│   │   └── QRScanner.tsx     # 二维码扫描
│   └── lib/
│       ├── db.ts             # 数据库连接
│       └── validations.ts    # 数据验证
├── data/
│   └── inventory.db          # SQLite 数据库
└── public/                   # 静态资源
```

## 数据库

使用 SQLite 存储数据，数据库文件位于 `data/inventory.db`。

### 表结构

- **parts**: 器件信息 (编码、名称、分类、品牌、型号、库存、位置等)
- **movements**: 出入库记录 (器件ID、类型、数量、经手人、备注等)

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `/` | 聚焦搜索框 |
| `?` | 显示快捷键帮助 |
| `g` → `p` | 跳转器件列表 |
| `g` → `i` | 跳转入库页面 |
| `g` → `o` | 跳转出库页面 |
| `Esc` | 关闭弹窗 |

## 许可证

MIT
