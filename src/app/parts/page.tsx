"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus, Search, Edit, Trash2, MapPin, X, Loader2, Package, ChevronLeft, ChevronRight, ChevronDown, Eye, Tag, Boxes, Filter, CheckSquare, Square, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import PackageInput from "@/components/PackageInput";

interface Part {
  id: string;
  code: string;
  name: string;
  category: string;
  package: string;
  brand: string;
  model: string;
  unit: string;
  location: string;
  minStock: number;
  stock?: { quantity: number };
}

interface PartsResponse {
  parts: Part[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

type SortField = "code" | "name" | "category" | "brand" | "stock" | "location";
type SortDirection = "asc" | "desc";

function PartsPageContent() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<PartsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get("q") || "");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [editPart, setEditPart] = useState<Part | null>(null);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const searchTimeoutRef = useRef<NodeJS.Timeout>(undefined);
  
  // Batch operations state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchMovement, setShowBatchMovement] = useState(false);
  const [batchMovementType, setBatchMovementType] = useState<"IN" | "OUT">("IN");
  const [batchProcessing, setBatchProcessing] = useState(false);
  
  // Advanced search state
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [brand, setBrand] = useState("");
  const [stockMin, setStockMin] = useState("");
  const [stockMax, setStockMax] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [hasStockOnly, setHasStockOnly] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<Array<{ name: string; params: Record<string, string> }>>([]);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  
  // Import/Export state
  const [showImportExport, setShowImportExport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedParts = data?.parts ? [...data.parts].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case "code":
        comparison = a.code.localeCompare(b.code);
        break;
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "category":
        comparison = (a.category || "").localeCompare(b.category || "");
        break;
      case "brand":
        comparison = (a.brand || "").localeCompare(b.brand || "");
        break;
      case "stock":
        comparison = (a.stock?.quantity ?? 0) - (b.stock?.quantity ?? 0);
        break;
      case "location":
        comparison = (a.location || "").localeCompare(b.location || "");
        break;
    }
    return sortDirection === "asc" ? comparison : -comparison;
  }) : [];

  // Search debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [search]);

  // Load search history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem("searchHistory");
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse search history", e);
      }
    }
    const savedSearchesData = localStorage.getItem("savedSearches");
    if (savedSearchesData) {
      try {
        setSavedSearches(JSON.parse(savedSearchesData));
      } catch (e) {
        console.error("Failed to parse saved searches", e);
      }
    }
  }, []);

  // Save search to history
  const addToSearchHistory = (term: string) => {
    if (!term.trim()) return;
    const newHistory = [term, ...searchHistory.filter(h => h !== term)].slice(0, 10);
    setSearchHistory(newHistory);
    localStorage.setItem("searchHistory", JSON.stringify(newHistory));
  };

  // Save current search
  const saveCurrentSearch = () => {
    const name = prompt("请输入搜索名称:");
    if (!name) return;
    const params: Record<string, string> = {};
    if (search) params.q = search;
    if (category) params.category = category;
    if (brand) params.brand = brand;
    if (stockMin) params.stockMin = stockMin;
    if (stockMax) params.stockMax = stockMax;
    if (lowStockOnly) params.lowStock = "true";
    if (hasStockOnly) params.hasStock = "true";
    
    const newSaved = [...savedSearches, { name, params }];
    setSavedSearches(newSaved);
    localStorage.setItem("savedSearches", JSON.stringify(newSaved));
  };

  // Load saved search
  const loadSavedSearch = (saved: { name: string; params: Record<string, string> }) => {
    setSearch(saved.params.q || "");
    setCategory(saved.params.category || "");
    setBrand(saved.params.brand || "");
    setStockMin(saved.params.stockMin || "");
    setStockMax(saved.params.stockMax || "");
    setLowStockOnly(saved.params.lowStock === "true");
    setHasStockOnly(saved.params.hasStock === "true");
    setPage(1);
  };

  // Delete saved search
  const deleteSavedSearch = (index: number) => {
    const newSaved = savedSearches.filter((_, i) => i !== index);
    setSavedSearches(newSaved);
    localStorage.setItem("savedSearches", JSON.stringify(newSaved));
  };

  // Export data
  const handleExport = async (format: "csv" | "json") => {
    try {
      const res = await fetch(`/api/export?format=${format}&type=parts`);
      if (format === "csv") {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `parts_${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `parts_${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error(e);
      alert("导出失败");
    }
  };

  // Import data
  const handleImport = async (file: File) => {
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "parts");
      
      const res = await fetch("/api/export", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      
      if (res.ok) {
        setImportResult({ success: true, message: result.message });
        fetchParts();
      } else {
        setImportResult({ success: false, message: result.error });
      }
    } catch (e) {
      console.error(e);
      setImportResult({ success: false, message: "导入失败" });
    } finally {
      setImporting(false);
    }
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearch("");
    setCategory("");
    setBrand("");
    setStockMin("");
    setStockMax("");
    setLowStockOnly(false);
    setHasStockOnly(false);
    setPage(1);
  };

  // Check if any filter is active
  const hasActiveFilters = search || category || brand || stockMin || stockMax || lowStockOnly || hasStockOnly;

  const fetchParts = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (category) params.set("category", category);
    if (brand) params.set("brand", brand);
    if (stockMin) params.set("stockMin", stockMin);
    if (stockMax) params.set("stockMax", stockMax);
    if (lowStockOnly) params.set("lowStock", "true");
    if (hasStockOnly) params.set("hasStock", "true");
    params.set("page", String(page));
    params.set("pageSize", "20");

    try {
      const res = await fetch(`/api/parts?${params}`, { signal });
      const json = await res.json();
      setData(json);
    } catch (e) {
      if (e instanceof Error && e.name !== 'AbortError') {
        console.error(e);
      }
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, category, brand, stockMin, stockMax, lowStockOnly, hasStockOnly, page]);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchParts(controller.signal);
    return () => controller.abort();
  }, [fetchParts]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定删除器件"${name}"？此操作不可撤销。`)) return;
    try {
      await fetch(`/api/parts/${id}`, { method: "DELETE" });
      fetchParts();
    } catch (e) {
      console.error(e);
      alert("删除失败");
    }
  };

  // Batch selection helpers
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedParts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedParts.map(p => p.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Batch delete
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`确定删除选中的 ${selectedIds.size} 个器件？此操作不可撤销。`)) return;

    setBatchProcessing(true);
    try {
      const res = await fetch("/api/parts/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          ids: Array.from(selectedIds),
        }),
      });
      const result = await res.json();
      if (res.ok) {
        alert(result.message);
        clearSelection();
        fetchParts();
      } else {
        alert(result.error || "批量删除失败");
      }
    } catch (e) {
      console.error(e);
      alert("批量删除失败");
    } finally {
      setBatchProcessing(false);
    }
  };

  // Batch movement (stock in/out)
  const handleBatchMovement = async (items: Array<{ partId: string; quantity: number }>) => {
    setBatchProcessing(true);
    try {
      const res = await fetch("/api/parts/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "movement",
          items,
          type: batchMovementType,
          operator: "管理员",
          reason: `批量${batchMovementType === "IN" ? "入库" : "出库"}`,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        alert(result.message);
        setShowBatchMovement(false);
        clearSelection();
        fetchParts();
      } else {
        alert(result.error || "批量操作失败");
      }
    } catch (e) {
      console.error(e);
      alert("批量操作失败");
    } finally {
      setBatchProcessing(false);
    }
  };

  // Batch backfill images - removed (images now stored as remote URLs)

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 section">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <Boxes className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-[var(--card-foreground)] tracking-tight">器件列表</h1>
            <p className="text-gray-500 dark:text-[var(--foreground-subtle)] mt-1">共 {data?.total ?? 0} 个器件</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImportExport(true)}
            className="inline-flex items-center gap-2 px-5 py-3.5 border border-gray-200 dark:border-[var(--card-border)] text-gray-700 dark:text-[var(--foreground-muted)] rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-[var(--background-subtle)] hover:border-gray-300 transition-all duration-200"
          >
            <ArrowDownToLine className="w-4 h-4" /> 导入/导出
          </button>
          <button
            onClick={() => { setEditPart(null); setShowAdd(true); }}
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30"
          >
            <Plus className="w-5 h-5" /> 新增器件
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white dark:bg-[var(--card)] rounded-2xl border border-gray-200/80 dark:border-[var(--card-border)] p-6 section shadow-sm dark:shadow-none">
        <div className="flex flex-col sm:flex-row gap-5">
          <div className="flex-1 relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-[var(--foreground-subtle)]" />
            <input
              type="text"
              placeholder="搜索名称、编码、品牌、型号、仓位..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              onFocus={() => setShowSearchHistory(true)}
              onBlur={() => setTimeout(() => setShowSearchHistory(false), 200)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && search.trim()) {
                  addToSearchHistory(search);
                }
              }}
              className="w-full pl-14 pr-14 py-4 bg-gray-50 dark:bg-[var(--background-subtle)] border border-gray-200 dark:border-[var(--card-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-[var(--card)] transition-all duration-200"
            />
            {search && (
              <button
                onClick={() => { setSearch(""); setPage(1); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 dark:text-[var(--foreground-subtle)] hover:text-gray-600 dark:hover:text-[var(--foreground-muted)] hover:bg-gray-100 dark:hover:bg-[var(--background-muted)] rounded-lg transition-all duration-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            
            {/* Search History Dropdown */}
            {showSearchHistory && searchHistory.length > 0 && !search && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[var(--card)] border border-gray-200 dark:border-[var(--card-border)] rounded-xl shadow-lg dark:shadow-black/20 z-20 overflow-hidden">
                <div className="px-4 py-2 bg-gray-50 dark:bg-[var(--background-subtle)] border-b border-gray-100 dark:border-[var(--card-border)] flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 dark:text-[var(--foreground-subtle)] uppercase">搜索历史</span>
                  <button
                    onClick={() => {
                      setSearchHistory([]);
                      localStorage.removeItem("searchHistory");
                    }}
                    className="text-xs text-gray-400 dark:text-[var(--foreground-subtle)] hover:text-red-500"
                  >
                    清除
                  </button>
                </div>
                {searchHistory.map((term, i) => (
                  <button
                    key={i}
                    onClick={() => { setSearch(term); setShowSearchHistory(false); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-[var(--foreground-muted)] hover:bg-gray-50 dark:hover:bg-[var(--background-subtle)] flex items-center gap-2"
                  >
                    <Search className="w-3.5 h-3.5 text-gray-400 dark:text-[var(--foreground-subtle)]" />
                    {term}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Filter className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-[var(--foreground-subtle)] pointer-events-none" />
              <select
                value={category}
                onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                className="pl-14 pr-14 py-4 border border-gray-200 dark:border-[var(--card-border)] rounded-xl text-sm bg-gray-50 dark:bg-[var(--background-subtle)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-[var(--card)] transition-all duration-200 cursor-pointer appearance-none min-w-[180px]"
              >
                <option value="">全部分类</option>
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
              <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[var(--foreground-subtle)] pointer-events-none" />
            </div>
            
            <button
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              className={`px-5 py-4 border rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                showAdvancedSearch || hasActiveFilters
                  ? "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400"
                  : "bg-gray-50 dark:bg-[var(--background-subtle)] border-gray-200 dark:border-[var(--card-border)] text-gray-600 dark:text-[var(--foreground-muted)] hover:bg-gray-100 dark:hover:bg-[var(--background-muted)]"
              }`}
            >
              <Filter className="w-4 h-4" />
              高级筛选
              {hasActiveFilters && (
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              )}
            </button>
          </div>
        </div>
        
        {/* Advanced Search Panel */}
        {showAdvancedSearch && (
          <div className="mt-5 pt-5 border-t border-gray-100 dark:border-[var(--card-border)] animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-[var(--foreground-subtle)] uppercase mb-2">品牌</label>
                <input
                  type="text"
                  placeholder="筛选品牌"
                  value={brand}
                  onChange={(e) => { setBrand(e.target.value); setPage(1); }}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[var(--background-subtle)] border border-gray-200 dark:border-[var(--card-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-[var(--card)] transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-[var(--foreground-subtle)] uppercase mb-2">库存范围</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="最小"
                    min="0"
                    value={stockMin}
                    onChange={(e) => { setStockMin(e.target.value); setPage(1); }}
                    className="w-full px-3 py-3 bg-gray-50 dark:bg-[var(--background-subtle)] border border-gray-200 dark:border-[var(--card-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-[var(--card)] transition-all duration-200"
                  />
                  <span className="text-gray-400 dark:text-[var(--foreground-subtle)]">-</span>
                  <input
                    type="number"
                    placeholder="最大"
                    min="0"
                    value={stockMax}
                    onChange={(e) => { setStockMax(e.target.value); setPage(1); }}
                    className="w-full px-3 py-3 bg-gray-50 dark:bg-[var(--background-subtle)] border border-gray-200 dark:border-[var(--card-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-[var(--card)] transition-all duration-200"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-[var(--foreground-subtle)] uppercase mb-2">库存状态</label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lowStockOnly}
                      onChange={(e) => { setLowStockOnly(e.target.checked); setPage(1); }}
                      className="w-4 h-4 text-blue-600 border-gray-300 dark:border-[var(--card-border)] rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-[var(--foreground-muted)]">仅低库存</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasStockOnly}
                      onChange={(e) => { setHasStockOnly(e.target.checked); setPage(1); }}
                      className="w-4 h-4 text-blue-600 border-gray-300 dark:border-[var(--card-border)] rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-[var(--foreground-muted)]">仅有库存</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-[var(--foreground-subtle)] uppercase mb-2">操作</label>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={saveCurrentSearch}
                    className="px-4 py-2.5 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all duration-200"
                  >
                    保存当前搜索
                  </button>
                  <button
                    onClick={clearAllFilters}
                    className="px-4 py-2.5 bg-gray-50 dark:bg-[var(--background-subtle)] text-gray-700 dark:text-[var(--foreground-muted)] rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-[var(--background-muted)] transition-all duration-200"
                  >
                    清除所有筛选
                  </button>
                </div>
              </div>
            </div>
            
            {/* Saved Searches */}
            {savedSearches.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-[var(--card-border)]">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold text-gray-500 dark:text-[var(--foreground-subtle)] uppercase">已保存的搜索</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {savedSearches.map((saved, i) => (
                    <div key={i} className="flex items-center gap-1 px-3 py-2 bg-gray-50 dark:bg-[var(--background-subtle)] border border-gray-200 dark:border-[var(--card-border)] rounded-lg">
                      <button
                        onClick={() => loadSavedSearch(saved)}
                        className="text-sm text-gray-700 dark:text-[var(--foreground-muted)] hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        {saved.name}
                      </button>
                      <button
                        onClick={() => deleteSavedSearch(i)}
                        className="ml-1 text-gray-400 dark:text-[var(--foreground-subtle)] hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Active Filters Display */}
        {hasActiveFilters && !showAdvancedSearch && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-[var(--card-border)] flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-500 dark:text-[var(--foreground-subtle)]">当前筛选:</span>
            {search && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-lg text-xs">
                搜索: {search}
                <button onClick={() => setSearch("")} className="hover:text-blue-900 dark:hover:text-blue-300">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {category && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-lg text-xs">
                分类: {category}
                <button onClick={() => setCategory("")} className="hover:text-blue-900 dark:hover:text-blue-300">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {brand && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-lg text-xs">
                品牌: {brand}
                <button onClick={() => setBrand("")} className="hover:text-blue-900 dark:hover:text-blue-300">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {lowStockOnly && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-lg text-xs">
                低库存
                <button onClick={() => setLowStockOnly(false)} className="hover:text-amber-900 dark:hover:text-amber-300">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {hasStockOnly && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs">
                有库存
                <button onClick={() => setHasStockOnly(false)} className="hover:text-emerald-900 dark:hover:text-emerald-300">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="text-xs text-gray-500 dark:text-[var(--foreground-subtle)] hover:text-red-500 ml-2"
            >
              清除全部
            </button>
          </div>
        )}
      </div>

      {/* Batch Operations Toolbar */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-2xl p-4 section flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
              <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
              已选择 <span className="font-bold">{selectedIds.size}</span> 个器件
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setBatchMovementType("IN"); setShowBatchMovement(true); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-all duration-200 shadow-sm"
            >
              <ArrowDownToLine className="w-4 h-4" /> 批量入库
            </button>
            <button
              onClick={() => { setBatchMovementType("OUT"); setShowBatchMovement(true); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-700 transition-all duration-200 shadow-sm"
            >
              <ArrowUpFromLine className="w-4 h-4" /> 批量出库
            </button>
            <button
              onClick={handleBatchDelete}
              disabled={batchProcessing}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-all duration-200 shadow-sm disabled:opacity-50"
            >
              {batchProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              批量删除
            </button>
            <button
              onClick={clearSelection}
              className="px-4 py-2.5 text-gray-600 dark:text-[var(--foreground-muted)] hover:text-gray-900 dark:hover:text-[var(--card-foreground)] hover:bg-white dark:hover:bg-[var(--card)] rounded-xl text-sm font-medium transition-all duration-200"
            >
              取消选择
            </button>
          </div>
        </div>
      )}

      {/* Parts list */}
      <div className="bg-white dark:bg-[var(--card)] rounded-2xl border border-gray-200/80 dark:border-[var(--card-border)] overflow-hidden shadow-sm dark:shadow-none">
        {loading ? (
          <div className="p-16 text-center">
            <div className="relative mx-auto w-12 h-12 mb-4">
              <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin" />
              <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-blue-600 rounded-full animate-spin" />
            </div>
            <p className="text-gray-500 dark:text-[var(--foreground-subtle)] text-sm font-medium">加载中...</p>
          </div>
        ) : data?.parts.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-[var(--background-muted)] flex items-center justify-center">
              <Package className="w-8 h-8 text-gray-400 dark:text-[var(--foreground-subtle)]" />
            </div>
            <p className="text-gray-500 dark:text-[var(--foreground-subtle)] font-medium">暂无器件</p>
            <p className="text-gray-400 dark:text-[var(--foreground-subtle)] text-sm mt-1">点击下方按钮添加第一个器件</p>
            <button
              onClick={() => { setEditPart(null); setShowAdd(true); }}
              className="mt-4 inline-flex items-center gap-2 px-5 py-3 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl text-sm font-medium transition-all duration-200"
            >
              <Plus className="w-4 h-4" /> 添加器件
            </button>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto max-h-[calc(100vh-320px)] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50/80 dark:bg-[var(--background-subtle)] border-b border-gray-200 dark:border-[var(--card-border)]">
                    <th className="px-4 py-5 text-left">
                      <button
                        onClick={toggleSelectAll}
                        className="p-1 text-gray-400 dark:text-[var(--foreground-subtle)] hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        {selectedIds.size === sortedParts.length && sortedParts.length > 0 ? (
                          <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    </th>
                    <th 
                      className="px-8 py-5 text-left text-xs font-semibold text-gray-500 dark:text-[var(--foreground-subtle)] uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-[var(--background-muted)] transition-colors"
                      onClick={() => handleSort("code")}
                    >
                      <div className="flex items-center">
                        编码
                        {sortField === "code" && (
                          <span className="ml-1 text-blue-600 dark:text-blue-400">{sortDirection === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-[var(--foreground-subtle)] uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-[var(--background-muted)] transition-colors"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center">
                        名称
                        {sortField === "name" && (
                          <span className="ml-1 text-blue-600 dark:text-blue-400">{sortDirection === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-[var(--foreground-subtle)] uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-[var(--background-muted)] transition-colors"
                      onClick={() => handleSort("category")}
                    >
                      <div className="flex items-center">
                        分类
                        {sortField === "category" && (
                          <span className="ml-1 text-blue-600 dark:text-blue-400">{sortDirection === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-[var(--foreground-subtle)] uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-[var(--background-muted)] transition-colors"
                      onClick={() => handleSort("brand")}
                    >
                      <div className="flex items-center">
                        品牌
                        {sortField === "brand" && (
                          <span className="ml-1 text-blue-600 dark:text-blue-400">{sortDirection === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-[var(--foreground-subtle)] uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-[var(--background-muted)] transition-colors"
                      onClick={() => handleSort("stock")}
                    >
                      <div className="flex items-center">
                        库存
                        {sortField === "stock" && (
                          <span className="ml-1 text-blue-600 dark:text-blue-400">{sortDirection === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-8 py-5 text-left text-xs font-semibold text-gray-500 dark:text-[var(--foreground-subtle)] uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-[var(--background-muted)] transition-colors"
                      onClick={() => handleSort("location")}
                    >
                      <div className="flex items-center">
                        仓位
                        {sortField === "location" && (
                          <span className="ml-1 text-blue-600 dark:text-blue-400">{sortDirection === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </th>
                    <th className="px-8 py-5 text-right text-xs font-semibold text-gray-500 dark:text-[var(--foreground-subtle)] uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[var(--card-border)]">
                  {sortedParts.map((part) => {
                    const qty = part.stock?.quantity ?? 0;
                    const lowStock = part.minStock > 0 && qty < part.minStock;
                    const isSelected = selectedIds.has(part.id);
                    return (
                      <tr key={part.id} className={`hover:bg-gray-50/80 dark:hover:bg-[var(--background-subtle)] transition-colors duration-150 ${isSelected ? 'bg-blue-50/50 dark:bg-blue-500/10' : ''}`}>
                        <td className="px-4 py-5">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleSelect(part.id); }}
                            className="p-1 text-gray-400 dark:text-[var(--foreground-subtle)] hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>
                        </td>
                        <td className="px-8 py-5">
                          <Link href={`/parts/${part.id}`} className="font-mono text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline font-medium">
                            {part.code}
                          </Link>
                        </td>
                        <td className="px-8 py-5">
                          <Link href={`/parts/${part.id}`} className="text-sm font-semibold text-gray-900 dark:text-[var(--card-foreground)] hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200">
                            {part.name}
                          </Link>
                        </td>
                        <td className="px-8 py-5">
                          {part.category && (
                            <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400">
                              {part.category}
                            </span>
                          )}
                        </td>
                        <td className="px-8 py-5 text-sm text-gray-600 dark:text-[var(--foreground-muted)]">{part.brand || "-"}</td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${lowStock ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-[var(--card-foreground)]"}`}>
                              {qty}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-[var(--foreground-subtle)]">{part.unit}</span>
                            {lowStock && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400">
                                低
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          {part.location ? (
                            <span className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-[var(--foreground-muted)]">
                              <MapPin className="w-3.5 h-3.5 text-gray-400 dark:text-[var(--foreground-subtle)]" />
                              {part.location}
                            </span>
                          ) : <span className="text-gray-400 dark:text-[var(--foreground-subtle)]">-</span>}
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/parts/${part.id}`}
                              className="p-2.5 text-gray-400 dark:text-[var(--foreground-subtle)] hover:text-gray-600 dark:hover:text-[var(--foreground-muted)] hover:bg-gray-100 dark:hover:bg-[var(--background-muted)] rounded-lg transition-all duration-200"
                              title="查看详情"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => { setEditPart(part); setShowAdd(true); }}
                              className="p-2.5 text-gray-400 dark:text-[var(--foreground-subtle)] hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all duration-200"
                              title="编辑"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(part.id, part.name)}
                              className="p-2 text-gray-400 dark:text-[var(--foreground-subtle)] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all duration-200"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile list */}
            <div className="md:hidden divide-y divide-gray-100 dark:divide-[var(--card-border)]">
              {data?.parts.map((part) => {
                const qty = part.stock?.quantity ?? 0;
                const lowStock = part.minStock > 0 && qty < part.minStock;
                return (
                  <Link key={part.id} href={`/parts/${part.id}`} className="block p-6 hover:bg-gray-50/80 dark:hover:bg-[var(--background-subtle)] transition-colors duration-150">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-[var(--card-foreground)] truncate">{part.name}</p>
                        <p className="text-xs text-gray-500 dark:text-[var(--foreground-subtle)] font-mono mt-1">{part.code}</p>
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          {part.category && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400">
                              {part.category}
                            </span>
                          )}
                          {part.location && (
                            <span className="inline-flex items-center gap-0.5 text-xs text-gray-500 dark:text-[var(--foreground-subtle)]">
                              <MapPin className="w-3 h-3" /> {part.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className={`text-lg font-bold ${lowStock ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-[var(--card-foreground)]"}`}>
                          {qty}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-[var(--foreground-subtle)]">{part.unit}</p>
                        {lowStock && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 mt-1">
                            低库存
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="px-8 py-5 border-t border-gray-100 dark:border-[var(--card-border)] flex items-center justify-between bg-gray-50/50 dark:bg-[var(--background-subtle)]">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-[var(--foreground-muted)] bg-white dark:bg-[var(--card)] border border-gray-200 dark:border-[var(--card-border)] rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-[var(--background-subtle)] hover:border-gray-300 transition-all duration-200"
                >
                  <ChevronLeft className="w-4 h-4" /> 上一页
                </button>
                <span className="text-sm text-gray-500 dark:text-[var(--foreground-subtle)] font-medium">
                  第 {page} / {data.totalPages} 页
                </span>
                <button
                  onClick={() => setPage(Math.min(data.totalPages, page + 1))}
                  disabled={page === data.totalPages}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-[var(--foreground-muted)] bg-white dark:bg-[var(--card)] border border-gray-200 dark:border-[var(--card-border)] rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-[var(--background-subtle)] hover:border-gray-300 transition-all duration-200"
                >
                  下一页 <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAdd && (
        <AddEditModal
          part={editPart}
          onClose={() => { setShowAdd(false); setEditPart(null); }}
          onSaved={() => { setShowAdd(false); setEditPart(null); fetchParts(); }}
        />
      )}

      {/* Batch Movement Modal */}
      {showBatchMovement && (
        <BatchMovementModal
          type={batchMovementType}
          parts={sortedParts.filter(p => selectedIds.has(p.id))}
          onClose={() => setShowBatchMovement(false)}
          onSubmit={handleBatchMovement}
          processing={batchProcessing}
        />
      )}

      {/* Import/Export Modal */}
      {showImportExport && (
        <ImportExportModal
          onClose={() => { setShowImportExport(false); setImportResult(null); }}
          onExport={handleExport}
          onImport={handleImport}
          importing={importing}
          importResult={importResult}
        />
      )}
    </div>
  );
}

