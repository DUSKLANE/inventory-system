"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Package, Trash2, Edit, Eye, FileText, ChevronRight, Loader2, X, Search } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";

interface Bom {
  id: string;
  name: string;
  description: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function BomsPage() {
  const router = useRouter();
  const [boms, setBoms] = useState<Bom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const fetchBoms = async () => {
    try {
      const res = await fetch("/api/boms");
      const data = await res.json();
      setBoms(data.boms || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoms();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定删除BOM"${name}"？此操作不可撤销。`)) return;
    try {
      await fetch(`/api/boms/${id}`, { method: "DELETE" });
      fetchBoms();
    } catch (e) {
      console.error(e);
      alert("删除失败");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-800 rounded-full animate-spin" />
            <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-blue-600 rounded-full animate-spin" />
          </div>
          <p className="text-gray-500 dark:text-[var(--foreground-subtle)] text-sm font-medium">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Breadcrumb items={[{ label: "BOM清单" }]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 section">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-[var(--card-foreground)] tracking-tight">BOM清单</h1>
            <p className="text-gray-500 dark:text-[var(--foreground-subtle)] mt-1">项目物料清单管理</p>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30"
        >
          <Plus className="w-5 h-5" /> 新建BOM
        </button>
      </div>

      {/* BOM List */}
      {boms.length === 0 ? (
        <div className="bg-white dark:bg-[var(--card)] rounded-2xl border border-gray-200/80 dark:border-[var(--card-border)] p-16 text-center section">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-[var(--background-muted)] flex items-center justify-center">
            <FileText className="w-8 h-8 text-gray-400 dark:text-[var(--foreground-subtle)]" />
          </div>
          <p className="text-gray-500 dark:text-[var(--foreground-subtle)] font-medium">暂无BOM清单</p>
          <p className="text-gray-400 dark:text-[var(--foreground-subtle)] text-sm mt-1">点击上方按钮创建第一个BOM</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 section">
          {boms.map((bom) => (
            <div
              key={bom.id}
              className="bg-white dark:bg-[var(--card)] rounded-2xl border border-gray-200/80 dark:border-[var(--card-border)] p-6 hover:shadow-lg hover:border-gray-300 dark:hover:border-[var(--card-border)] transition-all duration-200 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => router.push(`/boms/${bom.id}`)}
                    className="p-2 text-gray-400 dark:text-[var(--foreground-subtle)] hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(bom.id, bom.name)}
                    className="p-2 text-gray-400 dark:text-[var(--foreground-subtle)] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-[var(--card-foreground)] mb-2">{bom.name}</h3>
              {bom.description && (
                <p className="text-sm text-gray-500 dark:text-[var(--foreground-subtle)] mb-4 line-clamp-2">{bom.description}</p>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-[var(--card-border)]">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-gray-400 dark:text-[var(--foreground-subtle)]" />
                  <span className="text-sm text-gray-600 dark:text-[var(--foreground-muted)]">{bom.itemCount} 个器件</span>
                </div>
                <span className="text-xs text-gray-400 dark:text-[var(--foreground-subtle)]">
                  {new Date(bom.updatedAt).toLocaleDateString("zh-CN")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <AddBomModal
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); fetchBoms(); }}
        />
      )}
    </div>
  );
}

function AddBomModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("请输入BOM名称");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/boms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "创建失败");
        return;
      }
      onSaved();
    } catch (e) {
      console.error(e);
      alert("创建失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-[var(--card)] rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200/80 dark:border-[var(--card-border)]">
        <div className="px-8 py-6 border-b border-gray-100 dark:border-[var(--card-border)] flex items-center justify-between rounded-t-2xl">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-[var(--card-foreground)]">新建BOM</h2>
          <button onClick={onClose} className="p-2.5 text-gray-400 dark:text-[var(--foreground-subtle)] hover:text-gray-600 dark:hover:text-[var(--foreground-muted)] hover:bg-gray-100 dark:hover:bg-[var(--background-muted)] rounded-xl transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-[var(--foreground-muted)] mb-2">名称 *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-5 py-4 bg-gray-50 dark:bg-[var(--background-subtle)] border border-gray-200 dark:border-[var(--card-border)] rounded-xl text-sm text-gray-900 dark:text-[var(--card-foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-[var(--card)] transition-all"
              placeholder="如：智能小车项目"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-[var(--foreground-muted)] mb-2">描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-5 py-4 bg-gray-50 dark:bg-[var(--background-subtle)] border border-gray-200 dark:border-[var(--card-border)] rounded-xl text-sm text-gray-900 dark:text-[var(--card-foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-[var(--card)] transition-all resize-none"
              rows={3}
              placeholder="BOM描述（可选）"
            />
          </div>
          <div className="flex gap-4 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-5 py-4 border border-gray-200 dark:border-[var(--card-border)] rounded-xl text-sm font-semibold text-gray-700 dark:text-[var(--foreground-muted)] hover:bg-gray-50 dark:hover:bg-[var(--background-subtle)] transition-all"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-5 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> 创建中...</> : "创建"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
