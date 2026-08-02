"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ScanBarcode, Keyboard, Trash2, Check, Loader2, AlertTriangle, ShoppingCart, Search, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import QRScanner from "@/components/QRScanner";
import Breadcrumb from "@/components/Breadcrumb";
import { useConfirm } from "@/components/ConfirmProvider";
import { useToast } from "@/components/ToastProvider";
import { PageHeader } from "@/components/ui";
import StockItemCard from "@/components/StockItemCard";
import { fetchProductInfo } from "@/lib/api/lceda";
import { parseScanData, extractPartCode } from "@/lib/parse-qr";
import {
  normalizeMode, isDuplicateScan, migratePendingKey, migrateLegacyItems,
  loadPendingItems, savePendingItems,
  buildStockInPayload, buildStockOutPayload, applyBatchResults,
  mergePendingByCode, isOutItemBlocked,
  type StockItem, type StockMode,
} from "@/lib/stock-pending";

const STOCK_KEY = "stock_pending_items";
const LEGACY_SCAN_KEY = "scan_pending_items";

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
  stock?: { quantity: number };
}

function StockPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const confirm = useConfirm();

  const [mode, setMode] = useState<StockMode>(() => normalizeMode(searchParams.get("mode")));
  const [items, setItems] = useState<StockItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [showSearchParts, setShowSearchParts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Part[]>([]);
  const [searching, setSearching] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: number; failed: number; message: string } | null>(null);
  const [reason, setReason] = useState("");

  const itemsRef = useRef(items);
  useEffect(() => { itemsRef.current = items; });
  const modeRef = useRef(mode);
  useEffect(() => { modeRef.current = mode; });
  const lastScanRef = useRef<{ code: string; time: number } | null>(null);
  const initializedRef = useRef(false);

  const resolveItem = useCallback(async (item: StockItem) => {
    if (!item) return;
    try {
      const res = await fetch(`/api/parts/lookup?code=${encodeURIComponent(item.code)}`);
      const data = await res.json();
      if (data.found) {
        const p = data.part as Part;
        setItems((prev) => prev.map((i) => i.id === item.id ? {
          ...i,
          partId: p.id,
          name: p.name,
          category: p.category,
          package: p.package,
          brand: p.brand,
          model: p.model,
          unit: p.unit || "pcs",
          location: p.location,
          stock: p.stock?.quantity ?? 0,
          status: "ready" as const,
          errorMessage: undefined,
        } : i));
        return;
      }
      if (modeRef.current === "OUT") {
        setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status: "error" as const, errorMessage: "器件不存在，无法出库" } : i));
        return;
      }
      const productInfo = await fetchProductInfo(item.code);
      setItems((prev) => prev.map((i) => i.id === item.id ? {
        ...i,
        name: productInfo?.name || i.name,
        category: productInfo?.category || "",
        package: productInfo?.package || "",
        brand: productInfo?.brand || "",
        model: productInfo?.model || i.model,
        unit: (productInfo as { unit?: string } | null)?.unit || "pcs",
        status: "ready" as const,
        errorMessage: productInfo ? undefined : "未找到产品信息，已使用扫描数据",
      } : i));
    } catch {
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status: "error" as const, errorMessage: "查找失败" } : i));
    }
  }, []);

  const addByCode = useCallback(async (raw: string) => {
    const scanData = parseScanData(raw);
    const code = scanData?.pc || extractPartCode(raw);
    if (!code) {
      toast("无法识别编码", "error");
      return;
    }
    const now = Date.now();
    if (isDuplicateScan(lastScanRef.current, code, now)) return;
    lastScanRef.current = { code, time: now };
    const scanQty = parseInt(scanData?.qty || "1", 10) || 1;
    if (itemsRef.current.some((i) => i.code === code)) {
      setItems((prev) => mergePendingByCode(prev, code, scanQty));
      return;
    }
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const newItem: StockItem = {
      id,
      code,
      name: scanData?.pm || code,
      category: "", package: "", brand: "", model: "", unit: "pcs",
      location: "", orderCode: scanData?.on || "", quantity: scanQty,
      status: "loading",
    };
    setItems((prev) => [newItem, ...prev]);
    if (modeRef.current === "OUT") setCheckedIds((prev) => new Set(prev).add(id));
    await resolveItem(newItem);
  }, [resolveItem, toast]);

  useEffect(() => {
    setMode(normalizeMode(searchParams.get("mode")));
  }, [searchParams]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const legacyRaw = localStorage.getItem(LEGACY_SCAN_KEY);
    let initial = loadPendingItems(localStorage, STOCK_KEY);
    if (initial.length === 0 && legacyRaw) {
      try {
        initial = migrateLegacyItems(JSON.parse(legacyRaw));
      } catch {
        // ignore
      }
    }
    migratePendingKey(localStorage, STOCK_KEY, LEGACY_SCAN_KEY);
    const codeParam = searchParams.get("code");
    if (codeParam) itemsRef.current = initial;
    setItems(initial);
    if (codeParam) addByCode(codeParam);
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mounted) return;
    savePendingItems(localStorage, STOCK_KEY, items);
  }, [items, mounted]);

  const switchMode = (m: StockMode) => {
    setMode(m);
    router.replace(`/stock?mode=${m}`);
  };

  const addPart = useCallback((part: Part) => {
    if (itemsRef.current.some((i) => i.partId === part.id)) {
      toast("该器件已在列表中", "error");
      return;
    }
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const newItem: StockItem = {
      id,
      code: part.code,
      partId: part.id,
      name: part.name,
      category: part.category,
      package: part.package,
      brand: part.brand,
      model: part.model,
      unit: part.unit || "pcs",
      location: part.location,
      orderCode: "",
      quantity: 1,
      stock: part.stock?.quantity ?? 0,
      status: "ready",
    };
    setItems((prev) => [newItem, ...prev]);
    if (modeRef.current === "OUT") setCheckedIds((prev) => new Set(prev).add(id));
    setShowSearchParts(false);
    setSearchQuery("");
    setSearchResults([]);
  }, [toast]);

  const handleScan = (code: string) => {
    addByCode(code);
  };

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      addByCode(manualCode.trim());
      setManualCode("");
      setShowManualInput(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/parts?q=${encodeURIComponent(searchQuery)}&pageSize=10`);
      const data = await res.json();
      setSearchResults(data.parts || []);
    } catch {
      toast("搜索失败", "error");
    } finally {
      setSearching(false);
    }
  };

  const setQuantityDirectly = (id: string, quantity: number) => {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i));
  };
  const updateLocation = (id: string, location: string) => {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, location } : i));
  };
  const updateName = (id: string, name: string) => {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, name } : i));
  };
  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setCheckedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
  };
  const toggleChecked = (id: string) => {
    setCheckedIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const clearAll = async () => {
    const ok = await confirm({ title: "清除待操作数据", message: `确定清除所有待${mode === "IN" ? "入库" : "出库"}数据？`, danger: true });
    if (!ok) return;
    setItems([]);
    setCheckedIds(new Set());
    setSubmitResult(null);
  };

  const retryFetch = async (id: string) => {
    const item = itemsRef.current.find((i) => i.id === id);
    if (!item) return;
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, status: "loading" as const, errorMessage: undefined } : i));
    await resolveItem(item);
  };

  const isInsufficient = (item: StockItem) => isOutItemBlocked(item, mode);

  const handleSubmit = async () => {
    const readyItems = items.filter((i) => i.status === "ready");
    const submitItems = mode === "OUT"
      ? readyItems.filter((i) => checkedIds.has(i.id) && !isInsufficient(i))
      : readyItems;
    if (submitItems.length === 0) {
      toast(mode === "IN" ? "没有就绪的器件可入库" : "请选择要出库的器件", "error");
      return;
    }
    setIsSubmitting(true);
    setSubmitResult(null);
    try {
      let payload: ReturnType<typeof buildStockInPayload> | ReturnType<typeof buildStockOutPayload>["payload"];
      const skippedIds = new Set<string>();
      if (mode === "IN") {
        payload = buildStockInPayload(submitItems, reason || "扫码入库");
      } else {
        const { payload: outPayload, skipped } = buildStockOutPayload(submitItems, reason || "扫码出库");
        payload = outPayload;
        skipped.forEach((i) => skippedIds.add(i.id));
        if (skippedIds.size > 0) {
          setItems((prev) => prev.map((i) => skippedIds.has(i.id) ? { ...i, status: "error" as const, errorMessage: "未关联器件，无法出库" } : i));
        }
        if (payload.items.length === 0) {
          setSubmitResult({ success: 0, failed: skippedIds.size, message: "所选器件缺少器件关联，无法出库" });
          return;
        }
      }
      const res = await fetch("/api/parts/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (mode === "IN" ? "批量入库失败" : "批量出库失败"));
      const { removed } = applyBatchResults(submitItems, data.results ?? []);
      const removedIds = new Set(removed.map((r) => r.id));
      const failedByPart = new Map<string, string>();
      const failedByCode = new Map<string, string>();
      for (const r of (data.results ?? []) as Array<{ partId?: string; code?: string; success: boolean; message?: string }>) {
        if (!r.success && r.message) {
          if (r.partId) failedByPart.set(r.partId, r.message);
          if (r.code) failedByCode.set(r.code, r.message);
        }
      }
      setItems((prev) => prev.filter((i) => !removedIds.has(i.id)).map((i) => {
        const message = (i.partId && failedByPart.get(i.partId)) || failedByCode.get(i.code);
        return message ? { ...i, errorMessage: message } : i;
      }));
      setCheckedIds((prev) => { const n = new Set(prev); removedIds.forEach((id) => n.delete(id)); return n; });
      setReason("");
      setSubmitResult({
        success: data.successCount ?? 0,
        failed: data.failCount ?? 0,
        message: `${mode === "IN" ? "入库" : "出库"}完成：成功 ${data.successCount ?? 0} 件${(data.failCount ?? 0) > 0 ? `，失败 ${data.failCount} 件` : ""}`,
      });
    } catch {
      setSubmitResult({ success: 0, failed: submitItems.length, message: `${mode === "IN" ? "批量入库" : "批量出库"}失败，请重试` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const readyCount = items.filter((i) => i.status === "ready").length;
  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="page-container max-w-3xl">
      <div className="section">
        <PageHeader
          breadcrumb={<Breadcrumb items={[{ label: "出入库" }]} />}
          title="出入库"
          subtitle="扫码 / 手动输入，支持批量操作"
        />

        <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 dark:bg-[var(--background-muted)] rounded-2xl">
          <button
            onClick={() => switchMode("IN")}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
              mode === "IN"
                ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/25"
                : "text-gray-600 dark:text-[var(--foreground-muted)] hover:bg-white dark:hover:bg-[var(--card)]"
            }`}
          >
            <ArrowDownToLine className="w-4 h-4" /> 入库
          </button>
          <button
            onClick={() => switchMode("OUT")}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
              mode === "OUT"
                ? "bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md shadow-red-500/25"
                : "text-gray-600 dark:text-[var(--foreground-muted)] hover:bg-white dark:hover:bg-[var(--card)]"
            }`}
          >
            <ArrowUpFromLine className="w-4 h-4" /> 出库
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap section">
        <button
          onClick={() => setShowScanner(true)}
          className="flex items-center gap-1 px-3 py-2 text-sm bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 transition-colors"
        >
          <ScanBarcode className="w-4 h-4" /> 扫码
        </button>
        <button
          onClick={() => setShowManualInput(true)}
          className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 dark:text-[var(--foreground-muted)] hover:bg-gray-100 dark:hover:bg-[var(--background-subtle)] rounded-lg transition-colors"
        >
          <Keyboard className="w-4 h-4" /> 手动输入
        </button>
        <button
          onClick={() => setShowSearchParts(true)}
          className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 dark:text-[var(--foreground-muted)] hover:bg-gray-100 dark:hover:bg-[var(--background-subtle)] rounded-lg transition-colors"
        >
          <Search className="w-4 h-4" /> 添加已有器件
        </button>
        {items.length > 0 && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors ml-auto"
          >
            <Trash2 className="w-4 h-4" /> 清除全部
          </button>
        )}
      </div>

      {submitResult && (
        <div className={`p-4 rounded-xl animate-fade-in section ${
          submitResult.failed === 0
            ? "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30"
            : "bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30"
        }`}>
          <div className="flex items-center gap-2">
            {submitResult.failed === 0
              ? <Check className="w-5 h-5 text-emerald-500" />
              : <AlertTriangle className="w-5 h-5 text-amber-500" />}
            <span className={`font-medium ${submitResult.failed === 0 ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
              {submitResult.message}
            </span>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-white dark:bg-[var(--card)] rounded-2xl border border-gray-200 dark:border-[var(--card-border)] p-12 text-center section">
          <div className="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center mx-auto mb-4">
            <ShoppingCart className="w-10 h-10 text-indigo-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-[var(--card-foreground)] mb-2">
            {mode === "IN" ? "开始扫码入库" : "开始扫码出库"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-[var(--foreground-subtle)] mb-6">
            {mode === "IN"
              ? "扫描元器件包装上的二维码，自动获取产品信息；新器件将自动创建并入库"
              : "扫描或选择已有器件，批量出库"}
          </p>
          <button
            onClick={() => setShowScanner(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 transition-colors"
          >
            <ScanBarcode className="w-5 h-5" /> 开始扫码
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {items.map((item) => (
              <StockItemCard
                key={item.id}
                item={item}
                mode={mode}
                checked={checkedIds.has(item.id) && !isInsufficient(item)}
                showCheckbox={mode === "OUT"}
                onToggleChecked={toggleChecked}
                onSetQuantity={setQuantityDirectly}
                onUpdateLocation={updateLocation}
                onUpdateName={updateName}
                onRemove={removeItem}
                onRetry={retryFetch}
              />
            ))}
          </div>

          <div className="sticky bottom-20 md:bottom-4 bg-white dark:bg-[var(--card)] rounded-2xl border border-gray-200 dark:border-[var(--card-border)] p-4 shadow-lg mt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-[var(--foreground-muted)]">
                <span>共 <span className="font-semibold text-gray-900 dark:text-[var(--card-foreground)]">{items.length}</span> 件</span>
                <span>数量: <span className="font-semibold text-gray-900 dark:text-[var(--card-foreground)]">{totalQuantity}</span></span>
                <span>就绪: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{readyCount}</span></span>
              </div>
            </div>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={mode === "IN" ? "入库原因（如：采购、退货等）" : "出库原因（如：领用、借用等）"}
              className="w-full mb-3 px-4 py-2.5 bg-gray-50 dark:bg-[var(--background-subtle)] border border-gray-200 dark:border-[var(--card-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleSubmit}
              disabled={readyCount === 0 || isSubmitting}
              className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                mode === "IN"
                  ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800"
                  : "bg-gradient-to-r from-red-600 to-rose-700 text-white hover:from-red-700 hover:to-rose-800"
              }`}
            >
              {isSubmitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> 提交中...</>
              ) : (
                <>{mode === "IN" ? <ArrowDownToLine className="w-5 h-5" /> : <ArrowUpFromLine className="w-5 h-5" />} 全部{mode === "IN" ? "入库" : "出库"} ({readyCount})</>
              )}
            </button>
          </div>
        </>
      )}

      {showManualInput && (
        <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[var(--card)] rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-[var(--card-foreground)] mb-2">手动输入</h3>
            <p className="text-sm text-gray-500 dark:text-[var(--foreground-subtle)] mb-4">输入立创编号（如 C2907002）或完整二维码内容</p>
            <textarea
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="C2907002 或 {on:...,pc:C2907002,...}"
              className="w-full h-24 px-4 py-3 border border-gray-300 dark:border-[var(--card-border)] rounded-xl bg-white dark:bg-[var(--card)] text-gray-900 dark:text-[var(--card-foreground)] resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleManualSubmit();
                }
              }}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => { setShowManualInput(false); setManualCode(""); }} className="px-4 py-2 text-gray-700 dark:text-[var(--foreground-muted)] hover:bg-gray-100 dark:hover:bg-[var(--background-subtle)] rounded-lg transition-colors">
                取消
              </button>
              <button onClick={handleManualSubmit} disabled={!manualCode.trim()} className="px-4 py-2 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 transition-colors disabled:opacity-50">
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {showSearchParts && (
        <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[var(--card)] rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[80vh] flex flex-col">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-[var(--card-foreground)] mb-2">添加已有器件</h3>
            <p className="text-sm text-gray-500 dark:text-[var(--foreground-subtle)] mb-4">搜索器件名称或编码</p>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                placeholder="搜索器件名称、编码..."
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-[var(--card-border)] rounded-xl bg-white dark:bg-[var(--card)] text-gray-900 dark:text-[var(--card-foreground)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button onClick={handleSearch} disabled={searching} className="px-4 py-2.5 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 transition-colors disabled:opacity-50 flex items-center gap-1">
                <Search className="w-4 h-4" /> 搜索
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {searchResults.map((part) => (
                <button
                  key={part.id}
                  onClick={() => addPart(part)}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-[var(--card-border)] hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10 transition-colors text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-[var(--card-foreground)] truncate">{part.name}</p>
                    <p className="text-xs text-gray-500 dark:text-[var(--foreground-subtle)] font-mono mt-0.5">{part.code}</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-700 dark:text-[var(--foreground-muted)] shrink-0 ml-3">
                    库存 {part.stock?.quantity ?? 0}
                  </span>
                </button>
              ))}
              {!searching && searchQuery && searchResults.length === 0 && (
                <p className="text-sm text-gray-400 dark:text-[var(--foreground-subtle)] text-center py-6">未找到匹配器件</p>
              )}
            </div>
            <button onClick={() => setShowSearchParts(false)} className="mt-4 px-4 py-2 text-gray-700 dark:text-[var(--foreground-muted)] hover:bg-gray-100 dark:hover:bg-[var(--background-subtle)] rounded-lg transition-colors self-end">
              关闭
            </button>
          </div>
        </div>
      )}

      {showScanner && (
        <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} continuous={true} />
      )}
    </div>
  );
}

export default function StockPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    }>
      <StockPageContent />
    </Suspense>
  );
}