export default function PartsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin" />
          <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-blue-600 rounded-full animate-spin" />
        </div>
      </div>
    }>
      <PartsPageContent />
    </Suspense>
  );
}

function AddEditModal({ part, onClose, onSaved }: { part: Part | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!part;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: part?.code || "",
    name: part?.name || "",
    category: part?.category || "",
    package: part?.package || "",
    brand: part?.brand || "",
    model: part?.model || "",
    unit: part?.unit || "pcs",
    minStock: part?.minStock || 0,
    location: part?.location || "",
    note: "",
  });

  useEffect(() => {
    if (!isEdit) {
      fetch("/api/parts/next-code")
        .then((res) => res.json())
        .then((data) => {
          if (data.code) setForm((prev) => ({ ...prev, code: data.code }));
        })
        .catch(() => {});
    }
  }, [isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = isEdit ? `/api/parts/${part.id}` : "/api/parts";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
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
      <div className="bg-white dark:bg-[var(--card)] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200/80 dark:border-[var(--card-border)]">
        <div className="px-8 py-6 border-b border-gray-100 dark:border-[var(--card-border)] flex items-center justify-between sticky top-0 bg-white dark:bg-[var(--card)] z-10 rounded-t-2xl">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
              <Tag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[var(--card-foreground)]">
              {isEdit ? "编辑器件" : "新增器件"}
            </h2>
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
                readOnly
                className="w-full px-5 py-4 bg-gray-100 dark:bg-[var(--background-muted)] border border-gray-200 dark:border-[var(--card-border)] rounded-xl text-sm text-gray-600 dark:text-[var(--foreground-muted)] cursor-not-allowed"
                placeholder="自动生成中..."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-[var(--foreground-muted)] mb-3">名称 *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-5 py-4 bg-gray-50 dark:bg-[var(--background-subtle)] border border-gray-200 dark:border-[var(--card-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-[var(--card)] transition-all duration-200"
                placeholder="器件名称"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-[var(--foreground-muted)] mb-3">分类</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-5 py-4 bg-gray-50 dark:bg-[var(--background-subtle)] border border-gray-200 dark:border-[var(--card-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-[var(--card)] transition-all duration-200 cursor-pointer"
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
              <PackageInput
                value={form.package}
                onChange={(val) => setForm({ ...form, package: val })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-[var(--foreground-muted)] mb-3">品牌</label>
              <input
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                className="w-full px-5 py-4 bg-gray-50 dark:bg-[var(--background-subtle)] border border-gray-200 dark:border-[var(--card-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-[var(--card)] transition-all duration-200"
                placeholder="品牌"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-[var(--foreground-muted)] mb-3">型号</label>
              <input
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                className="w-full px-5 py-4 bg-gray-50 dark:bg-[var(--background-subtle)] border border-gray-200 dark:border-[var(--card-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-[var(--card)] transition-all duration-200"
                placeholder="型号"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-[var(--foreground-muted)] mb-3">单位</label>
              <input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full px-5 py-4 bg-gray-50 dark:bg-[var(--background-subtle)] border border-gray-200 dark:border-[var(--card-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-[var(--card)] transition-all duration-200"
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
                className="w-full px-5 py-4 bg-gray-50 dark:bg-[var(--background-subtle)] border border-gray-200 dark:border-[var(--card-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-[var(--card)] transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-[var(--foreground-muted)] mb-3">仓位</label>
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full px-5 py-4 bg-gray-50 dark:bg-[var(--background-subtle)] border border-gray-200 dark:border-[var(--card-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-[var(--card)] transition-all duration-200"
                placeholder="如 A-1-03"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-[var(--foreground-muted)] mb-3">备注</label>
            <textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="w-full px-5 py-4 bg-gray-50 dark:bg-[var(--background-subtle)] border border-gray-200 dark:border-[var(--card-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-[var(--card)] transition-all duration-200 resize-none"
              rows={4}
              placeholder="备注信息"
            />
          </div>
          <div className="flex gap-4 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-5 py-4 border border-gray-200 dark:border-[var(--card-border)] rounded-xl text-sm font-semibold text-gray-700 dark:text-[var(--foreground-muted)] hover:bg-gray-50 dark:hover:bg-[var(--background-subtle)] hover:border-gray-300 transition-all duration-200"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-5 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  保存中...
                </>
              ) : (
                isEdit ? "保存修改" : "创建器件"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BatchMovementModal({
  type,
  parts,
  onClose,
  onSubmit,
  processing,
}: {
  type: "IN" | "OUT";
  parts: Part[];
  onClose: () => void;
  onSubmit: (items: Array<{ partId: string; quantity: number }>) => void;
  processing: boolean;
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(parts.map(p => [p.id, 1]))
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const items = parts
      .filter(p => quantities[p.id] > 0)
      .map(p => ({ partId: p.id, quantity: quantities[p.id] }));
    
    if (items.length === 0) {
      alert("请至少输入一个数量");
      return;
    }
    onSubmit(items);
  };

  const updateQuantity = (id: string, value: string) => {
    const num = parseInt(value) || 0;
    setQuantities(prev => ({ ...prev, [id]: Math.max(0, num) }));
  };

  return (
    <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-[var(--card)] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200/80 dark:border-[var(--card-border)]">
        <div className="px-8 py-6 border-b border-gray-100 dark:border-[var(--card-border)] flex items-center justify-between sticky top-0 bg-white dark:bg-[var(--card)] z-10 rounded-t-2xl">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${type === "IN" ? "bg-emerald-50 dark:bg-emerald-500/10" : "bg-amber-50 dark:bg-amber-500/10"}`}>
              {type === "IN" ? (
                <ArrowDownToLine className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <ArrowUpFromLine className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[var(--card-foreground)]">
              批量{type === "IN" ? "入库" : "出库"} - {parts.length} 个器件
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 text-gray-400 dark:text-[var(--foreground-subtle)] hover:text-gray-600 dark:hover:text-[var(--foreground-muted)] hover:bg-gray-100 dark:hover:bg-[var(--background-muted)] rounded-xl transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8">
          <div className="space-y-4 mb-8">
            {parts.map((part) => {
              const qty = part.stock?.quantity ?? 0;
              return (
                <div key={part.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-[var(--background-subtle)] rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-[var(--card-foreground)] truncate">{part.name}</p>
                    <p className="text-xs text-gray-500 dark:text-[var(--foreground-subtle)] font-mono">{part.code}</p>
                    <p className="text-xs text-gray-500 dark:text-[var(--foreground-subtle)] mt-1">当前库存: {qty} {part.unit}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQuantity(part.id, String(Math.max(0, (quantities[part.id] || 0) - 1)))}
                      className="w-8 h-8 flex items-center justify-center bg-white dark:bg-[var(--card)] border border-gray-200 dark:border-[var(--card-border)] rounded-lg text-gray-600 dark:text-[var(--foreground-muted)] hover:bg-gray-50 dark:hover:bg-[var(--background-subtle)]"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={quantities[part.id] || 0}
                      onChange={(e) => updateQuantity(part.id, e.target.value)}
                      className="w-20 px-3 py-2 bg-white dark:bg-[var(--card)] border border-gray-200 dark:border-[var(--card-border)] rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => updateQuantity(part.id, String((quantities[part.id] || 0) + 1))}
                      className="w-8 h-8 flex items-center justify-center bg-white dark:bg-[var(--card)] border border-gray-200 dark:border-[var(--card-border)] rounded-lg text-gray-600 dark:text-[var(--foreground-muted)] hover:bg-gray-50 dark:hover:bg-[var(--background-subtle)]"
                    >
                      +
                    </button>
                    <span className="text-sm text-gray-500 dark:text-[var(--foreground-subtle)] w-10">{part.unit}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-5 py-4 border border-gray-200 dark:border-[var(--card-border)] rounded-xl text-sm font-semibold text-gray-700 dark:text-[var(--foreground-muted)] hover:bg-gray-50 dark:hover:bg-[var(--background-subtle)] hover:border-gray-300 transition-all duration-200"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={processing}
              className={`flex-1 px-5 py-4 text-white rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg ${
                type === "IN"
                  ? "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-emerald-500/25"
                  : "bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 shadow-amber-500/25"
              }`}
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  处理中...
                </>
              ) : (
                `确认批量${type === "IN" ? "入库" : "出库"}`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ImportExportModal({
  onClose,
  onExport,
  onImport,
  importing,
  importResult,
}: {
  onClose: () => void;
  onExport: (format: "csv" | "json") => void;
  onImport: (file: File) => void;
  importing: boolean;
  importResult: { success: boolean; message: string } | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".csv")) {
      onImport(file);
    } else {
      alert("请上传 CSV 文件");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
    }
  };

  return (
    <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-[var(--card)] rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200/80 dark:border-[var(--card-border)]">
        <div className="px-8 py-6 border-b border-gray-100 dark:border-[var(--card-border)] flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-emerald-500/10 flex items-center justify-center">
              <ArrowDownToLine className="w-5 h-5 text-green-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[var(--card-foreground)]">导入/导出</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 text-gray-400 dark:text-[var(--foreground-subtle)] hover:text-gray-600 dark:hover:text-[var(--foreground-muted)] hover:bg-gray-100 dark:hover:bg-[var(--background-muted)] rounded-xl transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-8 space-y-6">
          {/* Export Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-[var(--foreground-muted)] mb-3">导出数据</h3>
            <div className="flex gap-3">
              <button
                onClick={() => onExport("csv")}
                className="flex-1 px-4 py-3 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-xl text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Package className="w-4 h-4" />
                导出 CSV
              </button>
              <button
                onClick={() => onExport("json")}
                className="flex-1 px-4 py-3 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 rounded-xl text-sm font-medium hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Package className="w-4 h-4" />
                导出 JSON
              </button>
            </div>
          </div>

          {/* Import Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-[var(--foreground-muted)] mb-3">导入数据</h3>
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                dragOver
                  ? "border-blue-400 bg-blue-50 dark:bg-blue-500/10"
                  : "border-gray-200 dark:border-[var(--card-border)] hover:border-gray-300"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <ArrowUpFromLine className="w-10 h-10 text-gray-400 dark:text-[var(--foreground-subtle)] mx-auto mb-3" />
              <p className="text-sm text-gray-600 dark:text-[var(--foreground-muted)] mb-2">
                拖拽 CSV 文件到此处，或
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
              >
                点击选择文件
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <p className="text-xs text-gray-400 dark:text-[var(--foreground-subtle)] mt-3">
                支持格式：CSV（编码, 名称, 分类, 封装, 品牌, 型号, 单位, 最低库存, 仓位, 备注）
              </p>
            </div>
          </div>

          {/* Import Result */}
          {importResult && (
            <div className={`p-4 rounded-xl ${
              importResult.success ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400"
            }`}>
              <p className="text-sm font-medium">{importResult.message}</p>
            </div>
          )}

          {/* Loading */}
          {importing && (
            <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">导入中...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
