"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { LayoutDashboard, Package, ArrowDownToLine, Cpu, Settings, HelpCircle, BarChart3, FileText, Sun, Moon, Clock, MoreHorizontal, LogOut, History } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { useState, useEffect } from "react";

const mainLinks = [
  { href: "/", label: "仪表盘", icon: LayoutDashboard },
  { href: "/parts", label: "器件列表", icon: Package },
  { href: "/stock", label: "出入库", icon: ArrowDownToLine },
  { href: "/analytics", label: "数据分析", icon: BarChart3 },
  { href: "/boms", label: "BOM清单", icon: FileText },
  { href: "/logs", label: "操作日志", icon: Clock },
  { href: "/movements", label: "流水记录", icon: History },
];

// Mobile navigation - show only important links
const mobileLinks = [
  { href: "/", label: "首页", icon: LayoutDashboard },
  { href: "/parts", label: "器件", icon: Package },
  { href: "/stock", label: "出入库", icon: ArrowDownToLine },
  { href: "#", label: "更多", icon: MoreHorizontal },
];

const bottomLinks = [
  { href: "/settings", label: "设置", icon: Settings },
  { href: "/help", label: "帮助", icon: HelpCircle },
];

// Mobile "更多" menu shows main links not already on the bottom tab bar
const mobileHrefs = new Set(mobileLinks.map((link) => link.href));
const moreMenuLinks = mainLinks.filter((link) => !mobileHrefs.has(link.href));

