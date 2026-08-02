"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Package, Trash2, Edit, Eye, FileText, ChevronRight, Loader2, Search } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { useToast } from "@/components/ToastProvider";
import { useConfirm } from "@/components/ConfirmProvider";
import { PageHeader, Button, EmptyState, Modal, inputClass, textareaClass, cardClass } from "@/components/ui";

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
  const { toast } = useToast();
  const confirm = useConfirm();

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
    const ok = await confirm({ title: "删除BOM", message: `确定删除BOM"${name}"？此操作不可撤销。`, danger: true });
    if (!ok) return;
    try {
      await fetch(`/api/boms/${id}`, { method: "DELETE" });
      fetchBoms();
    } catch (e) {
      console.error(e);
      toast("删除失败", "error");
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
      {/* Header */}
      <PageHeader
        breadcrumb={<Breadcrumb items={[{ label: "BOM清单" }]} />}
        title="BOM清单"
        subtitle="项目物料清单管理"
        actions={
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" />新建BOM
          </Button>
        }
      />

      {/* BOM List */}
      {boms.length === 0 ? (
        <div className={`${cardClass} section`}>
          <EmptyState
            icon={<FileText className="w-7 h-7 text-[var(--foreground-subtle)]" />}
            title="暂无BOM清单"
            description="点击上方按钮创建第一个BOM"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 section">
          {boms.map((bom) => (
            <div
              key={bom.id}
              className="bg-white dark:bg-[var(--card)] rounded-lg border border-gray-200/80 dark:border-[var(--card-border)] p-6 hover:shadow-md hover:border-[var(--border-hover)] transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => router.push(`/boms/${bom.id}`)}
                    className="p-2 text-gray-400 dark:text-[var(--foreground-subtle)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)] rounded-lg transition-all"
                    aria-label="查看"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(bom.id, bom.name)}
                    className="p-2 text-gray-400 dark:text-[var(--foreground-subtle)] hover:text-[var(--error)] hover:bg-[var(--error-subtle)] rounded-lg transition-all"
                    aria-label="删除"
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
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast("请输入BOM名称", "error");
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
        toast(data.error || "创建失败", "error");
        return;
      }
      onSaved();
    } catch (e) {
      console.error(e);
      toast("创建失败", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="新建BOM" width="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-[var(--foreground-muted)] mb-2">名称 *</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="如：智能小车项目"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-[var(--foreground-muted)] mb-2">描述</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={textareaClass}
            rows={3}
            placeholder="BOM描述（可选）"
          />
        </div>
        <div className="flex gap-3 pt-3">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">取消</Button>
          <Button type="submit" variant="primary" disabled={saving} className="flex-1">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> 创建中...</> : "创建"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
