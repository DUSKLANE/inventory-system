"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Package, Trash2, Edit, Eye, MapPin, Star, Loader2, X, Warehouse } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";

interface Warehouse {
  id: string;
  name: string;
  location: string;
  description: string;
  isDefault: number;
  partCount: number;
  totalStock: number;
  createdAt: string;
  updatedAt: string;
}

export default function WarehousesPage() {
  const router = useRouter();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const fetchWarehouses = async () => {
    try {
      const res = await fetch("/api/warehouses");
      const data = await res.json();
      setWarehouses(data.warehouses || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定删除仓库"${name}"？此操作不可撤销。`)) return;
    try {
      const res = await fetch(`/api/warehouses/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "删除失败");
        return;
      }
      fetchWarehouses();
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
            <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin" />
            <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-blue-600 rounded-full animate-spin" />
          </div>
          <p className="text-gray-500 text-sm font-medium">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Breadcrumb items={[{ label: "仓库管理" }]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 section">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/25">
            <Warehouse className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">仓库管理</h1>
            <p className="text-gray-500 mt-1">管理多个仓库库存</p>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30"
        >
          <Plus className="w-5 h-5" /> 新建仓库
        </button>
      </div>

      {/* Warehouse List */}
      {warehouses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-16 text-center section">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
            <Warehouse className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">暂无仓库</p>
          <p className="text-gray-400 text-sm mt-1">点击上方按钮创建第一个仓库</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 section">
          {warehouses.map((wh) => (
            <div
              key={wh.id}
              className="bg-white rounded-2xl border border-gray-200/80 p-6 hover:shadow-lg hover:border-gray-300 transition-all duration-200 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                  <Warehouse className="w-5 h-5 text-teal-600" />
                </div>
                <div className="flex items-center gap-1">
                  {wh.isDefault ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium">
                      <Star className="w-3 h-3 fill-amber-500" /> 默认
                    </span>
                  ) : null}
                  <button
                    onClick={() => handleDelete(wh.id, wh.name)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{wh.name}</h3>
              {wh.location && (
                <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
                  <MapPin className="w-4 h-4" />
                  {wh.location}
                </div>
              )}
              {wh.description && (
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{wh.description}</p>
              )}
              
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Package className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{wh.partCount} 种器件</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {wh.totalStock || 0} 件
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <AddWarehouseModal
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); fetchWarehouses(); }}
        />
      )}
    </div>
  );
}

function AddWarehouseModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("请输入仓库名称");
      return;
    }
    
    setSaving(true);
    try {
      const res = await fetch("/api/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, location, description, isDefault }),
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
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200/80">
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-xl font-semibold text-gray-900">新建仓库</h2>
          <button onClick={onClose} className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">名称 *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              placeholder="如：主仓库、A区仓库"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">位置</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              placeholder="仓库位置（可选）"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none"
              rows={3}
              placeholder="仓库描述（可选）"
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isDefault"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isDefault" className="text-sm text-gray-700">
              设为默认仓库
            </label>
          </div>
          <div className="flex gap-4 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-5 py-4 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
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
