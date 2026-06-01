"use client";

import { useEffect, useState } from "react";
import { X, Keyboard } from "lucide-react";

interface Shortcut {
  key: string;
  label: string;
  description: string;
}

const globalShortcuts: Shortcut[] = [
  { key: "/", label: "搜索", description: "聚焦搜索框" },
  { key: "?", label: "帮助", description: "显示快捷键帮助" },
  { key: "Esc", label: "关闭", description: "关闭弹窗/取消操作" },
];

const pageShortcuts: Record<string, Shortcut[]> = {
  "/": [
    { key: "g p", label: "器件列表", description: "跳转到器件列表" },
    { key: "g i", label: "入库", description: "跳转入库页面" },
    { key: "g o", label: "出库", description: "跳转出库页面" },
  ],
  "/parts": [
    { key: "n", label: "新增", description: "打开新增器件弹窗" },
  ],
};

export default function KeyboardShortcuts() {
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    let lastKeyTime = 0;
    let lastKey = "";

    const handleKeyDown = (e: KeyboardEvent) => {
      // 忽略输入框内的快捷键
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") {
        if (e.key === "Escape") {
          target.blur();
        }
        return;
      }

      // ? 显示帮助
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShowHelp(prev => !prev);
        return;
      }

      // Esc 关闭帮助
      if (e.key === "Escape") {
        setShowHelp(false);
        return;
      }

      // g + p/i/o 跳转页面
      const now = Date.now();
      if (lastKey === "g" && now - lastKeyTime < 1000) {
        switch (e.key) {
          case "p":
            window.location.href = "/parts";
            return;
          case "i":
            window.location.href = "/stock-in";
            return;
          case "o":
            window.location.href = "/stock-out";
            return;
        }
      }
      lastKey = e.key;
      lastKeyTime = now;

      // / 聚焦搜索
      if (e.key === "/") {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"][placeholder*="搜索"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!showHelp) return null;

  return (
    <div className="fixed inset-0 modal-backdrop z-[100] flex items-center justify-center p-4" onClick={() => setShowHelp(false)}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200/80" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <Keyboard className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">键盘快捷键</h2>
          </div>
          <button
            onClick={() => setShowHelp(false)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          {/* Global shortcuts */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">全局</h3>
            <div className="space-y-2">
              {globalShortcuts.map((shortcut) => (
                <div key={shortcut.key} className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-700">{shortcut.description}</span>
                  <kbd className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-mono rounded-lg border border-gray-200">
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Page shortcuts */}
          {Object.entries(pageShortcuts).map(([path, shortcuts]) => (
            <div key={path}>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                {path === "/" ? "仪表盘" : path === "/parts" ? "器件列表" : path}
              </h3>
              <div className="space-y-2">
                {shortcuts.map((shortcut) => (
                  <div key={shortcut.key} className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-700">{shortcut.description}</span>
                    <kbd className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-mono rounded-lg border border-gray-200">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
          <p className="text-xs text-gray-400 text-center">按 <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-500">?</kbd> 或 <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-500">Esc</kbd> 关闭</p>
        </div>
      </div>
    </div>
  );
}
