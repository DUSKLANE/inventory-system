"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { LayoutDashboard, Package, ArrowDownToLine, ArrowUpFromLine, Cpu, Settings, HelpCircle, BarChart3, FileText, Sun, Moon, Clock, Warehouse, MoreHorizontal, ScanBarcode, LogOut } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { useState, useEffect } from "react";

const mainLinks = [
  { href: "/", label: "仪表盘", icon: LayoutDashboard },
  { href: "/parts", label: "器件列表", icon: Package },
  { href: "/stock-in", label: "入库", icon: ArrowDownToLine },
  { href: "/stock-out", label: "出库", icon: ArrowUpFromLine },
  { href: "/scan", label: "扫描识别", icon: ScanBarcode },
  { href: "/analytics", label: "数据分析", icon: BarChart3 },
  { href: "/boms", label: "BOM清单", icon: FileText },
  { href: "/warehouses", label: "仓库管理", icon: Warehouse },
  { href: "/logs", label: "操作日志", icon: Clock },
];

// Mobile navigation - show only important links
const mobileLinks = [
  { href: "/", label: "首页", icon: LayoutDashboard },
  { href: "/parts", label: "器件", icon: Package },
  { href: "/stock-in", label: "入库", icon: ArrowDownToLine },
  { href: "/stock-out", label: "出库", icon: ArrowUpFromLine },
  { href: "#", label: "更多", icon: MoreHorizontal },
];

const bottomLinks = [
  { href: "/settings", label: "设置", icon: Settings },
  { href: "/help", label: "帮助", icon: HelpCircle },
];

