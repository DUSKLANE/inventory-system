"use client";

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/components/ThemeProvider";
import {
  Settings,
  Palette,
  Package,
  List,
  Tags,
  Save,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Loader2,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
  partCount: number;
}

interface AppSettings {
  low_stock_threshold: string;
  default_unit: string;
  default_sort_field: string;
  default_sort_order: string;
  page_size: string;
}

const defaultSettings: AppSettings = {
  low_stock_threshold: "10",
  default_unit: "pcs",
  default_sort_field: "createdAt",
  default_sort_order: "desc",
  page_size: "20",
};

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDesc, setCategoryDesc] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [settingsRes, categoriesRes] = await Promise.all([
        fetch("/api/settings"),
        fetch("/api/categories"),
      ]);
      const settingsData = await settingsRes.json();
      const categoriesData = await categoriesRes.json();

      setSettings({ ...defaultSettings, ...settingsData });
      setCategories(categoriesData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        showMessage("success", "设置已保存");
      } else {
        showMessage("error", "保存失败");
      }
    } catch {
      showMessage("error", "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) return;

    const url = editingCategory
      ? `/api/categories/${editingCategory.id}`
      : "/api/categories";
    const method = editingCategory ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: categoryName.trim(),
          description: categoryDesc.trim(),
          sortOrder: editingCategory?.sortOrder ?? categories.length,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowCategoryModal(false);
        setEditingCategory(null);
        setCategoryName("");
        setCategoryDesc("");
        fetchData();
        showMessage("success", editingCategory ? "分类已更新" : "分类已创建");
      } else {
        showMessage("error", data.error || "操作失败");
      }
    } catch {
      showMessage("error", "操作失败");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
        showMessage("success", "分类已删除");
      } else {
        showMessage("error", "删除失败");
      }
    } catch {
      showMessage("error", "删除失败");
    } finally {
      setDeletingId(null);
    }
  };

  const openEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setCategoryDesc(cat.description);
    setShowCategoryModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-7 h-7 text-indigo-500" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">设置</h1>
      </div>

      {message && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg animate-fade-in ${
            message.type === "success"
              ? "bg-emerald-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === "success" ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            {message.text}
          </div>
        </div>
      )}

      {/* 外观设置 */}
      <section className="bg-white dark:bg-[var(--card)] rounded-2xl border border-gray-200 dark:border-[var(--card-border)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-5 h-5 text-indigo-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">外观设置</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              主题模式
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "light", label: "浅色", icon: "☀️" },
                { value: "dark", label: "深色", icon: "🌙" },
                { value: "system", label: "跟随系统", icon: "💻" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value as "light" | "dark" | "system")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    theme === option.value
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
                      : "border-gray-200 dark:border-[var(--card-border)] hover:border-gray-300"
                  }`}
                >
                  <span className="text-2xl">{option.icon}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 库存设置 */}
      <section className="bg-white dark:bg-[var(--card)] rounded-2xl border border-gray-200 dark:border-[var(--card-border)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-5 h-5 text-indigo-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">库存设置</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              默认低库存预警阈值
            </label>
            <input
              type="number"
              value={settings.low_stock_threshold}
              onChange={(e) => setSettings({ ...settings, low_stock_threshold: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-[var(--card-border)] rounded-lg bg-white dark:bg-[var(--background-subtle)] text-gray-900 dark:text-gray-100"
              min="0"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              当器件库存低于此值时显示预警
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              默认计量单位
            </label>
            <input
              type="text"
              value={settings.default_unit}
              onChange={(e) => setSettings({ ...settings, default_unit: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-[var(--card-border)] rounded-lg bg-white dark:bg-[var(--background-subtle)] text-gray-900 dark:text-gray-100"
              placeholder="pcs"
            />
          </div>
        </div>
      </section>

      {/* 操作偏好 */}
      <section className="bg-white dark:bg-[var(--card)] rounded-2xl border border-gray-200 dark:border-[var(--card-border)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <List className="w-5 h-5 text-indigo-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">操作偏好</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              默认排序字段
            </label>
            <select
              value={settings.default_sort_field}
              onChange={(e) => setSettings({ ...settings, default_sort_field: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-[var(--card-border)] rounded-lg bg-white dark:bg-[var(--background-subtle)] text-gray-900 dark:text-gray-100"
            >
              <option value="createdAt">创建时间</option>
              <option value="updatedAt">更新时间</option>
              <option value="name">名称</option>
              <option value="code">编号</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              默认排序方向
            </label>
            <select
              value={settings.default_sort_order}
              onChange={(e) => setSettings({ ...settings, default_sort_order: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-[var(--card-border)] rounded-lg bg-white dark:bg-[var(--background-subtle)] text-gray-900 dark:text-gray-100"
            >
              <option value="desc">降序</option>
              <option value="asc">升序</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              每页显示条数
            </label>
            <select
              value={settings.page_size}
              onChange={(e) => setSettings({ ...settings, page_size: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-[var(--card-border)] rounded-lg bg-white dark:bg-[var(--background-subtle)] text-gray-900 dark:text-gray-100"
            >
              <option value="10">10 条</option>
              <option value="20">20 条</option>
              <option value="50">50 条</option>
              <option value="100">100 条</option>
            </select>
          </div>
        </div>
      </section>

      {/* 保存按钮 */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "保存中..." : "保存设置"}
        </button>
      </div>

      {/* 分类管理 */}
      <section className="bg-white dark:bg-[var(--card)] rounded-2xl border border-gray-200 dark:border-[var(--card-border)] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Tags className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">分类管理</h2>
          </div>
          <button
            onClick={() => {
              setEditingCategory(null);
              setCategoryName("");
              setCategoryDesc("");
              setShowCategoryModal(true);
            }}
            className="flex items-center gap-1 px-3 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新增分类
          </button>
        </div>

        {categories.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            暂无分类，点击上方按钮创建
          </p>
        ) : (
          <div className="space-y-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[var(--background-subtle)] hover:bg-gray-100 dark:hover:bg-[var(--background-muted)] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{cat.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                      {cat.partCount} 个器件
                    </span>
                  </div>
                  {cat.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{cat.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-4">
                  <button
                    onClick={() => openEditCategory(cat)}
                    className="p-2 text-gray-400 hover:text-indigo-500 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    disabled={deletingId === cat.id}
                    className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  >
                    {deletingId === cat.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 分类编辑弹窗 */}
      {showCategoryModal && (
        <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[var(--card)] rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {editingCategory ? "编辑分类" : "新增分类"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  分类名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-[var(--card-border)] rounded-lg bg-white dark:bg-[var(--background-subtle)] text-gray-900 dark:text-gray-100"
                  placeholder="请输入分类名称"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  描述
                </label>
                <textarea
                  value={categoryDesc}
                  onChange={(e) => setCategoryDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-[var(--card-border)] rounded-lg bg-white dark:bg-[var(--background-subtle)] text-gray-900 dark:text-gray-100 resize-none"
                  rows={3}
                  placeholder="可选描述"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  setEditingCategory(null);
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[var(--background-subtle)] rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveCategory}
                disabled={!categoryName.trim()}
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 transition-colors disabled:opacity-50"
              >
                {editingCategory ? "更新" : "创建"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
