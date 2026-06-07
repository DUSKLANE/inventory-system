"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowDownToLine, ArrowUpFromLine, Package, Plus, Trash2, Edit, Save, X, Search, Loader2, FileText, AlertTriangle } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import NumberInput from "@/components/NumberInput";

interface BomItem {
  id: string;
  partId: string;
  quantity: number;
  note: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
}

interface BomDetail {
  id: string;
  name: string;
  description: string;
  items: BomItem[];
}

interface Part {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  stock?: { quantity: number };
}

export default function BomDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [bom, setBom] = useState<BomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showAddPart, setShowAddPart] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Part[]>([]);
  const [searching, setSearching] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editItems, setEditItems] = useState<BomItem[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchBom = async () => {
    if (!params.id) return;
    try {
      const res = await fetch(`/api/boms/${params.id}`);
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        router.push("/boms");
        return;
      }
      setBom(data);
      setEditName(data.name);
      setEditDescription(data.description);
      setEditItems(data.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBom();
  }, [params.id]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/parts?q=${encodeURIComponent(searchQuery)}&pageSize=20`);
      const data = await res.json();
      setSearchResults(data.parts || []);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const addPartToBom = (part: Part) => {
    if (editItems.some(item => item.partId === part.id)) {
      alert("该器件已在BOM中");
      return;
    }
    setEditItems(prev => [...prev, {
      id: "",
      partId: part.id,
      quantity: 1,
      note: "",
      code: part.code,
      name: part.name,
      category: part.category,
      unit: part.unit,
      currentStock: part.stock?.quantity || 0,
    }]);
    setShowAddPart(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const removePartFromBom = (partId: string) => {
    setEditItems(prev => prev.filter(item => item.partId !== partId));
  };

  const updateItemQuantity = (partId: string, quantity: number | string) => {
    const qty = typeof quantity === "string" ? (parseInt(quantity) || 1) : quantity;
    setEditItems(prev => prev.map(item =>
      item.partId === partId ? { ...item, quantity: Math.max(1, qty) } : item
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/boms/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          description: editDescription,
          items: editItems.map(item => ({
            partId: item.partId,
            quantity: item.quantity,
            note: item.note,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "保存失败");
        return;
      }
      const data = await res.json();
      setBom(data);
      setEditing(false);
    } catch (e) {
      console.error(e);
      alert("保存失败");
    } finally {
      setSaving(false);
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

  if (!bom) return null;

  const displayItems = editing ? editItems : bom.items;

  return (
    <div className="page-container max-w-5xl">
      <Breadcrumb items={[
        { label: "BOM清单", href: "/boms" },
        { label: bom.name }
      ]} />

      {/* Header */}
      <div className="bg-white dark:bg-[var(--card)] rounded-2xl border border-gray-200/80 dark:border-[var(--card-border)] p-8 section shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="flex-1">
            {editing ? (
              <div className="space-y-4">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[var(--background-subtle)] border border-gray-200 dark:border-[var(--card-border)] rounded-xl text-lg font-semibold text-gray-900 dark:text-[var(--card-foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="BOM名称"
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[var(--background-subtle)] border border-gray-200 dark:border-[var(--card-border)] rounded-xl text-sm text-gray-900 dark:text-[var(--card-foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2}
                  placeholder="描述（可选）"
                />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-[var(--card-foreground)]">{bom.name}</h1>
                </div>
                {bom.description && (
                  <p className="text-gray-500 dark:text-[var(--foreground-subtle)] ml-15">{bom.description}</p>
                )}
              </>
            )}
          </div>
          <div className="flex gap-3">
            {editing ? (
              <>
                <button
                  onClick={() => { setEditing(false); setEditItems(bom.items || []); }}
                  className="px-5 py-3 border border-gray-200 dark:border-[var(--card-border)] text-gray-700 dark:text-[var(--foreground-muted)] rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-[var(--background-subtle)] transition-all"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  保存
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="px-5 py-3 border border-gray-200 dark:border-[var(--card-border)] text-gray-700 dark:text-[var(--foreground-muted)] rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-[var(--background-subtle)] transition-all flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" /> 编辑
                </button>
                <button
                  onClick={() => setShowAddPart(true)}
                  className="px-5 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> 添加器件
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* BOM Items */}
      <div className="bg-white dark:bg-[var(--card)] rounded-2xl border border-gray-200/80 dark:border-[var(--card-border)] overflow-hidden section shadow-sm">
        <div className="px-8 py-5 border-b border-gray-100 dark:border-[var(--card-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-gray-500 dark:text-[var(--foreground-subtle)]" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-[var(--card-foreground)]">器件列表</h2>
          </div>
          <span className="text-sm text-gray-500 dark:text-[var(--foreground-subtle)]">{displayItems.length} 个器件</span>
        </div>

        {displayItems.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-gray-300 dark:text-[var(--foreground-subtle)] mx-auto mb-3" />
            <p className="text-gray-500 dark:text-[var(--foreground-subtle)]">暂无器件</p>
            <p className="text-gray-400 dark:text-[var(--foreground-subtle)] text-sm mt-1">点击&quot;添加器件&quot;按钮添加</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-[var(--card-border)]">
            {displayItems.map((item) => {
              const stockStatus = item.currentStock >= item.quantity ? "sufficient" : "insufficient";
              return (
                <div key={item.partId} className="px-8 py-5 flex items-center gap-6">
                  <div className="flex-1 min-w-0">
                    <Link href={`/parts/${item.partId}`} className="text-sm font-semibold text-gray-900 dark:text-[var(--card-foreground)] hover:text-blue-600 dark:hover:text-blue-400">
                      {item.name}
                    </Link>
                    <p className="text-xs text-gray-500 dark:text-[var(--foreground-subtle)] font-mono mt-1">{item.code}</p>
                    {item.category && (
                      <span className="inline-block mt-2 px-2 py-0.5 bg-gray-100 dark:bg-[var(--background-muted)] text-gray-600 dark:text-[var(--foreground-muted)] rounded text-xs">
                        {item.category}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    {editing ? (
                      <NumberInput
                        value={String(item.quantity)}
                        onChange={(val) => updateItemQuantity(item.partId, val)}
                        min={1}
                        className="w-40"
                      />
                    ) : (
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900 dark:text-[var(--card-foreground)]">需要: {item.quantity} {item.unit}</p>
                        <p className={`text-xs ${stockStatus === "sufficient" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                          库存: {item.currentStock} {item.unit}
                          {stockStatus === "insufficient" && (
                            <span className="ml-1">
                              <AlertTriangle className="w-3 h-3 inline" /> 不足
                            </span>
                          )}
                        </p>
                      </div>
                    )}

                    {editing && (
                      <button
                        onClick={() => removePartFromBom(item.partId)}
                        className="p-2 text-gray-400 dark:text-[var(--foreground-subtle)] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Part Modal */}
      {showAddPart && (
        <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[var(--card)] rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200/80 dark:border-[var(--card-border)] max-h-[80vh] overflow-hidden flex flex-col">
            <div className="px-8 py-6 border-b border-gray-100 dark:border-[var(--card-border)] flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-[var(--card-foreground)]">添加器件到BOM</h2>
              <button
                onClick={() => { setShowAddPart(false); setSearchQuery(""); setSearchResults([]); }}
                className="p-2.5 text-gray-400 dark:text-[var(--foreground-subtle)] hover:text-gray-600 dark:hover:text-[var(--foreground-muted)] hover:bg-gray-100 dark:hover:bg-[var(--background-muted)] rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 border-b border-gray-100 dark:border-[var(--card-border)]">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-[var(--foreground-subtle)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-[var(--background-subtle)] border border-gray-200 dark:border-[var(--card-border)] rounded-xl text-sm text-gray-900 dark:text-[var(--card-foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="搜索器件名称或编码"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  className="px-5 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "搜索"}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {searchResults.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-[var(--foreground-subtle)]">
                  {searchQuery ? "未找到器件" : "输入关键词搜索器件"}
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-[var(--card-border)]">
                  {searchResults.map((part) => (
                    <button
                      key={part.id}
                      onClick={() => addPartToBom(part)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[var(--background-subtle)] transition-colors text-left"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-[var(--card-foreground)]">{part.name}</p>
                        <p className="text-xs text-gray-500 dark:text-[var(--foreground-subtle)] font-mono">{part.code}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500 dark:text-[var(--foreground-subtle)]">
                          库存: {part.stock?.quantity || 0} {part.unit}
                        </span>
                        <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
