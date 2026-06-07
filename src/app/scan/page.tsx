"use client";

import { useState, useCallback } from "react";
import {
  ScanBarcode,
  Camera,
  Keyboard,
  Trash2,
  Plus,
  Minus,
  Check,
  Loader2,
  AlertTriangle,
  Package,
  MapPin,
  ShoppingCart,
  RefreshCw,
} from "lucide-react";
import QRScanner from "@/components/QRScanner";
import Breadcrumb from "@/components/Breadcrumb";
import { fetchProductInfo, buildProductFromScanData, type LcedaProduct } from "@/lib/api/lceda";

interface ScanResult {
  on?: string;
  pc?: string;
  pm?: string;
  qty?: string;
  mc?: string;
  cc?: string;
  pdi?: string;
  hp?: string;
  [key: string]: string | undefined;
}

interface PendingItem {
  id: string;
  scanData: ScanResult;
  productInfo: LcedaProduct | null;
  existingPartId?: string;
  status: "loading" | "ready" | "error";
  quantity: number;
  location: string;
  customName?: string;
  errorMessage?: string;
}

function parseScanData(raw: string): ScanResult | null {
  try {
    let cleaned = raw.trim();

    if (/^[A-Za-z]\d+$/.test(cleaned)) {
      return { pc: cleaned };
    }

    if (cleaned.startsWith("{") && cleaned.endsWith("}")) {
      cleaned = cleaned.slice(1, -1);
    }

    const result: ScanResult = {};
    const pairs = cleaned.split(",");
    for (const pair of pairs) {
      const [key, ...valueParts] = pair.split(":");
      if (key) {
        result[key.trim()] = valueParts.join(":").trim();
      }
    }
    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
}

export default function ScanPage() {
  const [showScanner, setShowScanner] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: number;
    failed: number;
    message: string;
  } | null>(null);

  const processScanData = useCallback(async (raw: string) => {
    const scanData = parseScanData(raw);
    if (!scanData || !scanData.pc) {
      return;
    }

    const itemId = Date.now().toString() + Math.random().toString(36).slice(2);
    const newItem: PendingItem = {
      id: itemId,
      scanData,
      productInfo: null,
      status: "loading",
      quantity: parseInt(scanData.qty || "1", 10) || 1,
      location: "",
    };

    setPendingItems((prev) => [newItem, ...prev]);

    try {
      // 先查找库存中是否已有该元器件
      const lookupRes = await fetch(`/api/parts/lookup?code=${scanData.pc}`);
      const lookupData = await lookupRes.json();

      if (lookupData.found) {
        // 库存中已有，直接使用库存信息
        const part = lookupData.part;
        setPendingItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  productInfo: {
                    lcscCode: part.code || scanData.pc,
                    name: part.name || "",
                    brand: part.brand || "",
                    model: part.model || "",
                    package: part.package || "",
                    category: part.category || "",
                    subCategory: "",
                    parameters: {},
                    image: "",
                    datasheet: "",
                    description: "",
                    price: "",
                    stock: 0,
                  },
                  existingPartId: part.id,
                  location: part.location || "",
                  status: "ready",
                }
              : item
          )
        );
      } else {
        // 库存中没有，调用 LCEDA API 获取信息
        const productInfo = await fetchProductInfo(scanData.pc);

        setPendingItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  productInfo: productInfo || buildProductFromScanData(scanData),
                  status: productInfo ? "ready" : "error",
                  errorMessage: productInfo ? undefined : "未找到产品信息，已使用扫描数据",
                }
              : item
          )
        );
      }
    } catch {
      setPendingItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                productInfo: buildProductFromScanData(scanData),
                status: "error",
                errorMessage: "查找失败",
              }
            : item
        )
      );
    }
  }, []);

  const handleScan = useCallback(
    (code: string) => {
      processScanData(code);
    },
    [processScanData]
  );

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      processScanData(manualCode.trim());
      setManualCode("");
      setShowManualInput(false);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setPendingItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      )
    );
  };

  const updateLocation = (id: string, location: string) => {
    setPendingItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, location } : item))
    );
  };

  const updateName = (id: string, name: string) => {
    setPendingItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, customName: name } : item))
    );
  };

  const removeItem = (id: string) => {
    setPendingItems((prev) => prev.filter((item) => item.id !== id));
  };

  const retryFetch = async (id: string) => {
    const item = pendingItems.find((i) => i.id === id);
    if (!item || !item.scanData.pc) return;

    setPendingItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "loading" } : i))
    );

    const productInfo = await fetchProductInfo(item.scanData.pc);

    setPendingItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              productInfo: productInfo || buildProductFromScanData(item.scanData),
              status: productInfo ? "ready" : "error",
              errorMessage: productInfo ? undefined : "未找到产品信息",
            }
          : i
      )
    );
  };

  const handleBatchSubmit = async () => {
    const readyItems = pendingItems.filter((item) => item.status === "ready");
    if (readyItems.length === 0) return;

    setIsSubmitting(true);
    setSubmitResult(null);

    let success = 0;
    let failed = 0;

    for (const item of readyItems) {
      try {
        let partId: string;

        if (item.existingPartId) {
          // 已有零件，直接使用
          partId = item.existingPartId;
        } else {
          // 查找或创建零件
          const lookupRes = await fetch(`/api/parts/lookup?code=${item.scanData.pc}`);
          const lookupData = await lookupRes.json();

          if (lookupData.found) {
            partId = lookupData.part.id;
          } else {
            const createRes = await fetch("/api/parts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                code: item.scanData.pc,
                name: item.customName || item.productInfo?.name || item.scanData.pm || "",
                model: item.productInfo?.model || item.scanData.pm || "",
                brand: item.productInfo?.brand || "",
                package: item.productInfo?.package || "",
                category: item.productInfo?.category || "",
                location: item.location,
                image: item.productInfo?.image || "",
              }),
            });

            if (!createRes.ok) {
              failed++;
              continue;
            }

            const createdPart = await createRes.json();
            partId = createdPart.id;
          }
        }

        const stockRes = await fetch("/api/movements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            partId,
            type: "IN",
            quantity: item.quantity,
            reason: "扫码入库",
            code: item.scanData.on || "",
          }),
        });

        if (stockRes.ok) {
          success++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    setIsSubmitting(false);
    setSubmitResult({
      success,
      failed,
      message: `入库完成：成功 ${success} 件${failed > 0 ? `，失败 ${failed} 件` : ""}`,
    });

    if (success > 0) {
      setPendingItems((prev) => prev.filter((item) => item.status !== "ready"));
    }
  };

  const readyCount = pendingItems.filter((item) => item.status === "ready").length;
  const totalQuantity = pendingItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="page-container max-w-3xl">
      <Breadcrumb items={[{ label: "扫码入库" }]} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ScanBarcode className="w-7 h-7 text-indigo-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-[var(--card-foreground)]">扫码入库</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowManualInput(true)}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 dark:text-[var(--foreground-muted)] hover:bg-gray-100 dark:hover:bg-[var(--background-subtle)] rounded-lg transition-colors"
          >
            <Keyboard className="w-4 h-4" />
            手动输入
          </button>
          {pendingItems.length > 0 && (
            <button
              onClick={() => setShowScanner(true)}
              className="flex items-center gap-1 px-3 py-2 bg-indigo-500 text-white text-sm rounded-lg font-medium hover:bg-indigo-600 transition-colors"
            >
              <Camera className="w-4 h-4" />
              继续扫描
            </button>
          )}
        </div>
      </div>

      {submitResult && (
        <div
          className={`p-4 rounded-xl animate-fade-in ${
            submitResult.failed === 0
              ? "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30"
              : "bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30"
          }`}
        >
          <div className="flex items-center gap-2">
            {submitResult.failed === 0 ? (
              <Check className="w-5 h-5 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            )}
            <span
              className={`font-medium ${
                submitResult.failed === 0
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-amber-700 dark:text-amber-400"
              }`}
            >
              {submitResult.message}
            </span>
          </div>
        </div>
      )}

      {pendingItems.length === 0 ? (
        <div className="bg-white dark:bg-[var(--card)] rounded-2xl border border-gray-200 dark:border-[var(--card-border)] p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center mx-auto mb-4">
            <Package className="w-10 h-10 text-indigo-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-[var(--card-foreground)] mb-2">
            开始扫码入库
          </h2>
          <p className="text-sm text-gray-500 dark:text-[var(--foreground-subtle)] mb-6">
            扫描元器件包装上的二维码，自动获取产品信息
          </p>
          <button
            onClick={() => setShowScanner(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 transition-colors"
          >
            <Camera className="w-5 h-5" />
            开始扫描
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {pendingItems.map((item) => (
              <PendingItemCard
                key={item.id}
                item={item}
                onUpdateQuantity={updateQuantity}
                onUpdateLocation={updateLocation}
                onUpdateName={updateName}
                onRemove={removeItem}
                onRetry={retryFetch}
              />
            ))}
          </div>

          <div className="sticky bottom-20 md:bottom-4 bg-white dark:bg-[var(--card)] rounded-2xl border border-gray-200 dark:border-[var(--card-border)] p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-[var(--foreground-muted)]">
                <span>
                  共 <span className="font-semibold text-gray-900 dark:text-[var(--card-foreground)]">{pendingItems.length}</span> 件
                </span>
                <span>
                  数量: <span className="font-semibold text-gray-900 dark:text-[var(--card-foreground)]">{totalQuantity}</span>
                </span>
                <span>
                  就绪: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{readyCount}</span>
                </span>
              </div>
            </div>
            <button
              onClick={handleBatchSubmit}
              disabled={readyCount === 0 || isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  入库中...
                </>
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5" />
                  全部入库 ({readyCount})
                </>
              )}
            </button>
          </div>
        </>
      )}

      {showManualInput && (
        <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[var(--card)] rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-[var(--card-foreground)] mb-2">
              手动输入
            </h3>
            <p className="text-sm text-gray-500 dark:text-[var(--foreground-subtle)] mb-4">
              输入立创编号（如 C2907002）或完整二维码内容
            </p>
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
              <button
                onClick={() => {
                  setShowManualInput(false);
                  setManualCode("");
                }}
                className="px-4 py-2 text-gray-700 dark:text-[var(--foreground-muted)] hover:bg-gray-100 dark:hover:bg-[var(--background-subtle)] rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleManualSubmit}
                disabled={!manualCode.trim()}
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 transition-colors disabled:opacity-50"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {showScanner && (
        <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} continuous={true} />
      )}
    </div>
  );
}

