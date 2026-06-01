"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, ArrowRight, Clock, TrendingDown, TrendingUp, Search, Activity, Boxes, ArrowDown, ArrowUp, X, Package, Zap } from "lucide-react";

interface RecentPart {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  stock: number | null;
  lastUsedAt: string;
}

interface DashboardData {
  totalParts: number;
  lowStockCount: number;
  todayInCount: number;
  todayOutCount: number;
  recentMovements: Array<{
    id: string;
    type: string;
    quantity: number;
    operator: string;
    createdAt: string;
    part: { id: string; code: string; name: string; unit: string };
  }>;
  recentParts: RecentPart[];
}

export default function Home() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin" />
            <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-blue-600 rounded-full animate-spin" />
          </div>
          <p className="text-gray-500 text-sm font-medium">加载中...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-gray-600 font-medium">加载失败</p>
          <p className="text-gray-400 text-sm mt-1">请检查网络连接后重试</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all duration-200 shadow-sm shadow-blue-500/25"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  const stats = [
    { 
      label: "器件总数", 
      value: data.totalParts, 
      icon: Boxes, 
      gradient: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      textColor: "text-blue-600",
      iconColor: "text-blue-500",
      shadowColor: "shadow-blue-500/25"
    },
    { 
      label: "低库存预警", 
      value: data.lowStockCount, 
      icon: AlertTriangle, 
      gradient: "from-amber-500 to-orange-500",
      bgColor: "bg-amber-50",
      textColor: "text-amber-600",
      iconColor: "text-amber-500",
      shadowColor: "shadow-amber-500/25"
    },
    { 
      label: "今日入库", 
      value: data.todayInCount, 
      icon: ArrowDown, 
      gradient: "from-emerald-500 to-green-500",
      bgColor: "bg-emerald-50",
      textColor: "text-emerald-600",
      iconColor: "text-emerald-500",
      shadowColor: "shadow-emerald-500/25"
    },
    { 
      label: "今日出库", 
      value: data.todayOutCount, 
      icon: ArrowUp, 
      gradient: "from-purple-500 to-violet-500",
      bgColor: "bg-purple-50",
      textColor: "text-purple-600",
      iconColor: "text-purple-500",
      shadowColor: "shadow-purple-500/25"
    },
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="section">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">仪表盘</h1>
            <p className="text-gray-500 mt-1">元器件库存概览</p>
          </div>
        </div>
      </div>

      {/* Quick search */}
      <div className="section">
        <div className="relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchQuery.trim()) {
                router.push(`/parts?q=${encodeURIComponent(searchQuery.trim())}`);
              }
            }}
            className="w-full pl-14 pr-28 py-5 bg-white rounded-2xl border border-gray-200/80 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300"
            placeholder="搜索器件名称、编码、品牌... 按回车搜索"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-20 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => {
              if (searchQuery.trim()) {
                router.push(`/parts?q=${encodeURIComponent(searchQuery.trim())}`);
              }
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center gap-2 shadow-md shadow-blue-500/20"
          >
            <Search className="w-4 h-4" /> 搜索
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 section">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div 
              key={s.label} 
              className="relative overflow-hidden bg-white rounded-2xl border border-gray-200/80 p-7 hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br opacity-5 group-hover:opacity-10 transition-opacity duration-300 rounded-bl-[100%]" 
                   style={{background: `linear-gradient(135deg, var(--tw-gradient-stops))`}} />
              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-lg ${s.shadowColor} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                </div>
                <p className="text-sm text-gray-500 mb-2 font-medium">{s.label}</p>
                <p className={`text-4xl font-bold ${s.textColor} tracking-tight`}>
                  {s.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 section">
        <Link
          href="/stock-in"
          className="group relative flex items-center justify-center gap-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl py-7 text-base font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          <ArrowDownToLine className="w-6 h-6 relative z-10" />
          <span className="relative z-10">快速入库</span>
        </Link>
        <Link
          href="/stock-out"
          className="group relative flex items-center justify-center gap-4 bg-white border border-gray-200/80 text-gray-700 rounded-2xl py-7 text-base font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 shadow-sm hover:shadow-md overflow-hidden"
        >
          <ArrowUpFromLine className="w-6 h-6" />
          <span>快速出库</span>
        </Link>
      </div>

      {/* Recent parts - quick access */}
      {data.recentParts && data.recentParts.length > 0 && (
        <div className="section">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center">
                <Zap className="w-5 h-5 text-violet-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">常用器件</h2>
            </div>
            <span className="text-sm text-gray-400">点击快速操作</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5">
            {data.recentParts.map((part) => (
              <div
                key={part.id}
                onClick={() => router.push(`/parts/${part.id}`)}
                className="bg-white rounded-xl border border-gray-200/80 p-7 hover:shadow-md hover:border-blue-300 transition-all duration-200 group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-5">
                  <Package className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors" />
                  {part.category && (
                    <span className="text-[11px] px-3 py-1 bg-gray-100 text-gray-500 rounded-md font-medium">
                      {part.category}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-gray-900 truncate">{part.name}</p>
                <p className="text-xs text-gray-500 font-mono mt-2">{part.code}</p>
                <div className="flex items-center justify-between mt-5 pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-400">库存</span>
                  <span className="text-sm font-bold text-gray-900">{part.stock ?? 0}</span>
                </div>
                <div className="flex gap-2 mt-4">
                  <Link
                    href={`/stock-in?code=${encodeURIComponent(part.code)}`}
                    className="flex-1 text-center text-xs py-2.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    入库
                  </Link>
                  <Link
                    href={`/stock-out?code=${encodeURIComponent(part.code)}`}
                    className="flex-1 text-center text-xs py-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    出库
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent movements */}
      <div className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-sm">
        <div className="px-10 py-8 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-gray-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">最近操作记录</h2>
          </div>
          <Link href="/parts" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2 group">
            查看全部 
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
          </Link>
        </div>
        <div className="divide-y divide-gray-100">
          {data.recentMovements.length === 0 ? (
            <div className="p-20 text-center">
              <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gray-100 flex items-center justify-center">
                <Clock className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium text-lg">暂无操作记录</p>
              <p className="text-gray-400 mt-2">开始入库或出库操作后，记录将显示在这里</p>
            </div>
          ) : (
            data.recentMovements.map((m, index) => (
              <Link 
                key={m.id} 
                href={`/parts/${m.part.id}`}
                className="px-10 py-6 flex items-center justify-between hover:bg-gray-50/80 transition-colors duration-150"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center gap-6">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      m.type === "IN" 
                        ? "bg-emerald-50 text-emerald-600" 
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {m.type === "IN" ? <TrendingDown className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-base font-semibold text-gray-900">{m.part.name}</p>
                    <p className="text-sm text-gray-500 font-mono mt-1">{m.part.code}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${m.type === "IN" ? "text-emerald-600" : "text-red-600"}`}>
                    {m.type === "IN" ? "+" : "-"}{m.quantity} <span className="text-sm font-normal text-gray-500">{m.part.unit}</span>
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    {new Date(m.createdAt).toLocaleString("zh-CN", { 
                      month: "numeric", 
                      day: "numeric",
                      hour: "numeric",
                      minute: "numeric"
                    })}
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
