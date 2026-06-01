"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, ArrowRight, Clock, TrendingDown, TrendingUp, Search, Activity, Boxes, ArrowDown, ArrowUp, X, Package, Zap, Bell, ChevronRight, Star } from "lucide-react";

interface RecentPart {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  stock: number | null;
  lastUsedAt: string;
}

interface AlertPart {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  minStock: number;
  currentStock: number;
  stockPercentage: number;
}

interface MovementTrend {
  date: string;
  totalIn: number;
  totalOut: number;
  movementCount: number;
}

interface FavoritePart {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  location: string;
  stock: number;
  favoritedAt: string;
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

interface AlertsData {
  lowStockParts: AlertPart[];
  outOfStockParts: Array<{ id: string; code: string; name: string; category: string; unit: string }>;
  recentMovements: MovementTrend[];
  stats: {
    totalParts: number;
    outOfStockCount: number;
    lowStockCount: number;
    criticalCount: number;
  };
}

export default function Home() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [alerts, setAlerts] = useState<AlertsData | null>(null);
  const [favorites, setFavorites] = useState<FavoritePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAlerts, setShowAlerts] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard").then(r => r.json()),
      fetch("/api/alerts").then(r => r.json()),
      fetch("/api/favorites").then(r => r.json()),
    ])
      .then(([dashboardData, alertsData, favoritesData]) => {
        setData(dashboardData);
        setAlerts(alertsData);
        setFavorites(favoritesData.favorites || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const toggleFavorite = async (partId: string) => {
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partId }),
      });
      const result = await res.json();
      if (result.favorited) {
        // Refresh favorites
        const favRes = await fetch("/api/favorites");
        const favData = await favRes.json();
        setFavorites(favData.favorites || []);
      } else {
        setFavorites(prev => prev.filter(f => f.id !== partId));
      }
    } catch (e) {
      console.error(e);
    }
  };

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

      {/* Alerts Section */}
      {alerts && alerts.lowStockParts.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 section">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Bell className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">库存预警</h2>
                <p className="text-sm text-gray-500">{alerts.lowStockParts.length} 个器件库存不足</p>
              </div>
            </div>
            <button
              onClick={() => setShowAlerts(!showAlerts)}
              className="text-sm text-amber-700 hover:text-amber-800 font-medium flex items-center gap-1"
            >
              {showAlerts ? "收起" : "展开"}
              <ChevronRight className={`w-4 h-4 transition-transform ${showAlerts ? "rotate-90" : ""}`} />
            </button>
          </div>
          
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 ${showAlerts ? "" : "max-h-[120px] overflow-hidden"}`}>
            {alerts.lowStockParts.slice(0, showAlerts ? undefined : 3).map((part) => (
              <Link
                key={part.id}
                href={`/parts/${part.id}`}
                className="flex items-center gap-3 p-3 bg-white/80 rounded-xl hover:bg-white transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{part.name}</p>
                  <p className="text-xs text-gray-500 font-mono">{part.code}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-red-600">{part.currentStock}</p>
                  <p className="text-xs text-gray-500">/ {part.minStock}</p>
                </div>
                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      part.stockPercentage < 50 ? "bg-red-500" : "bg-amber-500"
                    }`}
                    style={{ width: `${Math.min(100, part.stockPercentage)}%` }}
                  />
                </div>
              </Link>
            ))}
          </div>
          
          {!showAlerts && alerts.lowStockParts.length > 3 && (
            <p className="text-center text-sm text-amber-600 mt-3">
              还有 {alerts.lowStockParts.length - 3} 个器件库存不足
            </p>
          )}
        </div>
      )}

      {/* Inventory Trend Chart */}
      {alerts && alerts.recentMovements.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-6 section">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">库存趋势</h2>
              <p className="text-sm text-gray-500">最近 7 天出入库统计</p>
            </div>
          </div>
          
          <div className="flex items-end gap-2 h-40">
            {alerts.recentMovements.map((day, i) => {
              const maxVal = Math.max(
                ...alerts.recentMovements.map(d => Math.max(d.totalIn, d.totalOut))
              );
              const inHeight = maxVal > 0 ? (day.totalIn / maxVal) * 100 : 0;
              const outHeight = maxVal > 0 ? (day.totalOut / maxVal) * 100 : 0;
              const date = new Date(day.date);
              const dayName = date.toLocaleDateString("zh-CN", { weekday: "short" });
              
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end justify-center gap-1 h-32">
                    <div 
                      className="flex-1 bg-emerald-200 rounded-t-md transition-all duration-500"
                      style={{ height: `${inHeight}%`, minHeight: day.totalIn > 0 ? "4px" : "0" }}
                      title={`入库: ${day.totalIn}`}
                    />
                    <div 
                      className="flex-1 bg-red-200 rounded-t-md transition-all duration-500"
                      style={{ height: `${outHeight}%`, minHeight: day.totalOut > 0 ? "4px" : "0" }}
                      title={`出库: ${day.totalOut}`}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{dayName}</span>
                </div>
              );
            })}
          </div>
          
          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-200 rounded-sm" />
              <span className="text-sm text-gray-600">入库</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-200 rounded-sm" />
              <span className="text-sm text-gray-600">出库</span>
            </div>
          </div>
        </div>
      )}

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
          <div className="flex items-center justify-between mb-3 sm:mb-5">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-violet-100 flex items-center justify-center">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600" />
              </div>
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">常用器件</h2>
            </div>
            <span className="text-xs sm:text-sm text-gray-400">点击快速操作</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-5">
            {data.recentParts.map((part) => (
              <div
                key={part.id}
                onClick={() => router.push(`/parts/${part.id}`)}
                className="bg-white rounded-xl border border-gray-200/80 p-3 sm:p-5 hover:shadow-md hover:border-blue-300 transition-all duration-200 group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2 sm:mb-4">
                  <Package className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                  {part.category && (
                    <span className="text-[10px] sm:text-[11px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md font-medium">
                      {part.category}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{part.name}</p>
                <p className="text-[10px] sm:text-xs text-gray-500 font-mono mt-1">{part.code}</p>
                <div className="flex items-center justify-between mt-2 sm:mt-4 pt-2 border-t border-gray-100">
                  <span className="text-[10px] sm:text-xs text-gray-400">库存</span>
                  <span className="text-xs sm:text-sm font-bold text-gray-900">{part.stock ?? 0}</span>
                </div>
                <div className="flex gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                  <Link
                    href={`/stock-in?code=${encodeURIComponent(part.code)}`}
                    className="flex-1 text-center text-[10px] sm:text-xs py-1.5 sm:py-2.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    入库
                  </Link>
                  <Link
                    href={`/stock-out?code=${encodeURIComponent(part.code)}`}
                    className="flex-1 text-center text-[10px] sm:text-xs py-1.5 sm:py-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium"
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

      {/* Favorites - quick access */}
      {favorites.length > 0 && (
        <div className="section">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                <Star className="w-5 h-5 text-amber-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">收藏器件</h2>
            </div>
            <span className="text-sm text-gray-400">{favorites.length} 个收藏</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5">
            {favorites.map((part) => (
              <div
                key={part.id}
                onClick={() => router.push(`/parts/${part.id}`)}
                className="bg-white rounded-xl border border-amber-200/80 p-7 hover:shadow-md hover:border-amber-300 transition-all duration-200 group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-5">
                  <Package className="w-6 h-6 text-amber-400 group-hover:text-amber-500 transition-colors" />
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(part.id); }}
                    className="text-amber-500 hover:text-amber-600"
                  >
                    <Star className="w-5 h-5 fill-amber-500" />
                  </button>
                </div>
                <p className="text-sm font-semibold text-gray-900 truncate">{part.name}</p>
                <p className="text-xs text-gray-500 font-mono mt-2">{part.code}</p>
                <div className="flex items-center justify-between mt-5 pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-400">库存</span>
                  <span className="text-sm font-bold text-gray-900">{part.stock}</span>
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