function PendingItemCard({
  item,
  onUpdateQuantity,
  onUpdateLocation,
  onUpdateName,
  onRemove,
  onRetry,
}: {
  item: PendingItem;
  onUpdateQuantity: (id: string, delta: number) => void;
  onUpdateLocation: (id: string, location: string) => void;
  onUpdateName: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
}) {
  const info = item.productInfo;
  const hasError = item.status === "error";
  const displayName = item.customName || info?.name || item.scanData.pm || "未知器件";

  return (
    <div className="bg-white dark:bg-[var(--card)] rounded-xl border border-gray-200 dark:border-[var(--card-border)] overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono px-2 py-0.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-[var(--foreground-muted)] rounded">
                {item.scanData.pc}
              </span>
              {item.existingPartId && (
                <span className="text-xs px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-[var(--foreground-muted)] rounded">
                  已有库存
                </span>
              )}
              {item.status === "loading" && (
                <Loader2 className="w-4 h-4 text-gray-400 dark:text-[var(--foreground-subtle)] animate-spin" />
              )}
              {item.status === "ready" && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-[var(--foreground-muted)]">
                  <Check className="w-3 h-3" /> 就绪
                </span>
              )}
              {hasError && (
                <button
                  onClick={() => onRetry(item.id)}
                  className="flex items-center gap-1 text-xs text-amber-600 dark:text-[var(--foreground-muted)] hover:underline"
                >
                  <RefreshCw className="w-3 h-3" /> 重试
                </button>
              )}
            </div>
            <input
              type="text"
              value={displayName}
              onChange={(e) => onUpdateName(item.id, e.target.value)}
              className="w-full font-medium text-gray-900 dark:text-[var(--card-foreground)] bg-transparent border-none outline-none focus:bg-gray-50 dark:focus:bg-[var(--background-subtle)] rounded px-1 -mx-1 transition-colors"
              placeholder="器件名称"
            />
            {item.errorMessage && (
              <p className="text-xs text-amber-600 dark:text-[var(--foreground-muted)] mt-1">
                {item.errorMessage}
              </p>
            )}
          </div>
          <button
            onClick={() => onRemove(item.id)}
            className="p-1 text-gray-400 dark:text-[var(--foreground-subtle)] hover:text-red-500 rounded transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {info && (
          <div className="flex flex-wrap gap-1.5 mb-3 text-xs">
            {info.brand && (
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-[var(--background-muted)] text-gray-600 dark:text-[var(--foreground-muted)] rounded">
                {info.brand}
              </span>
            )}
            {info.package && (
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-[var(--background-muted)] text-gray-600 dark:text-[var(--foreground-muted)] rounded">
                {info.package}
              </span>
            )}
            {info.category && (
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-[var(--background-muted)] text-gray-600 dark:text-[var(--foreground-muted)] rounded">
                {info.category}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdateQuantity(item.id, -1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-[var(--card-border)] hover:bg-gray-100 dark:hover:bg-[var(--background-subtle)] transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <input
              type="number"
              value={item.quantity}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (val > 0) {
                  onUpdateQuantity(item.id, val - item.quantity);
                }
              }}
              className="w-16 text-center py-1 border border-gray-200 dark:border-[var(--card-border)] rounded-lg bg-white dark:bg-[var(--card)] text-gray-900 dark:text-[var(--card-foreground)] text-sm"
            />
            <button
              onClick={() => onUpdateQuantity(item.id, 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-[var(--card-border)] hover:bg-gray-100 dark:hover:bg-[var(--background-subtle)] transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <MapPin className="w-4 h-4 text-gray-400 dark:text-[var(--foreground-subtle)] shrink-0" />
            <input
              type="text"
              value={item.location}
              onChange={(e) => onUpdateLocation(item.id, e.target.value)}
              placeholder="输入库位"
              className="flex-1 min-w-0 py-1 px-2 border border-gray-200 dark:border-[var(--card-border)] rounded-lg bg-white dark:bg-[var(--card)] text-gray-900 dark:text-[var(--card-foreground)] text-sm placeholder-gray-400 dark:placeholder-[var(--foreground-subtle)]"
            />
          </div>
        </div>

        {item.scanData.on && (
          <p className="mt-2 text-xs text-gray-400 dark:text-[var(--foreground-subtle)]">
            订单号: {item.scanData.on}
          </p>
        )}
      </div>
    </div>
  );
}
