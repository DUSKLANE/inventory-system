"use client";

import { useState, useEffect } from "react";
import { X, Tag, Loader2 } from "lucide-react";
import CategoryInput from "@/components/CategoryInput";
import PackageInput from "@/components/PackageInput";
import { useToast } from "@/components/ToastProvider";
import { Button, inputClass } from "@/components/ui";

export interface PartFormValue {
  id?: string;
  code: string;
  name: string;
  category: string;
  package: string;
  brand: string;
  model: string;
  unit: string;
  minStock: number;
  location: string;
  note?: string;
}

interface PartFormModalProps {
  part: PartFormValue | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function PartFormModal({ part, onClose, onSaved }: PartFormModalProps) {
  const isEdit = !!part;
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PartFormValue>({
    code: part?.code || "",
    name: part?.name || "",
    category: part?.category || "",
    package: part?.package || "",
    brand: part?.brand || "",
    model: part?.model || "",
    unit: part?.unit || "pcs",
    minStock: part?.minStock || 0,
    location: part?.location || "",
    note: part?.note || "",
  });

  useEffect(() => {
    if (!isEdit) {
      fetch("/api/parts/next-code")
        .then((res) => res.json())
        .then((data) => {
          if (data.code) setForm((prev) => ({ ...prev, code: data.code }));
        })
        .catch(() => {});
      fetch("/api/settings")
        .then((res) => res.json())
        .then((s) => {
          if (s?.default_unit) setForm((prev) => ({ ...prev, unit: s.default_unit }));
        })
        .catch(() => {});
    }
  }, [isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = isEdit ? `/api/parts/${part?.id}` : "/api/parts";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        toast(data.error || "保存失败", "error");
        return;
      }
      onSaved();
    } catch (e) {
      console.error(e);
      toast("保存失败", "error");
    } finally {
      setSaving(false);
    }
  };

  const labelClass = "block text-sm font-semibold text-gray-700 dark:text-[var(--foreground-muted)] mb-3";

  return (
    <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-[var(--card)] rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl dark:shadow-black/40 border border-gray-200/80 dark:border-[var(--card-border)]">
        <div className="px-8 py-6 border-b border-gray-100 dark:border-[var(--card-border)] flex items-center justify-between sticky top-0 bg-white dark:bg-[var(--card)] z-10 rounded-t-lg">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
              <Tag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[var(--card-foreground)]">
              {isEdit ? "编辑器件" : "新增器件"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 text-gray-400 dark:text-[var(--foreground-subtle)] hover:text-gray-600 dark:hover:text-[var(--foreground-muted)] hover:bg-gray-100 dark:hover:bg-[var(--background-muted)] rounded-lg transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>编码 *</label>
              <input
                required
                value={form.code}
                readOnly
                className="w-full px-5 py-4 bg-gray-100 dark:bg-[var(--background-muted)] border border-gray-200 dark:border-[var(--card-border)] rounded-lg text-sm text-gray-600 dark:text-[var(--foreground-muted)] cursor-not-allowed"
                placeholder={isEdit ? undefined : "自动生成中..."}
              />
            </div>
            <div>
              <label className={labelClass}>名称 *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass}
                placeholder="器件名称"
              />
            </div>
            <div>
              <label className={labelClass}>分类</label>
              <CategoryInput
                value={form.category}
                onChange={(val) => setForm({ ...form, category: val })}
              />
            </div>
            <div>
              <label className={labelClass}>封装</label>
              <PackageInput
                value={form.package}
                onChange={(val) => setForm({ ...form, package: val })}
              />
            </div>
            <div>
              <label className={labelClass}>品牌</label>
              <input
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                className={inputClass}
                placeholder="品牌"
              />
            </div>
            <div>
              <label className={labelClass}>型号</label>
              <input
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                className={inputClass}
                placeholder="型号"
              />
            </div>
            <div>
              <label className={labelClass}>单位</label>
              <input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className={inputClass}
                placeholder="pcs"
              />
            </div>
            <div>
              <label className={labelClass}>最低库存</label>
              <input
                type="number"
                min="0"
                value={form.minStock}
                onChange={(e) => setForm({ ...form, minStock: parseInt(e.target.value) || 0 })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>仓位</label>
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className={inputClass}
                placeholder="如 A-1-03"
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>备注</label>
            <textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className={`${inputClass} resize-none`}
              rows={4}
              placeholder="备注信息"
            />
          </div>
          <div className="flex gap-4 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="flex-1"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  保存中...
                </>
              ) : (
                isEdit ? "保存修改" : "创建器件"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
