"use client";

import { useState } from "react";
import {
  HelpCircle,
  Zap,
  BookOpen,
  Keyboard,
  ChevronRight,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  FileText,
  Warehouse,
  Clock,
  Star,
  Search,
  Download,
  Upload,
  ImageIcon,
  ScanBarcode,
} from "lucide-react";

const sections = [
  { id: "quickstart", label: "快速入门", icon: Zap },
  { id: "features", label: "功能说明", icon: BookOpen },
  { id: "shortcuts", label: "快捷键参考", icon: Keyboard },
];

const globalShortcuts = [
  { key: "/", description: "聚焦搜索框" },
  { key: "?", description: "显示快捷键帮助" },
  { key: "Esc", description: "关闭弹窗/取消操作" },
];

const pageShortcuts: Record<string, { key: string; description: string }[]> = {
  "全局导航": [
    { key: "g p", description: "跳转到器件列表" },
    { key: "g i", description: "跳转入库页面" },
    { key: "g o", description: "跳转出库页面" },
    { key: "g a", description: "跳转数据分析" },
    { key: "g b", description: "跳转BOM清单" },
    { key: "g w", description: "跳转仓库管理" },
    { key: "g l", description: "跳转操作日志" },
    { key: "g s", description: "跳转扫码入库" },
    { key: "g t", description: "跳转设置" },
    { key: "g h", description: "跳转帮助" },
  ],
  "器件列表": [
    { key: "n", description: "打开新增器件弹窗" },
  ],
};