export default function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, resolvedTheme, toggleTheme } = useTheme();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [username, setUsername] = useState("admin");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => setUsername(data.username || "admin"))
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-60 flex-col bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-r border-gray-200/80 dark:border-gray-700/80 z-40 shadow-[1px_0_12px_rgba(0,0,0,0.05)]">
        {/* Logo area */}
        <div className="px-5 py-6 border-b border-gray-100/80 dark:border-gray-800/80">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transition-shadow duration-300">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight whitespace-nowrap" style={{ fontFamily: 'var(--font-heading)' }}>元器件管理</h1>
              <p className="text-[11px] text-gray-400 font-medium tracking-wide">Inventory System</p>
            </div>
          </div>
        </div>
        
        {/* Navigation links */}
        <nav className="flex-1 py-5 px-3 space-y-1 overflow-y-auto">
          <div className="px-3 py-2 mb-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">主菜单</p>
          </div>
          {mainLinks.map((link, index) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`group relative flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                  active
                    ? "bg-gradient-to-r from-blue-50 to-blue-50/50 dark:from-blue-900/30 dark:to-blue-900/20 text-blue-700 dark:text-blue-400 shadow-sm shadow-blue-500/10"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50/80 dark:hover:bg-gray-800/80 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 bg-gradient-to-b from-blue-500 to-blue-600 rounded-r-full shadow-sm shadow-blue-500/30" />
                )}
                <div className={`p-1.5 rounded-lg transition-all duration-300 ${active ? "bg-blue-100/80 dark:bg-blue-900/40" : "group-hover:bg-gray-100/80 dark:group-hover:bg-gray-800/80"}`}>
                  <Icon className={`w-[18px] h-[18px] flex-shrink-0 transition-colors duration-200 ${active ? "text-blue-600 dark:text-blue-400" : "text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300"}`} />
                </div>
                <span>{link.label}</span>
                {active && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse-soft" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom links */}
        <div className="px-3 py-4 border-t border-gray-100/80 dark:border-gray-800/80 space-y-1">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-full group flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50/80 dark:hover:bg-gray-800/80 hover:text-gray-900 dark:hover:text-gray-200 transition-all duration-200"
          >
            <div className="p-1.5 rounded-lg group-hover:bg-gray-100/80 dark:group-hover:bg-gray-800/80 transition-colors duration-200">
              {resolvedTheme === "light" ? (
                <Moon className="w-[18px] h-[18px] flex-shrink-0 text-gray-400 group-hover:text-gray-500 transition-colors duration-200" />
              ) : (
                <Sun className="w-[18px] h-[18px] flex-shrink-0 text-gray-400 group-hover:text-gray-500 transition-colors duration-200" />
              )}
            </div>
            <span>{theme === "system" ? "跟随系统" : resolvedTheme === "light" ? "深色模式" : "浅色模式"}</span>
          </button>
          
          {bottomLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.label}
                href={link.href}
                className="group flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50/80 dark:hover:bg-gray-800/80 hover:text-gray-900 dark:hover:text-gray-200 transition-all duration-200"
              >
                <div className="p-1.5 rounded-lg group-hover:bg-gray-100/80 dark:group-hover:bg-gray-800/80 transition-colors duration-200">
                  <Icon className="w-[18px] h-[18px] flex-shrink-0 text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300 transition-colors duration-200" />
                </div>
                <span>{link.label}</span>
              </Link>
            );
          })}
          
          {/* User info */}
          <div className="mt-4 px-3.5 py-3.5 bg-gradient-to-r from-gray-50 to-gray-100/60 dark:from-gray-800 dark:to-gray-800/60 rounded-xl border border-gray-100/80 dark:border-gray-700/80 hover:border-gray-200/80 dark:hover:border-gray-600/80 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-indigo-500/25">
                {username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate" style={{ fontFamily: 'var(--font-heading)' }}>{username}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">已登录</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                title="退出登录"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200/80 dark:border-gray-700/80 z-40 safe-area-pb shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center h-14">
          {mobileLinks.map((link) => {
            const isMore = link.href === "#";
            const active = !isMore && (link.href === "/" ? pathname === "/" : pathname.startsWith(link.href));
            const Icon = link.icon;
            
            if (isMore) {
              return (
                <button
                  key="more"
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="relative flex flex-col items-center justify-center w-14 h-full text-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  <Icon className="w-5 h-5" />
                  <span className="mt-0.5 text-[10px]">更多</span>
                </button>
              );
            }
            
            return (
              <Link
                key={link.href}
                href={link.href}
                className="relative flex flex-col items-center justify-center w-14 h-full text-xs font-medium"
              >
                {active && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-blue-600" />
                )}
                <Icon className={`w-5 h-5 ${active ? "text-blue-600" : "text-gray-400 dark:text-gray-500"}`} />
                <span className={`mt-0.5 text-[10px] ${active ? "text-blue-600 font-semibold" : "text-gray-500 dark:text-gray-400"}`}>{link.label}</span>
              </Link>
            );
          })}
        </div>
        
        {/* More menu popup */}
        {showMoreMenu && (
          <div className="absolute bottom-full left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg rounded-t-2xl p-4 pb-6">
            <div className="grid grid-cols-4 gap-3">
              {mainLinks.slice(4).map((link) => {
                const Icon = link.icon;
                const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setShowMoreMenu(false)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl ${
                      active ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[10px] font-medium">{link.label}</span>
                  </Link>
                );
              })}
              {bottomLinks.map((link) => {
                const Icon = link.icon;
                const active = pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setShowMoreMenu(false)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl ${
                      active ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[10px] font-medium">{link.label}</span>
                  </Link>
                );
              })}
              <button
                onClick={() => { toggleTheme(); setShowMoreMenu(false); }}
                className="flex flex-col items-center gap-1 p-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {resolvedTheme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                <span className="text-[10px] font-medium">{theme === "system" ? "系统" : resolvedTheme === "light" ? "深色" : "浅色"}</span>
              </button>
              <button
                onClick={() => { handleLogout(); setShowMoreMenu(false); }}
                className="flex flex-col items-center gap-1 p-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-[10px] font-medium">退出</span>
              </button>
            </div>
          </div>
        )}
      </nav>
      
      {/* Overlay for more menu */}
      {showMoreMenu && (
        <div 
          className="md:hidden fixed inset-0 bg-black/20 z-30"
          onClick={() => setShowMoreMenu(false)}
        />
      )}
    </>
  );
}