export default function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, resolvedTheme, toggleTheme } = useTheme();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [username, setUsername] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setUsername(data.username || ""))
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-60 flex-col bg-white/90 dark:bg-[var(--background)]/90 backdrop-blur-xl border-r border-gray-200/80 dark:border-gray-700/80 z-40 shadow-[1px_0_12px_rgba(0,0,0,0.05)]">
        {/* Logo area */}
        <div className="px-5 py-6 border-b border-[var(--card-border)]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center shadow-lg shadow-black/10 hover:shadow-black/20 transition-shadow duration-300">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight whitespace-nowrap" style={{ fontFamily: 'var(--font-heading)' }}>元器件管理</h1>
              <p className="text-[11px] text-[var(--foreground-subtle)] font-medium tracking-wide">Inventory System</p>
            </div>
          </div>
        </div>
        
        {/* Navigation links */}
        <nav className="flex-1 py-5 px-3 space-y-1 overflow-y-auto">
          <div className="px-3 py-2 mb-2">
            <p className="text-[10px] font-bold text-[var(--foreground-subtle)] uppercase tracking-[0.15em]">主菜单</p>
          </div>
          {mainLinks.map((link, index) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`group relative flex items-center gap-3 px-3.5 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                  active
                    ? "bg-[var(--accent-subtle)] text-[var(--accent)]"
                    : "text-[var(--foreground-muted)] dark:text-[var(--foreground-subtle)] hover:bg-[var(--background-subtle)] hover:text-[var(--foreground)]"
                }`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 bg-[var(--accent)] rounded-r-full" />
                )}
                <div className={`p-1.5 rounded-lg transition-all duration-300 ${active ? "bg-[var(--accent-muted)]" : "group-hover:bg-[var(--background-muted)]"}`}>
                  <Icon className={`w-[18px] h-[18px] flex-shrink-0 transition-colors duration-200 ${active ? "text-[var(--accent)]" : "text-[var(--foreground-subtle)] group-hover:text-[var(--foreground-muted)]"}`} />
                </div>
                <span>{link.label}</span>
                {active && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse-soft" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom links */}
        <div className="px-3 py-4 border-t border-[var(--card-border)] space-y-1">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-full group flex items-center gap-3 px-3.5 py-3 rounded-lg text-sm font-medium text-[var(--foreground-muted)] dark:text-[var(--foreground-subtle)] hover:bg-[var(--background-subtle)] hover:text-[var(--foreground)] transition-all duration-200"
          >
            <div className="p-1.5 rounded-lg group-hover:bg-[var(--background-muted)] transition-colors duration-200">
              {resolvedTheme === "light" ? (
                <Moon className="w-[18px] h-[18px] flex-shrink-0 text-[var(--foreground-subtle)] group-hover:text-[var(--foreground-muted)] transition-colors duration-200" />
              ) : (
                <Sun className="w-[18px] h-[18px] flex-shrink-0 text-[var(--foreground-subtle)] group-hover:text-[var(--foreground-muted)] transition-colors duration-200" />
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
                className="group flex items-center gap-3 px-3.5 py-3 rounded-lg text-sm font-medium text-[var(--foreground-muted)] dark:text-[var(--foreground-subtle)] hover:bg-[var(--background-subtle)] hover:text-[var(--foreground)] transition-all duration-200"
              >
                <div className="p-1.5 rounded-lg group-hover:bg-[var(--background-muted)] transition-colors duration-200">
                  <Icon className="w-[18px] h-[18px] flex-shrink-0 text-[var(--foreground-subtle)] group-hover:text-[var(--foreground-muted)] transition-colors duration-200" />
                </div>
                <span>{link.label}</span>
              </Link>
            );
          })}
          
          {/* User info */}
          <div className="mt-4 px-3.5 py-3.5 bg-gradient-to-r from-[var(--background-subtle)] to-[var(--background-muted)] rounded-lg border border-[var(--card-border)] hover:border-[var(--border-hover)] transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-black/10">
                {username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate" style={{ fontFamily: 'var(--font-heading)' }}>{username}</p>
                <p className="text-[11px] text-[var(--foreground-subtle)] truncate">已登录</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 dark:text-[var(--foreground-subtle)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                title="退出登录"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[var(--background)]/95 backdrop-blur-xl border-t border-gray-200/80 dark:border-gray-700/80 z-40 safe-area-pb shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
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
                  className="relative flex flex-col items-center justify-center w-14 h-full text-xs font-medium text-[var(--foreground-subtle)]"
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
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[var(--accent)]" />
                )}
                <Icon className={`w-5 h-5 ${active ? "text-[var(--accent)]" : "text-[var(--foreground-subtle)]"}`} />
                <span className={`mt-0.5 text-[10px] ${active ? "text-[var(--accent)] font-semibold" : "text-[var(--foreground-subtle)]"}`}>{link.label}</span>
              </Link>
            );
          })}
        </div>
        
        {/* More menu popup */}
        {showMoreMenu && (
          <div className="absolute bottom-full left-0 right-0 bg-white dark:bg-[var(--background)] border-t border-gray-200 dark:border-gray-700 shadow-lg rounded-t-lg p-4 pb-6">
            <div className="grid grid-cols-4 gap-3">
              {moreMenuLinks.map((link) => {
                const Icon = link.icon;
                const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setShowMoreMenu(false)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg ${
                      active ? "bg-[var(--accent-subtle)] text-[var(--accent)]" : "text-[var(--foreground-muted)] dark:text-[var(--foreground-subtle)] hover:bg-[var(--background-subtle)]"
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
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg ${
                      active ? "bg-[var(--accent-subtle)] text-[var(--accent)]" : "text-[var(--foreground-muted)] dark:text-[var(--foreground-subtle)] hover:bg-[var(--background-subtle)]"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[10px] font-medium">{link.label}</span>
                  </Link>
                );
              })}
              <button
                onClick={() => { toggleTheme(); setShowMoreMenu(false); }}
                className="flex flex-col items-center gap-1 p-3 rounded-lg text-[var(--foreground-muted)] dark:text-[var(--foreground-subtle)] hover:bg-[var(--background-subtle)]"
              >
                {resolvedTheme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                <span className="text-[10px] font-medium">{theme === "system" ? "系统" : resolvedTheme === "light" ? "深色" : "浅色"}</span>
              </button>
              <button
                onClick={() => { handleLogout(); setShowMoreMenu(false); }}
                className="flex flex-col items-center gap-1 p-3 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
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
