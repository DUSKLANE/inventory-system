"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowDownToLine, ArrowUpFromLine, Tag, Package, MapPin, Building2, FileText, Ruler, Hash, AlertTriangle, Clock, TrendingDown, TrendingUp, Settings, Edit, Boxes, Activity, X, Loader2, Star } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";

interface PartDetail {
  id: string;
  code: string;
  name: string;
  category: string;
  package: string;
  brand: string;
  model: string;
  unit: string;
  minStock: number;
  location: string;
  note: string;
  stock?: { quantity: number };
  movements: Array<{
    id: string;
    type: string;
    quantity: number;
    operator: string;
    reason: string;
    code: string;
    createdAt: string;
  }>;
}

export default function PartDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [part, setPart] = useState<PartDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const fetchPart = async () => {
    if (!params.id) return;
    try {
      const res = await fetch(`/api/parts/${params.id}`);
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        router.push("/parts");
        return;
      }
      setPart(data);
      
      // Check if favorited
      const favRes = await fetch("/api/favorites");
      const favData = await favRes.json();
      setIsFavorite(favData.favorites?.some((f: { id: string }) => f.id === params.id) || false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async () => {
    if (!part) return;
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partId: part.id }),
      });
      const result = await res.json();
      setIsFavorite(result.favorited);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchPart();
  }, [params.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-800 rounded-full animate-spin" />
            <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin" />
          </div>
          <p className="text-gray-500 dark:text-[var(--foreground-subtle)] text-sm font-medium">加载中...</p>
        </div>
      </div>
    );
  }

  if (!part) return null;

  const qty = part.stock?.quantity ?? 0;
  const lowStock = part.minStock > 0 && qty < part.minStock;
  const stockPercent = part.minStock > 0 ? Math.min(100, (qty / (part.minStock * 2)) * 100) : 100;

  const fields = [
    { label: "编码", value: part.code, icon: Hash, mono: true },
    { label: "分类", value: part.category, icon: Tag },
    { label: "封装", value: part.package, icon: Package },
    { label: "品牌", value: part.brand, icon: Building2 },
    { label: "型号", value: part.model, icon: FileText },
    { label: "单位", value: part.unit, icon: Ruler },
    { label: "仓位", value: part.location, icon: MapPin },
    { label: "最低库存", value: part.minStock > 0 ? String(part.minStock) : "-", icon: AlertTriangle },
    { label: "备注", value: part.note || "-", icon: FileText },
  ];

  return (
    <div className="page-container max-w-5xl">
      <Breadcrumb items={[
        { label: "器件列表", href: "/parts" },
        { label: part.name }
      ]} />

      {/* Main info card */}
      <div className="bg-white dark:bg-[var(--card)] rounded-2xl border border-gray-200/80 dark:border-[var(--card-border)] p-5 sm:p-10 section shadow-sm dark:shadow-black/20">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 sm:gap-10">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 dark:shadow-blue-500/10">
              <Boxes className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-[var(--card-foreground)] tracking-tight">{part.name}</h1>
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <span className="font-mono bg-gray-100 dark:bg-[var(--background-muted)] text-gray-600 dark:text-[var(--foreground-muted)] px-4 py-1.5 rounded-lg text-sm font-medium">{part.code}</span>
                {part.category && (
                  <span className="px-4 py-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-sm font-medium rounded-lg">
                    {part.category}
                  </span>
                )}
                {lowStock && (
                  <span className="px-4 py-1.5 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm font-medium rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> 低库存
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={toggleFavorite}
              className={`px-3 py-2 border rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                isFavorite
                  ? "border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400"
                  : "border-gray-200 dark:border-[var(--card-border)] text-gray-700 dark:text-[var(--foreground-muted)] hover:bg-gray-50 dark:hover:bg-[var(--background-subtle)] hover:border-gray-300 dark:hover:border-[var(--card-border)]"
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${isFavorite ? "fill-amber-500" : ""}`} />
              {isFavorite ? "已收藏" : "收藏"}
            </button>
            <button
              onClick={() => setShowEdit(true)}
              className="px-3 py-2 border border-gray-200 dark:border-[var(--card-border)] text-gray-700 dark:text-[var(--foreground-muted)] rounded-lg text-xs font-medium hover:bg-gray-50 dark:hover:bg-[var(--background-subtle)] hover:border-gray-300 dark:hover:border-[var(--card-border)] transition-all duration-200 flex items-center gap-1.5"
            >
              <Edit className="w-3.5 h-3.5" /> 编辑
            </button>
            <Link
              href={`/stock-in?code=${encodeURIComponent(part.code)}`}
              className="px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-xs font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center gap-1.5 shadow-lg shadow-blue-500/25 dark:shadow-blue-500/10"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" /> 入库
            </Link>
            <Link
              href={`/stock-out?code=${encodeURIComponent(part.code)}`}
              className="px-3 py-2 bg-gradient-to-r from-red-600 to-rose-700 text-white rounded-lg text-xs font-medium hover:from-red-700 hover:to-rose-800 transition-all duration-200 flex items-center gap-1.5 shadow-lg shadow-red-500/25 dark:shadow-red-500/10"
            >
              <ArrowUpFromLine className="w-3.5 h-3.5" /> 出库
            </Link>
          </div>
        </div>

        {/* Stock display */}
        <div className="mt-5 sm:mt-10 pt-5 sm:pt-10 border-t border-gray-100 dark:border-[var(--card-border)]">
          <div className="flex items-end gap-3 sm:gap-5">
            <span className="text-4xl sm:text-6xl font-bold text-gray-900 dark:text-[var(--card-foreground)] tracking-tight">{qty}</span>
            <span className="text-gray-500 dark:text-[var(--foreground-subtle)] mb-2 sm:mb-3 font-medium text-base sm:text-lg">{part.unit}</span>
            {lowStock && (
              <span className="ml-auto text-sm text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-2 px-5 py-2.5 bg-amber-50 dark:bg-amber-500/10 rounded-xl">
                <AlertTriangle className="w-4 h-4" /> 库存不足
              </span>
            )}
          </div>
          {part.minStock > 0 && (
            <div className="mt-6">
              <div className="w-full h-4 bg-gray-100 dark:bg-[var(--background-muted)] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    lowStock 
                      ? "bg-gradient-to-r from-red-500 to-rose-500" 
                      : "bg-gradient-to-r from-emerald-500 to-green-500"
                  }`}
                  style={{ width: `${stockPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-400 dark:text-[var(--foreground-subtle)] font-medium">
                  最低库存: {part.minStock} {part.unit}
                </p>
                <p className="text-sm text-gray-400 dark:text-[var(--foreground-subtle)] font-medium">
                  {lowStock ? `缺少 ${part.minStock - qty} ${part.unit}` : "库存充足"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail info card */}
      <div className="bg-white dark:bg-[var(--card)] rounded-2xl border border-gray-200/80 dark:border-[var(--card-border)] p-10 section shadow-sm dark:shadow-black/20">
        <div className="flex items-center gap-5 mb-8">
          <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-[var(--background-muted)] flex items-center justify-center">
            <Tag className="w-5 h-5 text-gray-500 dark:text-[var(--foreground-subtle)]" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-[var(--card-foreground)]">器件信息</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {fields.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.label} className="flex items-center gap-5 p-5 rounded-xl hover:bg-gray-50 dark:hover:bg-[var(--background-subtle)] transition-colors duration-200">
                <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-[var(--background-muted)] flex items-center justify-center shrink-0">
                  <Icon className="w-6 h-6 text-gray-500 dark:text-[var(--foreground-subtle)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 dark:text-[var(--foreground-subtle)] font-medium mb-1">{f.label}</p>
                  <p className={`text-sm font-semibold text-gray-900 dark:text-[var(--card-foreground)] truncate ${f.mono ? "font-mono" : ""}`}>
                    {f.value || "-"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Movements history */}
      <div className="bg-white dark:bg-[var(--card)] rounded-2xl border border-gray-200/80 dark:border-[var(--card-border)] overflow-hidden shadow-sm dark:shadow-black/20">
        <div className="px-10 py-8 border-b border-gray-100 dark:border-[var(--card-border)] flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-[var(--background-muted)] flex items-center justify-center">
              <Activity className="w-5 h-5 text-gray-500 dark:text-[var(--foreground-subtle)]" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-[var(--card-foreground)]">操作记录</h2>
          </div>
          <span className="text-sm text-gray-400 dark:text-[var(--foreground-subtle)] font-medium flex items-center gap-2 px-5 py-2.5 bg-gray-50 dark:bg-[var(--background-subtle)] rounded-xl">
            <Clock className="w-4 h-4" /> {part.movements.length} 条
          </span>
        </div>
        {part.movements.length === 0 ? (
          <div className="p-20 text-center">
            <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gray-100 dark:bg-[var(--background-muted)] flex items-center justify-center">
              <Clock className="w-8 h-8 text-gray-400 dark:text-[var(--foreground-subtle)]" />
            </div>
            <p className="text-gray-500 dark:text-[var(--foreground-muted)] font-medium">暂无操作记录</p>
            <p className="text-gray-400 dark:text-[var(--foreground-subtle)] text-sm mt-1">入库或出库操作后，记录将显示在这里</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-[var(--card-border)]">
            {part.movements.map((m) => (
              <div
                key={m.id}
                className="px-10 py-6 flex items-center justify-between hover:bg-gray-50/80 dark:hover:bg-[var(--background-subtle)] transition-colors duration-150"
              >
                <div className="flex items-center gap-6">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      m.type === "IN"
                        ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : m.type === "OUT"
                        ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                        : "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    }`}
                  >
                    {m.type === "IN" ? <TrendingDown className="w-5 h-5" /> : m.type === "OUT" ? <TrendingUp className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-[var(--card-foreground)]">
                      {m.type === "IN" ? "入库" : m.type === "OUT" ? "出库" : "调整"}{" "}
                      <span className="font-bold">{m.quantity} {part.unit}</span>
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {m.reason && <span className="text-xs text-gray-400 dark:text-[var(--foreground-subtle)]">{m.reason}</span>}
                      {m.operator && <span className="text-xs text-gray-400 dark:text-[var(--foreground-subtle)]">· {m.operator}</span>}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-400 dark:text-[var(--foreground-subtle)] shrink-0 font-medium">
                  {new Date(m.createdAt).toLocaleString("zh-CN", {
                    month: "numeric",
                    day: "numeric",
                    hour: "numeric",
                    minute: "numeric"
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEdit && part && (
        <EditPartModal
          part={part}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false);
            fetchPart();
          }}
        />
      )}
    </div>
  );
}

function EditPartModal({ part, onClose, onSaved }: { part: PartDetail; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: part.code,
    name: part.name,
    category: part.category || "",
    package: part.package || "",
    brand: part.brand || "",
    model: part.model || "",
    unit: part.unit || "pcs",
    minStock: part.minStock || 0,
    location: part.location || "",
    note: part.note || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/parts/${part.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "保存失败");
        return;
      }
      onSaved();
    } catch (e) {
      console.error(e);
      alert("保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-[var(--card)] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl dark:shadow-black/40 border border-gray-200/80 dark:border-[var(--card-border)]">
        <div className="px-8 py-6 border-b border-gray-100 dark:border-[var(--card-border)] flex items-center justify-between sticky top-0 bg-white dark:bg-[var(--card)] z-10 rounded-t-2xl">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
              <Tag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[var(--card-foreground)]">编辑器件</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 text-gray-400 dark:text-[var(--foreground-subtle)] hover:text-gray-600 dark:hover:text-[var(--foreground-muted)] hover:bg-gray-100 dark:hover:bg-[var(--background-muted)] rounded-xl transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-[var(--foreground-muted)] mb-3">编码 *</label>
              <input
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="w-full px-5 py-4 bg-gray-50 dark:bg-[var(--background-subtle)] border border-gray-200 dark:border-[var(--card-border)] rounded-xl text-sm text-gray-900 dark:text-[var(--card-foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-[var(--card)] transition-all duration-200"
                placeholder="唯一编码"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-[var(--foreground-muted)] mb-3">名称 *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-5 py-4 bg-gray-50 dark:bg-[var(--background-subtle)] border border-gray-200 dark:border-[var(--card-border)] rounded-xl text-sm text-gray-900 dark:text-[var(--card-foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-[var(--card)] transition-all duration-200"
                placeholder="器件名称"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-[var(--foreground-muted)] mb-3">分类</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-5 py-4 bg-gray-50 dark:bg-[var(--background-subtle)] border border-gray-200 dark:border-[var(--card-border)] rounded-xl text-sm text-gray-900 dark:text-[var(--card-foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-[var(--card)] transition-all duration-200 cursor-pointer"
              >
                <option value="">选择分类</option>
                <option value="电阻">电阻</option>
                <option value="电容">电容</option>
                <option value="电感">电感</option>
                <option value="二极管">二极管</option>
                <option value="三极管">三极管</option>
                <option value="IC">IC</option>
                <option value="连接器">连接器</option>
                <option value="晶振">晶振</option>
                <option value="LED">LED</option>
                <option value="其他">其他</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-[var(--foreground-muted)] mb-3">封装</label>
              <input
                value={form.package}
                onChange={(e) => setForm({ ...form, package: e.target.value })}
                className="w-full px-5 py-4 bg-gray-50 dark:bg-[var(--background-subtle)] border border-gray-200 dark:border-[var(--card-border)] rounded-xl text-sm text-gray-900 dark:text-[var(--card-foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-[var(--card)] transition-all duration-200"
                placeholder="如 SOT-23, QFP-48"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-[var(--foreground-muted)] mb-3">品牌</label>
              <input
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                className="w-full px-5 py-4 bg-gray-50 dark:bg-[var(--background-subtle)] border border-gray-200 dark:border-[var(--card-border)] rounded-xl text-sm text-gray-900 dark:text-[var(--card-foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-[var(--card)] transition-all duration-200"
                placeholder="品牌"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-[var(--foreground-muted)] mb-3">型号</label>
              <input
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                className="w-full px-5 py-4 bg-gray-50 dark:bg-[var(--background-subtle)] border border-gray-200 dark:border-[var(--card-border)] rounded-xl text-sm text-gray-900 dark:text-[var(--card-foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-[var(--card)] transition-all duration-200"
                placeholder="型号"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-[var(--foreground-muted)] mb-3">单位</label>
              <input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full px-5 py-4 bg-gray-50 dark:bg-[var(--background-subtle)] border border-gray-200 dark:border-[var(--card-border)] rounded-xl text-sm text-gray-900 dark:text-[var(--card-foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-[var(--card)] transition-all duration-200"
                placeholder="pcs"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-[var(--foreground-muted)] mb-3">最低库存</label>
              <input
                type="number"
                min="0"
                value={form.minStock}
                onChange={(e) => setForm({ ...form, minStock: parseInt(e.target.value) || 0 })}
                className="w-full px-5 py-4 bg-gray-50 dark:bg-[var(--background-subtle)] border border-gray-200 dark:border-[var(--card-border)] rounded-xl text-sm text-gray-900 dark:text-[var(--card-foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-[var(--card)] transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-[var(--foreground-muted)] mb-3">仓位</label>
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full px-5 py-4 bg-gray-50 dark:bg-[var(--background-subtle)] border border-gray-200 dark:border-[var(--card-border)] rounded-xl text-sm text-gray-900 dark:text-[var(--card-foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-[var(--card)] transition-all duration-200"
                placeholder="如 A-1-03"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-[var(--foreground-muted)] mb-3">备注</label>
            <textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="w-full px-5 py-4 bg-gray-50 dark:bg-[var(--background-subtle)] border border-gray-200 dark:border-[var(--card-border)] rounded-xl text-sm text-gray-900 dark:text-[var(--card-foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-[var(--card)] transition-all duration-200 resize-none"
              rows={4}
              placeholder="备注信息"
            />
          </div>
          <div className="flex gap-4 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-5 py-4 border border-gray-200 dark:border-[var(--card-border)] rounded-xl text-sm font-semibold text-gray-700 dark:text-[var(--foreground-muted)] hover:bg-gray-50 dark:hover:bg-[var(--background-subtle)] hover:border-gray-300 dark:hover:border-[var(--card-border)] transition-all duration-200"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-5 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 dark:shadow-blue-500/10"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  保存中...
                </>
              ) : (
                "保存修改"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