export default function HelpPage() {
  const [activeSection, setActiveSection] = useState("quickstart");

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <HelpCircle className="w-7 h-7 text-indigo-500" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-[var(--card-foreground)]">帮助中心</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* 侧边导航 */}
        <nav className="md:w-48 shrink-0">
          <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  activeSection === section.id
                    ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                    : "text-gray-600 dark:text-[var(--foreground-muted)] hover:bg-gray-100 dark:hover:bg-[var(--background-muted)]"
                }`}
              >
                <section.icon className="w-4 h-4" />
                {section.label}
              </button>
            ))}
          </div>
        </nav>

        {/* 内容区域 */}
        <div className="flex-1 min-w-0">
          {activeSection === "quickstart" && <QuickStartSection />}
          {activeSection === "features" && <FeaturesSection />}
          {activeSection === "shortcuts" && <ShortcutsSection />}
        </div>
      </div>
    </div>
  );
}

function QuickStartSection() {
  return (
    <div className="space-y-6 animate-fade-in">
      <section className="bg-white dark:bg-[var(--card)] rounded-2xl border border-gray-200 dark:border-[var(--card-border)] p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-[var(--card-foreground)] mb-4">
          欢迎使用元器件库存管理系统
        </h2>
        <p className="text-gray-600 dark:text-[var(--foreground-muted)] mb-4">
          本系统专为个人实验室和小型团队设计，帮助您高效管理电子元器件库存。
          通过直观的界面和便捷的操作，让库存管理变得简单。
        </p>
        <div className="bg-indigo-50 dark:bg-indigo-500/10 rounded-xl p-4">
          <h3 className="font-medium text-indigo-700 dark:text-indigo-300 mb-2">核心功能</h3>
          <ul className="space-y-2 text-sm text-indigo-600 dark:text-indigo-400">
            <li className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4" />
              器件信息管理与快速搜索
            </li>
            <li className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4" />
              入库/出库操作与记录追踪
            </li>
            <li className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4" />
              扫码入库工作台（连续扫码 + 自动下载图片）
            </li>
            <li className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4" />
              多仓库支持与库存预警
            </li>
            <li className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4" />
              BOM清单管理与数据分析
            </li>
          </ul>
        </div>
      </section>

      <section className="bg-white dark:bg-[var(--card)] rounded-2xl border border-gray-200 dark:border-[var(--card-border)] p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-[var(--card-foreground)] mb-4">
          快速开始
        </h2>
        <div className="space-y-4">
          <StepCard
            number={1}
            title="添加器件"
            description="进入「器件列表」页面，点击「新增器件」按钮，填写器件基本信息（编号、名称、分类等）。"
          />
          <StepCard
            number={2}
            title="入库操作"
            description="进入「入库」页面，搜索或输入器件编号，填写入库数量和原因，完成入库。"
          />
          <StepCard
            number={3}
            title="出库操作"
            description="进入「出库」页面，搜索或输入器件编号，填写出库数量和原因，完成出库。"
          />
          <StepCard
            number={4}
            title="查看库存"
            description="在「仪表盘」查看库存概览和预警信息，在「器件列表」搜索和筛选器件。"
          />
        </div>
      </section>
    </div>
  );
}

function StepCard({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-sm">
        {number}
      </div>
      <div>
        <h3 className="font-medium text-gray-900 dark:text-[var(--card-foreground)]">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-[var(--foreground-muted)]">{description}</p>
      </div>
    </div>
  );
}

function FeaturesSection() {
  const features = [
    {
      icon: Package,
      title: "器件管理",
      description: "管理所有电子元器件的基本信息，包括编号、名称、分类、品牌、型号、封装等。支持批量导入导出、收藏夹功能。",
      items: ["高级搜索与筛选", "批量操作（入库/出库/删除/补全图片）", "CSV/JSON 数据导入导出", "器件收藏夹", "产品图片显示与放大查看"],
    },
    {
      icon: ScanBarcode,
      title: "扫码入库工作台",
      description: "连续扫描 LCSC 二维码，自动识别器件信息并批量入库。自动下载产品图片。",
      items: ["连续扫码自动去重", "自动查询本地库存", "LCEDA API 获取产品信息", "自动下载产品图片", "批量入库提交"],
    },
    {
      icon: ArrowDownToLine,
      title: "入库管理",
      description: "记录器件入库操作，自动更新库存数量。支持批量入库和操作原因记录。",
      items: ["按编号快速入库", "批量入库操作", "入库记录查询"],
    },
    {
      icon: ArrowUpFromLine,
      title: "出库管理",
      description: "记录器件出库操作，自动检查库存是否充足。支持批量出库和操作原因记录。",
      items: ["按编号快速出库", "库存不足预警", "出库记录查询"],
    },
    {
      icon: BarChart3,
      title: "数据分析",
      description: "可视化展示库存数据，帮助您了解库存状况和趋势。",
      items: ["库存趋势图表", "分类统计", "活跃器件排行", "库存分布分析"],
    },
    {
      icon: FileText,
      title: "BOM清单",
      description: "管理物料清单（Bill of Materials），追踪项目所需器件。",
      items: ["创建和管理BOM", "添加BOM器件", "库存充足性检查"],
    },
    {
      icon: Warehouse,
      title: "仓库管理",
      description: "支持多仓库管理，可为器件分配不同仓库的库存。",
      items: ["创建多个仓库", "设置默认仓库", "分仓库存查询"],
    },
    {
      icon: Clock,
      title: "操作日志",
      description: "记录所有操作历史，便于追溯和审计。",
      items: ["操作类型筛选", "时间范围查询", "详细操作记录"],
    },
    {
      icon: Star,
      title: "收藏夹",
      description: "收藏常用器件，快速访问。",
      items: ["一键收藏/取消", "仪表盘快速访问"],
    },
    {
      icon: Search,
      title: "高级搜索",
      description: "多条件组合搜索，快速找到目标器件。",
      items: ["按分类/品牌筛选", "库存范围筛选", "保存搜索条件"],
    },
    {
      icon: Download,
      title: "数据导入导出",
      description: "支持CSV和JSON格式的数据导入导出，方便数据备份和迁移。",
      items: ["CSV格式导出", "JSON格式导出", "CSV批量导入"],
    },
    {
      icon: Upload,
      title: "库存预警",
      description: "当器件库存低于设定阈值时自动预警。",
      items: ["低库存提醒", "自定义预警阈值", "仪表盘预警展示"],
    },
    {
      icon: ImageIcon,
      title: "产品图片",
      description: "自动从 LCSC 下载元器件产品图片，本地存储，详情页可点击放大查看。",
      items: ["扫码入库自动下载", "批量补全图片", "点击放大全屏查看", "本地存储避免跨域"],
    },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      {features.map((feature, index) => (
        <FeatureCard key={index} {...feature} />
      ))}
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  items,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  items: string[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white dark:bg-[var(--card)] rounded-2xl border border-gray-200 dark:border-[var(--card-border)] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-50 dark:hover:bg-[var(--background-subtle)] transition-colors"
      >
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
          <Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-[var(--card-foreground)]">{title}</h3>
          <p className="text-sm text-gray-600 dark:text-[var(--foreground-muted)] line-clamp-1">{description}</p>
        </div>
        <ChevronRight
          className={`w-5 h-5 text-gray-400 dark:text-[var(--foreground-subtle)] transition-transform ${expanded ? "rotate-90" : ""}`}
        />
      </button>
      {expanded && (
        <div className="px-5 pb-5 pt-0">
          <p className="text-sm text-gray-600 dark:text-[var(--foreground-muted)] mb-3">{description}</p>
          <ul className="space-y-2">
            {items.map((item, index) => (
              <li
                key={index}
                className="flex items-center gap-2 text-sm text-gray-700 dark:text-[var(--foreground-muted)]"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ShortcutsSection() {
  return (
    <div className="space-y-6 animate-fade-in">
      <section className="bg-white dark:bg-[var(--card)] rounded-2xl border border-gray-200 dark:border-[var(--card-border)] p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-[var(--card-foreground)] mb-4">
          全局快捷键
        </h2>
        <p className="text-sm text-gray-600 dark:text-[var(--foreground-muted)] mb-4">
          以下快捷键在任何页面都可用：
        </p>
        <div className="space-y-2">
          {globalShortcuts.map((shortcut, index) => (
            <ShortcutRow key={index} shortcutKey={shortcut.key} description={shortcut.description} />
          ))}
        </div>
      </section>

      {Object.entries(pageShortcuts).map(([page, shortcuts]) => (
        <section
          key={page}
          className="bg-white dark:bg-[var(--card)] rounded-2xl border border-gray-200 dark:border-[var(--card-border)] p-6"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-[var(--card-foreground)] mb-4">
            {page}
          </h2>
          <div className="space-y-2">
            {shortcuts.map((shortcut, index) => (
              <ShortcutRow key={index} shortcutKey={shortcut.key} description={shortcut.description} />
            ))}
          </div>
        </section>
      ))}

      <section className="bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl p-6">
        <h3 className="font-medium text-indigo-700 dark:text-indigo-300 mb-2">
          提示
        </h3>
        <p className="text-sm text-indigo-600 dark:text-indigo-400">
          在任何页面按下 <kbd className="px-1.5 py-0.5 bg-white dark:bg-[var(--card)] rounded text-xs font-mono">?</kbd> 键
          可以随时查看快捷键帮助。
        </p>
      </section>
    </div>
  );
}

function ShortcutRow({ shortcutKey, description }: { shortcutKey: string; description: string }) {
  const keys = shortcutKey.split(" ");

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-[var(--card-border)] last:border-0">
      <span className="text-sm text-gray-700 dark:text-[var(--foreground-muted)]">{description}</span>
      <div className="flex items-center gap-1">
        {keys.map((k, i) => (
          <span key={i}>
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-[var(--background-muted)] rounded-lg text-xs font-mono text-gray-700 dark:text-[var(--foreground-muted)] border border-gray-200 dark:border-[var(--card-border)]">
              {k}
            </kbd>
            {i < keys.length - 1 && <span className="text-gray-400 dark:text-[var(--foreground-subtle)] mx-0.5">+</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
