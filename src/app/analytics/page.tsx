"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowDownToLine, ArrowUpFromLine, BarChart3, Package, TrendingDown, TrendingUp, Boxes, Clock, ChevronRight } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";

interface AnalyticsData {
  categoryStats: Array<{
    category: string;
    partCount: number;
    totalStock: number;
    lowStockCount: number;
  }>;
  movementTrends: Array<{
    date: string;
    totalIn: number;
    totalOut: number;
    movementCount: number;
  }>;
  topMovedParts: Array<{
    id: string;
    code: string;
    name: string;
    category: string;
    unit: string;
    movementCount: number;
    totalIn: number;
    totalOut: number;
  }>;
  stockValueByCategory: Array<{
    category: string;
    totalQuantity: number;
    partCount: number;
  }>;
  movementTypeDistribution: Array<{
    type: string;
    count: number;
    totalQuantity: number;
  }>;
  dailyAverages: {
    avgIn: number;
    avgOut: number;
    avgCount: number;
  };
  stockDistribution: Array<{
    range: string;
    count: number;
  }>;
  period: number;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30");

  useEffect(() => {
    fetch(`/api/analytics?period=${period}`)
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin" />
            <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-blue-600 rounded-full animate-spin" />
          </div>
          <p className="text-gray-500 dark:text-[var(--foreground-subtle)] text-sm font-medium">加载中...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const totalIn = data.movementTypeDistribution.find(m => m.type === "IN")?.totalQuantity || 0;
  const totalOut = data.movementTypeDistribution.find(m => m.type === "OUT")?.totalQuantity || 0;

  return (
    <div className="page-container">
      <Breadcrumb items={[{ label: "数据分析" }]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 section">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-[var(--card-foreground)] tracking-tight">数据分析</h1>
            <p className="text-gray-500 dark:text-[var(--foreground-subtle)] mt-1">库存统计与趋势分析</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {["7", "30", "90"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                period === p
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-[var(--background-muted)] text-gray-600 dark:text-[var(--foreground-muted)] hover:bg-gray-200 dark:hover:bg-[var(--background-subtle)]"
              }`}
            >
              {p} 天
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 section">
        <div className="bg-white dark:bg-[var(--card)] rounded-2xl border border-gray-200/80 dark:border-[var(--card-border)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
              <ArrowDownToLine className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-[var(--foreground-subtle)]">总入库</span>
          </div>
          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{totalIn}</p>
          <p className="text-sm text-gray-500 dark:text-[var(--foreground-subtle)] mt-1">日均 {data.dailyAverages.avgIn}</p>
        </div>
        <div className="bg-white dark:bg-[var(--card)] rounded-2xl border border-gray-200/80 dark:border-[var(--card-border)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/10 flex items-center justify-center">
              <ArrowUpFromLine className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-[var(--foreground-subtle)]">总出库</span>
          </div>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">{totalOut}</p>
          <p className="text-sm text-gray-500 dark:text-[var(--foreground-subtle)] mt-1">日均 {data.dailyAverages.avgOut}</p>
        </div>
        <div className="bg-white dark:bg-[var(--card)] rounded-2xl border border-gray-200/80 dark:border-[var(--card-border)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-[var(--foreground-subtle)]">操作次数</span>
          </div>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{totalIn + totalOut}</p>
          <p className="text-sm text-gray-500 dark:text-[var(--foreground-subtle)] mt-1">日均 {data.dailyAverages.avgCount}</p>
        </div>
        <div className="bg-white dark:bg-[var(--card)] rounded-2xl border border-gray-200/80 dark:border-[var(--card-border)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center">
              <Boxes className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-[var(--foreground-subtle)]">器件分类</span>
          </div>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{data.categoryStats.length}</p>
          <p className="text-sm text-gray-500 dark:text-[var(--foreground-subtle)] mt-1">{data.stockValueByCategory.reduce((sum, c) => sum + c.partCount, 0)} 个器件</p>
        </div>
      </div>

      {/* Movement Trends Chart */}
      <div className="bg-white dark:bg-[var(--card)] rounded-2xl border border-gray-200/80 dark:border-[var(--card-border)] p-6 section">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/10 flex items-center justify-center">
            <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-[var(--card-foreground)]">出入库趋势</h2>
            <p className="text-sm text-gray-500 dark:text-[var(--foreground-subtle)]">最近 {period} 天</p>
          </div>
        </div>
        
        <div className="flex items-end gap-1 h-48">
          {data.movementTrends.map((day, i) => {
            const maxVal = Math.max(
              ...data.movementTrends.map(d => Math.max(d.totalIn, d.totalOut))
            );
            const inHeight = maxVal > 0 ? (day.totalIn / maxVal) * 100 : 0;
            const outHeight = maxVal > 0 ? (day.totalOut / maxVal) * 100 : 0;
            const date = new Date(day.date);
            const dayName = date.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
            
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="w-full flex items-end justify-center gap-0.5 h-40 relative">
                  <div 
                    className="flex-1 bg-emerald-400 rounded-t-md transition-all duration-300 group-hover:bg-emerald-500"
                    style={{ height: `${inHeight}%`, minHeight: day.totalIn > 0 ? "4px" : "0" }}
                  />
                  <div 
                    className="flex-1 bg-red-400 rounded-t-md transition-all duration-300 group-hover:bg-red-500"
                    style={{ height: `${outHeight}%`, minHeight: day.totalOut > 0 ? "4px" : "0" }}
                  />
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-[var(--card)] text-white dark:text-[var(--card-foreground)] text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    入{day.totalIn} / 出{day.totalOut}
                  </div>
                </div>
                <span className="text-[10px] text-gray-400 dark:text-[var(--foreground-subtle)] transform -rotate-45 origin-top-left">{dayName}</span>
              </div>
            );
          })}
        </div>
        
        <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-gray-100 dark:border-[var(--card-border)]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-400 rounded-sm" />
            <span className="text-sm text-gray-600 dark:text-[var(--foreground-muted)]">入库</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-400 rounded-sm" />
            <span className="text-sm text-gray-600 dark:text-[var(--foreground-muted)]">出库</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 section">
        {/* Category Stats */}
        <div className="bg-white dark:bg-[var(--card)] rounded-2xl border border-gray-200/80 dark:border-[var(--card-border)] p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-[var(--card-foreground)]">分类统计</h2>
              <p className="text-sm text-gray-500 dark:text-[var(--foreground-subtle)]">各分类器件数量与库存</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {data.categoryStats.map((cat, i) => {
              const maxCount = Math.max(...data.categoryStats.map(c => c.partCount));
              const width = maxCount > 0 ? (cat.partCount / maxCount) * 100 : 0;
              
              return (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-20 text-sm text-gray-600 dark:text-[var(--foreground-muted)] font-medium truncate">{cat.category}</div>
                  <div className="flex-1">
                    <div className="h-8 bg-gray-100 dark:bg-[var(--background-muted)] rounded-lg overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-lg transition-all duration-500"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-20 text-right">
                    <span className="text-sm font-bold text-gray-900 dark:text-[var(--card-foreground)]">{cat.partCount}</span>
                    <span className="text-xs text-gray-500 dark:text-[var(--foreground-subtle)] ml-1">个</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stock Distribution */}
        <div className="bg-white dark:bg-[var(--card)] rounded-2xl border border-gray-200/80 dark:border-[var(--card-border)] p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center">
              <Boxes className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-[var(--card-foreground)]">库存分布</h2>
              <p className="text-sm text-gray-500 dark:text-[var(--foreground-subtle)]">各库存区间的器件数量</p>
            </div>
          </div>
          
          <div className="flex items-end gap-4 h-48">
            {data.stockDistribution.map((item, i) => {
              const maxCount = Math.max(...data.stockDistribution.map(s => s.count));
              const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
              const colors = [
                "bg-red-400",
                "bg-amber-400",
                "bg-blue-400",
                "bg-emerald-400",
                "bg-purple-400",
              ];
              
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-sm font-bold text-gray-900 dark:text-[var(--card-foreground)]">{item.count}</span>
                  <div className="w-full flex items-end" style={{ height: "160px" }}>
                    <div 
                      className={`w-full ${colors[i]} rounded-t-lg transition-all duration-500`}
                      style={{ height: `${height}%`, minHeight: "4px" }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-[var(--foreground-subtle)] text-center">{item.range}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Moved Parts */}
      <div className="bg-white dark:bg-[var(--card)] rounded-2xl border border-gray-200/80 dark:border-[var(--card-border)] overflow-hidden section">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-[var(--card-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-[var(--card-foreground)]">最活跃器件</h2>
              <p className="text-sm text-gray-500 dark:text-[var(--foreground-subtle)]">最近 {period} 天操作次数最多</p>
            </div>
          </div>
        </div>
        
        <div className="divide-y divide-gray-100 dark:divide-[var(--card-border)]">
          {data.topMovedParts.map((part, i) => (
            <Link
              key={part.id}
              href={`/parts/${part.id}`}
              className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[var(--background-subtle)] transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[var(--background-muted)] flex items-center justify-center text-sm font-bold text-gray-500 dark:text-[var(--foreground-subtle)]">
                  {i + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-[var(--card-foreground)]">{part.name}</p>
                  <p className="text-xs text-gray-500 dark:text-[var(--foreground-subtle)] font-mono">{part.code}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">+{part.totalIn}</p>
                  <p className="text-xs text-gray-500 dark:text-[var(--foreground-subtle)]">入库</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-red-600 dark:text-red-400">-{part.totalOut}</p>
                  <p className="text-xs text-gray-500 dark:text-[var(--foreground-subtle)]">出库</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900 dark:text-[var(--card-foreground)]">{part.movementCount}</p>
                  <p className="text-xs text-gray-500 dark:text-[var(--foreground-subtle)]">次</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 dark:text-[var(--foreground-subtle)]" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
