"use client";

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/components/ThemeProvider";
import {
  Palette,
  Package,
  List,
  Tags,
  Save,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { useToast } from "@/components/ToastProvider";
import { PageHeader, Button, Modal, SelectField, inputClass, textareaClass } from "@/components/ui";

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
  const { toast } = useToast();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        toast("已保存", "success");
      } else {
        toast("保存失败", "error");
      }
    } catch {
      toast("保存失败", "error");
    } finally {
      setSaving(false);
    }
  };

  const closeCategoryModal = () => {
    setShowCategoryModal(false);
    setEditingCategory(null);
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
        toast(editingCategory ? "分类已更新" : "分类已创建", "success");
      } else {
        toast(data.error || "操作失败", "error");
      }
    } catch {
      toast("操作失败", "error");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
        toast("分类已删除", "success");
      } else {
        toast("删除失败", "error");
      }
    } catch {
      toast("删除失败", "error");
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
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="page-container-narrow space-y-6">
      <PageHeader
        breadcrumb={<Breadcrumb items={[{ label: "设置" }]} />}
        title="设置"
        subtitle="偏好与系统配置"
      />

      {/* 外观设置 */}
      <section className="bg-white dark:bg-[var(--card)] rounded-lg border border-[var(--card-border)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-5 h-5 text-[var(--accent)]" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-[var(--card-foreground)]">外观设置</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-[var(--foreground-muted)] mb-2">
              主题模式
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "light", label: "浅色", icon: Sun },
                { value: "dark", label: "深色", icon: Moon },
                { value: "system", label: "跟随系统", icon: Monitor },
              ].map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value as "light" | "dark" | "system")}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                      theme === option.value
                        ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]"
                        : "border-[var(--border)] text-[var(--foreground)] hover:border-[var(--border-hover)]"
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-sm font-medium">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 库存设置 */}
      <section className="bg-white dark:bg-[var(--card)] rounded-lg border border-[var(--card-border)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-5 h-5 text-[var(--accent)]" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-[var(--card-foreground)]">库存设置</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-[var(--foreground-muted)] mb-1">
              默认低库存预警阈值
            </label>
            <input
              type="number"
              value={settings.low_stock_threshold}
              onChange={(e) => setSettings({ ...settings, low_stock_threshold: e.target.value })}
              className={inputClass}
              min="0"
            />
            <p className="text-xs text-gray-500 dark:text-[var(--foreground-subtle)] mt-1">
              当器件库存低于此值时显示预警
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-[var(--foreground-muted)] mb-1">
              默认计量单位
            </label>
            <input
              type="text"
              value={settings.default_unit}
              onChange={(e) => setSettings({ ...settings, default_unit: e.target.value })}
              className={inputClass}
              placeholder="pcs"
            />
          </div>
        </div>
      </section>

      {/* 操作偏好 */}
      <section className="bg-white dark:bg-[var(--card)] rounded-lg border border-[var(--card-border)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <List className="w-5 h-5 text-[var(--accent)]" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-[var(--card-foreground)]">操作偏好</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-[var(--foreground-muted)] mb-1">
              默认排序字段
            </label>
            <SelectField
              value={settings.default_sort_field}
              onChange={(e) => setSettings({ ...settings, default_sort_field: e.target.value })}
            >
              <option value="createdAt">创建时间</option>
              <option value="updatedAt">更新时间</option>
              <option value="name">名称</option>
              <option value="code">编号</option>
            </SelectField>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-[var(--foreground-muted)] mb-1">
              默认排序方向
            </label>
            <SelectField
              value={settings.default_sort_order}
              onChange={(e) => setSettings({ ...settings, default_sort_order: e.target.value })}
            >
              <option value="desc">降序</option>
              <option value="asc">升序</option>
            </SelectField>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-[var(--foreground-muted)] mb-1">
              每页显示条数
            </label>
            <SelectField
              value={settings.page_size}
              onChange={(e) => setSettings({ ...settings, page_size: e.target.value })}
            >
              <option value="10">10 条</option>
              <option value="20">20 条</option>
              <option value="50">50 条</option>
              <option value="100">100 条</option>
            </SelectField>
          </div>
        </div>
      </section>

      {/* 保存按钮 */}
      <div className="flex justify-end">
        <Button onClick={handleSaveSettings} disabled={saving} className="px-6 py-3">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "保存中..." : "保存设置"}
        </Button>
      </div>

      {/* 分类管理 */}
      <section className="bg-white dark:bg-[var(--card)] rounded-lg border border-[var(--card-border)] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Tags className="w-5 h-5 text-[var(--accent)]" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-[var(--card-foreground)]">分类管理</h2>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setEditingCategory(null);
              setCategoryName("");
              setCategoryDesc("");
              setShowCategoryModal(true);
            }}
          >
            <Plus className="w-4 h-4" />
            新增分类
          </Button>
        </div>

        {categories.length === 0 ? (
          <p className="text-gray-500 dark:text-[var(--foreground-subtle)] text-center py-8">
            暂无分类，点击上方按钮创建
          </p>
        ) : (
          <div className="space-y-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-[var(--background-subtle)] hover:bg-gray-100 dark:hover:bg-[var(--background-muted)] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-[var(--card-foreground)]">{cat.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)]">
                      {cat.partCount} 个器件
                    </span>
                  </div>
                  {cat.description && (
                    <p className="text-sm text-gray-500 dark:text-[var(--foreground-subtle)] truncate">{cat.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-4">
                  <button
                    onClick={() => openEditCategory(cat)}
                    className="p-2 text-gray-400 dark:text-[var(--foreground-subtle)] hover:text-[var(--accent)] rounded-lg hover:bg-[var(--accent-subtle)] transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    disabled={deletingId === cat.id}
                    className="p-2 text-gray-400 dark:text-[var(--foreground-subtle)] hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
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
      <Modal
        open={showCategoryModal}
        onClose={closeCategoryModal}
        title={editingCategory ? "编辑分类" : "新增分类"}
        width="max-w-md"
        footer={
          <>
            <Button type="button" variant="outline" onClick={closeCategoryModal}>
              取消
            </Button>
            <Button type="button" onClick={handleSaveCategory} disabled={!categoryName.trim()}>
              {editingCategory ? "更新" : "创建"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-[var(--foreground-muted)] mb-1">
              分类名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className={inputClass}
              placeholder="请输入分类名称"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-[var(--foreground-muted)] mb-1">
              描述
            </label>
            <textarea
              value={categoryDesc}
              onChange={(e) => setCategoryDesc(e.target.value)}
              className={textareaClass}
              rows={3}
              placeholder="可选描述"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
