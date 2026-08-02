"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus, Search, Edit, Trash2, MapPin, X, Loader2, Eye, Boxes, Filter, CheckSquare, Square, ArrowDownToLine, ArrowUpFromLine, Copy, Package } from "lucide-react";
import CategoryInput from "@/components/CategoryInput";
import NumberInput from "@/components/NumberInput";
import PartFormModal from "@/components/PartFormModal";
import { useToast } from "@/components/ToastProvider";
import { useConfirm } from "@/components/ConfirmProvider";
import Breadcrumb from "@/components/Breadcrumb";
import { PageHeader, Button, EmptyState, Spinner, Pagination, inputClass } from "@/components/ui";

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

type SortField = "code" | "name" | "category" | "brand" | "stock" | "location" | "updatedAt" | "createdAt";
type SortDirection = "asc" | "desc";

function PartsPageContent() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<PartsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get("q") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [showAdd, setShowAdd] = useState(false);
  const [editPart, setEditPart] = useState<Part | null>(null);
  const [sortField, setSortField] = useState<SortField>((searchParams.get("sortField") as SortField) || "name");
  const [sortDirection, setSortDirection] = useState<SortDirection>((searchParams.get("sortOrder") as SortDirection) || "asc");
  const [pageSize, setPageSize] = useState(Number(searchParams.get("pageSize")) || 20);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>(undefined);
  const { toast } = useToast();
  const confirm = useConfirm();
  
  // Batch operations state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchMovement, setShowBatchMovement] = useState(false);
  const [batchMovementType, setBatchMovementType] = useState<"IN" | "OUT">("IN");
  const [batchProcessing, setBatchProcessing] = useState(false);
  
  // Advanced search state
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [brand, setBrand] = useState(searchParams.get("brand") || "");
  const [stockMin, setStockMin] = useState(searchParams.get("stockMin") || "");
  const [stockMax, setStockMax] = useState(searchParams.get("stockMax") || "");
  const [lowStockOnly, setLowStockOnly] = useState(searchParams.get("lowStock") === "true");
  const [hasStockOnly, setHasStockOnly] = useState(searchParams.get("hasStock") === "true");
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<Array<{ name: string; params: Record<string, string> }>>([]);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [showSaveSearch, setShowSaveSearch] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState("");
  
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

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(`已复制${label}`, "success");
    } catch {
      toast("复制失败", "error");
    }
  };

  // Load preferences from settings
  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((s) => {
      if (s?.page_size && !searchParams.get("pageSize")) setPageSize(Number(s.page_size) || 20);
      if (s?.default_sort_field && !searchParams.get("sortField")) setSortField((s.default_sort_field as SortField) || "name");
      if (s?.default_sort_order && !searchParams.get("sortOrder")) setSortDirection((s.default_sort_order as SortDirection) || "asc");
    }).catch(() => {}).finally(() => setSettingsLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const router = useRouter();
  const firstRender = useRef(true);

  // Sync filter/sort/pagination state to URL
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (category) params.set("category", category);
    if (brand) params.set("brand", brand);
    if (stockMin) params.set("stockMin", stockMin);
    if (stockMax) params.set("stockMax", stockMax);
    if (lowStockOnly) params.set("lowStock", "true");
    if (hasStockOnly) params.set("hasStock", "true");
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    params.set("sortField", sortField);
    params.set("sortOrder", sortDirection);
    const t = setTimeout(() => {
      router.replace(`/parts?${params.toString()}`, { scroll: false });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, category, brand, stockMin, stockMax, lowStockOnly, hasStockOnly, page, pageSize, sortField, sortDirection]);

  // Restore filter/sort/pagination state from URL on browser back/forward
  useEffect(() => {
    const onPopState = () => {
      const sp = new URLSearchParams(window.location.search);
      setSearch(sp.get("q") || "");
      setDebouncedSearch(sp.get("q") || "");
      setCategory(sp.get("category") || "");
      setBrand(sp.get("brand") || "");
      setStockMin(sp.get("stockMin") || "");
      setStockMax(sp.get("stockMax") || "");
      setLowStockOnly(sp.get("lowStock") === "true");
      setHasStockOnly(sp.get("hasStock") === "true");
      setPage(Number(sp.get("page")) || 1);
      setPageSize(Number(sp.get("pageSize")) || 20);
      setSortField((sp.get("sortField") as SortField) || "name");
      setSortDirection((sp.get("sortOrder") as SortDirection) || "asc");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Search debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      if (search !== debouncedSearch) setPage(1);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setShowSaveSearch(true);
  };

  const confirmSaveSearch = () => {
    const name = saveSearchName.trim();
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
    setShowSaveSearch(false);
    setSaveSearchName("");
    toast("搜索条件已保存", "success");
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
      toast("导出失败", "error");
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
    params.set("pageSize", String(pageSize));
    params.set("sortField", sortField);
    params.set("sortOrder", sortDirection);

    try {
      const res = await fetch(`/api/parts?${params}`, { signal });
      if (!res.ok) throw new Error(`加载失败: ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      if (e instanceof Error && e.name !== 'AbortError') {
        console.error(e);
        toast("加载失败", "error");
      }
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, category, brand, stockMin, stockMax, lowStockOnly, hasStockOnly, page, pageSize, sortField, sortDirection, toast]);

  useEffect(() => {
    if (!settingsLoaded) return;
    const controller = new AbortController();
    fetchParts(controller.signal);
    return () => controller.abort();
  }, [fetchParts, settingsLoaded]);

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm({ title: "删除器件", message: `确定删除器件"${name}"？此操作不可撤销。`, danger: true });
    if (!ok) return;
    try {
      await fetch(`/api/parts/${id}`, { method: "DELETE" });
      fetchParts();
    } catch (e) {
      console.error(e);
      toast("删除失败", "error");
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
    if (!data) return;
    if (selectedIds.size === data.parts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.parts.map(p => p.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Batch delete
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    const ok = await confirm({ title: "批量删除", message: `确定删除选中的 ${selectedIds.size} 个器件？此操作不可撤销。`, danger: true });
    if (!ok) return;

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
        toast(result.message, "success");
        clearSelection();
        fetchParts();
      } else {
        toast(result.error || "批量删除失败", "error");
      }
    } catch (e) {
      console.error(e);
      toast("批量删除失败", "error");
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
          reason: `批量${batchMovementType === "IN" ? "入库" : "出库"}`,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        toast(result.message, "success");
        setShowBatchMovement(false);
        clearSelection();
        fetchParts();
      } else {
        toast(result.error || "批量操作失败", "error");
      }
    } catch (e) {
      console.error(e);
      toast("批量操作失败", "error");
    } finally {
      setBatchProcessing(false);
    }
  };

  // Batch backfill images - removed (images now stored as remote URLs)

  return (
    <div className="page-container">
      {/* Header */}
      <PageHeader
        breadcrumb={<Breadcrumb items={[{ label: "器件列表" }]} />}
        title="器件列表"
        subtitle="管理库存器件，支持高级搜索与批量出入库"
        actions={
          <>
            <Button variant="outline" onClick={() => setShowImportExport(true)}>
              <ArrowDownToLine className="w-4 h-4" />导入/导出
            </Button>
            <Button onClick={() => { setEditPart(null); setShowAdd(true); }}>
              <Plus className="w-4 h-4" />新增器件
            </Button>
          </>
        }
      />

      {/* Search & Filter */}
      <div className="bg-white dark:bg-[var(--card)] rounded-lg border border-gray-200/80 dark:border-[var(--card-border)] p-6 section shadow-sm dark:shadow-none">
        <div className="flex flex-col sm:flex-row gap-5">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[var(--foreground-subtle)]" />
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
              className={`${inputClass} pl-12 pr-10`}
            />
            {search && (
              <button
                onClick={() => { setSearch(""); setPage(1); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 dark:text-[var(--foreground-subtle)] hover:text-gray-600 dark:hover:text-[var(--foreground-muted)] hover:bg-gray-100 dark:hover:bg-[var(--background-muted)] rounded-lg transition-all duration-200"
                aria-label="清除搜索"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            
            {/* Search History Dropdown */}
            {showSearchHistory && searchHistory.length > 0 && !search && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[var(--card)] border border-gray-200 dark:border-[var(--card-border)] rounded-lg shadow-lg dark:shadow-black/20 z-20 overflow-hidden">
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
            <div className="relative min-w-[180px]">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[var(--foreground-subtle)] pointer-events-none z-10" />
              <CategoryInput
                value={category}
                onChange={(val) => { setCategory(val); setPage(1); }}
                placeholder="全部分类"
              />
            </div>
            
            <button
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              className={`px-5 py-2.5 border rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                showAdvancedSearch || hasActiveFilters
                  ? "bg-[var(--accent-subtle)] border-[var(--accent-muted)] text-[var(--accent)]"
                  : "bg-gray-50 dark:bg-[var(--background-subtle)] border-gray-200 dark:border-[var(--card-border)] text-gray-600 dark:text-[var(--foreground-muted)] hover:bg-gray-100 dark:hover:bg-[var(--background-muted)]"
              }`}
            >
              <Filter className="w-4 h-4" />
              高级筛选
              {hasActiveFilters && (
                <span className="w-2 h-2 bg-[var(--accent)] rounded-full"></span>
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
                  className={inputClass}
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
                    className={inputClass}
                  />
                  <span className="text-gray-400 dark:text-[var(--foreground-subtle)]">-</span>
                  <input
                    type="number"
                    placeholder="最大"
                    min="0"
                    value={stockMax}
                    onChange={(e) => { setStockMax(e.target.value); setPage(1); }}
                    className={inputClass}
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
                      className="w-4 h-4 text-blue-600 border-gray-300 dark:border-[var(--card-border)] rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-[var(--foreground-muted)]">仅低库存</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasStockOnly}
                      onChange={(e) => { setHasStockOnly(e.target.checked); setPage(1); }}
                      className="w-4 h-4 text-blue-600 border-gray-300 dark:border-[var(--card-border)] rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-[var(--foreground-muted)]">仅有库存</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-[var(--foreground-subtle)] uppercase mb-2">操作</label>
                <div className="flex flex-col gap-2">
                  <Button type="button" onClick={saveCurrentSearch} className="w-full justify-center">
                    保存当前搜索
                  </Button>
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
                        className="text-sm text-gray-700 dark:text-[var(--foreground-muted)] hover:text-[var(--accent)]"
                      >
                        {saved.name}
                      </button>
                      <button
                        onClick={() => deleteSavedSearch(i)}
                        className="ml-1 text-gray-400 dark:text-[var(--foreground-subtle)] hover:text-red-500"
                        aria-label="删除已保存搜索"
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
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--accent-subtle)] text-[var(--accent)] rounded-lg text-xs">
                搜索: {search}
                <button onClick={() => setSearch("")} className="hover:text-[var(--accent-hover)]" aria-label="清除搜索筛选">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {category && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--accent-subtle)] text-[var(--accent)] rounded-lg text-xs">
                分类: {category}
                <button onClick={() => setCategory("")} className="hover:text-[var(--accent-hover)]" aria-label="清除分类筛选">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {brand && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--accent-subtle)] text-[var(--accent)] rounded-lg text-xs">
                品牌: {brand}
                <button onClick={() => setBrand("")} className="hover:text-[var(--accent-hover)]" aria-label="清除品牌筛选">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {lowStockOnly && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-lg text-xs">
                低库存
                <button onClick={() => setLowStockOnly(false)} className="hover:text-amber-900 dark:hover:text-amber-300" aria-label="清除低库存筛选">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {hasStockOnly && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs">
                有库存
                <button onClick={() => setHasStockOnly(false)} className="hover:text-emerald-900 dark:hover:text-emerald-300" aria-label="清除有库存筛选">
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
        <div className="bg-[var(--accent-subtle)] border border-[var(--accent-muted)] rounded-lg p-4 section flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center">
              <CheckSquare className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <span className="text-sm font-medium text-[var(--accent)]">
              已选择 <span className="font-bold">{selectedIds.size}</span> 个器件
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="success"
              onClick={() => { setBatchMovementType("IN"); setShowBatchMovement(true); }}
            >
              <ArrowDownToLine className="w-4 h-4" /> 批量入库
            </Button>
            <Button
              variant="danger"
              onClick={() => { setBatchMovementType("OUT"); setShowBatchMovement(true); }}
            >
              <ArrowUpFromLine className="w-4 h-4" /> 批量出库
            </Button>
            <Button
              variant="danger"
              onClick={handleBatchDelete}
              disabled={batchProcessing}
            >
              {batchProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              批量删除
            </Button>
            <Button variant="ghost" onClick={clearSelection}>
              取消选择
            </Button>
          </div>
        </div>
      )}

      {/* Parts list */}
      <div className="bg-white dark:bg-[var(--card)] rounded-lg border border-gray-200/80 dark:border-[var(--card-border)] overflow-hidden shadow-sm dark:shadow-none">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : data?.parts.length === 0 ? (
          <EmptyState
            icon={<Boxes className="w-7 h-7 text-[var(--foreground-subtle)]" />}
            title="未找到器件"
            description="调整搜索条件或新增器件"
            action={
              <Button onClick={() => setShowAdd(true)} size="sm">
                <Plus className="w-4 h-4" />新增器件
              </Button>
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/80 dark:bg-[var(--background-subtle)] border-b border-gray-200 dark:border-[var(--card-border)]">
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={toggleSelectAll}
                        className="p-1 text-gray-400 dark:text-[var(--foreground-subtle)] hover:text-[var(--accent)] transition-colors"
                        aria-label="全选"
                      >
                        {selectedIds.size === (data?.parts ?? []).length && (data?.parts ?? []).length > 0 ? (
                          <CheckSquare className="w-5 h-5 text-[var(--accent)]" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    </th>
                    <th 
                      className="px-8 py-3 text-left text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-[var(--background-muted)] transition-colors"
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
                      className="px-6 py-3 text-left text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-[var(--background-muted)] transition-colors"
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
                      className="px-6 py-3 text-left text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-[var(--background-muted)] transition-colors"
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
                      className="px-6 py-3 text-left text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-[var(--background-muted)] transition-colors"
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
                      className="px-6 py-3 text-left text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-[var(--background-muted)] transition-colors"
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
                      className="px-8 py-3 text-left text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-[var(--background-muted)] transition-colors"
                      onClick={() => handleSort("location")}
                    >
                      <div className="flex items-center">
                        仓位
                        {sortField === "location" && (
                          <span className="ml-1 text-blue-600 dark:text-blue-400">{sortDirection === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </th>
                    <th className="px-8 py-3 text-right text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[var(--card-border)]">
                  {(data?.parts ?? []).map((part) => {
                    const qty = part.stock?.quantity ?? 0;
                    const lowStock = part.minStock > 0 && qty < part.minStock;
                    const isSelected = selectedIds.has(part.id);
                    return (
                      <tr key={part.id} className={`hover:bg-gray-50/80 dark:hover:bg-[var(--background-subtle)] transition-colors duration-150 ${isSelected ? 'bg-[var(--accent-subtle)]' : ''}`}>
                        <td className="px-4 py-5">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleSelect(part.id); }}
                            className="p-1 text-gray-400 dark:text-[var(--foreground-subtle)] hover:text-[var(--accent)] transition-colors"
                            aria-label="选择"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5 text-[var(--accent)]" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-1.5">
                            <Link href={`/parts/${part.id}`} className="font-mono text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline font-medium">
                              {part.code}
                            </Link>
                            <button
                              onClick={() => copyText(part.code, "编码")}
                              className="p-1 text-[var(--foreground-subtle)] hover:text-[var(--foreground)] hover:bg-gray-100 dark:hover:bg-[var(--background-muted)] rounded transition-colors"
                              title="复制编码"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-1.5">
                            <Link href={`/parts/${part.id}`} className="text-sm font-semibold text-gray-900 dark:text-[var(--card-foreground)] hover:text-[var(--accent)] transition-colors duration-200">
                              {part.name}
                            </Link>
                            <button
                              onClick={() => copyText(part.name, "名称")}
                              className="p-1 text-[var(--foreground-subtle)] hover:text-[var(--foreground)] hover:bg-gray-100 dark:hover:bg-[var(--background-muted)] rounded transition-colors"
                              title="复制名称"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          {part.category && (
                            <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-[var(--background-subtle)] text-[var(--foreground-muted)]">
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
                              className="p-2.5 text-gray-400 dark:text-[var(--foreground-subtle)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)] rounded-lg transition-all duration-200"
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
                const isSelected = selectedIds.has(part.id);
                return (
                  <div key={part.id} className={`p-6 flex items-start gap-3 transition-colors duration-150 ${isSelected ? "bg-[var(--accent-subtle)]" : ""}`}>
                    <button
                      onClick={() => toggleSelect(part.id)}
                      className="p-2 -ml-1 shrink-0 text-gray-400 dark:text-[var(--foreground-subtle)] hover:text-[var(--accent)] transition-colors"
                      aria-label="选择"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-[var(--accent)]" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>
                    <Link href={`/parts/${part.id}`} className="flex-1 min-w-0 block hover:bg-gray-50/80 dark:hover:bg-[var(--background-subtle)] transition-colors duration-150">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <p className="text-sm font-semibold text-gray-900 dark:text-[var(--card-foreground)] truncate">{part.name}</p>
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); copyText(part.name, "名称"); }}
                              className="p-0.5 text-[var(--foreground-subtle)] hover:text-[var(--foreground)] rounded shrink-0"
                              title="复制名称"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <p className="text-xs text-gray-500 dark:text-[var(--foreground-subtle)] font-mono">{part.code}</p>
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); copyText(part.code, "编码"); }}
                              className="p-0.5 text-[var(--foreground-subtle)] hover:text-[var(--foreground)] rounded shrink-0"
                              title="复制编码"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2 mt-3 flex-wrap">
                            {part.category && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium bg-[var(--background-subtle)] text-[var(--foreground-muted)]">
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
                  </div>
                );
              })}
              {(data?.parts ?? []).length > 0 && (
                <button
                  onClick={toggleSelectAll}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium text-gray-600 dark:text-[var(--foreground-muted)] hover:bg-gray-50 dark:hover:bg-[var(--background-subtle)] transition-colors duration-150"
                >
                  {selectedIds.size === (data?.parts ?? []).length ? (
                    <CheckSquare className="w-5 h-5 text-[var(--accent)]" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400 dark:text-[var(--foreground-subtle)]" />
                  )}
                  {selectedIds.size === (data?.parts ?? []).length ? "取消全选" : "全选"}
                </button>
              )}
            </div>

            {/* Pagination */}
            {data && (
              <Pagination
                page={page}
                totalPages={data.totalPages}
                total={data.total}
                pageSize={pageSize}
                onPageChange={(p) => setPage(p)}
                onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
              />
            )}
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAdd && (
        <PartFormModal
          part={editPart}
          onClose={() => { setShowAdd(false); setEditPart(null); }}
          onSaved={() => { setShowAdd(false); setEditPart(null); fetchParts(); }}
        />
      )}

      {/* Batch Movement Modal */}
      {showBatchMovement && (
        <BatchMovementModal
          type={batchMovementType}
          parts={(data?.parts ?? []).filter(p => selectedIds.has(p.id))}
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

      {/* Save Search Modal */}
      {showSaveSearch && (
        <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[var(--card)] rounded-lg w-full max-w-lg shadow-2xl border border-gray-200/80 dark:border-[var(--card-border)]">
            <div className="px-8 py-6 border-b border-gray-100 dark:border-[var(--card-border)] flex items-center justify-between rounded-t-lg">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-[var(--card-foreground)]">保存当前搜索</h2>
              <button
                onClick={() => setShowSaveSearch(false)}
                className="p-2.5 text-gray-400 dark:text-[var(--foreground-subtle)] hover:text-gray-600 dark:hover:text-[var(--foreground-muted)] hover:bg-gray-100 dark:hover:bg-[var(--background-muted)] rounded-lg transition-all"
                aria-label="关闭"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-[var(--foreground-muted)] mb-2">搜索名称 *</label>
                <input
                  autoFocus
                  value={saveSearchName}
                  onChange={(e) => setSaveSearchName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") confirmSaveSearch(); }}
                  className={inputClass}
                  placeholder="如：常用电阻"
                />
              </div>
              <div className="flex gap-4 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowSaveSearch(false); setSaveSearchName(""); }}
                  className="flex-1"
                >
                  取消
                </Button>
                <Button
                  type="button"
                  onClick={confirmSaveSearch}
                  className="flex-1"
                >
                  保存
                </Button>
              </div>
            </div>
          </div>
        </div>
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
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const items = parts
      .filter(p => quantities[p.id] > 0)
      .map(p => ({ partId: p.id, quantity: quantities[p.id] }));
    
    if (items.length === 0) {
      toast("请至少输入一个数量", "error");
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
      <div className="bg-white dark:bg-[var(--card)] rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200/80 dark:border-[var(--card-border)]">
        <div className="px-8 py-6 border-b border-gray-100 dark:border-[var(--card-border)] flex items-center justify-between sticky top-0 bg-white dark:bg-[var(--card)] z-10 rounded-t-lg">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${type === "IN" ? "bg-emerald-50 dark:bg-emerald-500/10" : "bg-amber-50 dark:bg-amber-500/10"}`}>
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
            className="p-2.5 text-gray-400 dark:text-[var(--foreground-subtle)] hover:text-gray-600 dark:hover:text-[var(--foreground-muted)] hover:bg-gray-100 dark:hover:bg-[var(--background-muted)] rounded-lg transition-all duration-200"
            aria-label="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8">
          <div className="space-y-4 mb-8">
            {parts.map((part) => {
              const qty = part.stock?.quantity ?? 0;
              return (
                <div key={part.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-[var(--background-subtle)] rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-[var(--card-foreground)] truncate">{part.name}</p>
                    <p className="text-xs text-gray-500 dark:text-[var(--foreground-subtle)] font-mono">{part.code}</p>
                    <p className="text-xs text-gray-500 dark:text-[var(--foreground-subtle)] mt-1">当前库存: {qty} {part.unit}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <NumberInput
                      value={String(quantities[part.id] || 0)}
                      onChange={(val) => updateQuantity(part.id, val)}
                      min={0}
                      className="w-full sm:w-40"
                    />
                    <span className="text-sm text-gray-500 dark:text-[var(--foreground-subtle)] w-10">{part.unit}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4">
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
              variant={type === "IN" ? "success" : "danger"}
              disabled={processing}
              className="flex-1"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  处理中...
                </>
              ) : (
                `确认批量${type === "IN" ? "入库" : "出库"}`
              )}
            </Button>
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
  const { toast } = useToast();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".csv")) {
      onImport(file);
    } else {
      toast("请上传 CSV 文件", "error");
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
      <div className="bg-white dark:bg-[var(--card)] rounded-lg w-full max-w-lg shadow-2xl border border-gray-200/80 dark:border-[var(--card-border)]">
        <div className="px-8 py-6 border-b border-gray-100 dark:border-[var(--card-border)] flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-emerald-500/10 flex items-center justify-center">
              <ArrowDownToLine className="w-5 h-5 text-green-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[var(--card-foreground)]">导入/导出</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 text-gray-400 dark:text-[var(--foreground-subtle)] hover:text-gray-600 dark:hover:text-[var(--foreground-muted)] hover:bg-gray-100 dark:hover:bg-[var(--background-muted)] rounded-lg transition-all duration-200"
            aria-label="关闭"
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
                className="flex-1 px-4 py-3 bg-[var(--accent-subtle)] text-[var(--accent)] rounded-lg text-sm font-medium hover:bg-[var(--accent-muted)] transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Package className="w-4 h-4" />
                导出 CSV
              </button>
              <button
                onClick={() => onExport("json")}
                className="flex-1 px-4 py-3 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 rounded-lg text-sm font-medium hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-all duration-200 flex items-center justify-center gap-2"
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
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                dragOver
                  ? "border-[var(--accent)] bg-[var(--accent-subtle)]"
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
            <div className={`p-4 rounded-lg ${
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
