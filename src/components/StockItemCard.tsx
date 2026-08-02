"use client";

import { Check, Loader2, MapPin, RefreshCw, Trash2, AlertTriangle } from "lucide-react";
import NumberInput from "@/components/NumberInput";
import { isOutItemBlocked, type StockItem, type StockMode } from "@/lib/stock-pending";

interface Props {
  item: StockItem;
  mode: StockMode;
  checked: boolean;
  showCheckbox: boolean;
  onToggleChecked: (id: string) => void;
  onSetQuantity: (id: string, quantity: number) => void;
  onUpdateLocation: (id: string, location: string) => void;
  onUpdateName: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
}

export default function StockItemCard({
  item, mode, checked, showCheckbox,
  onToggleChecked, onSetQuantity, onUpdateLocation, onUpdateName, onRemove, onRetry,
}: Props) {
  const insufficient = isOutItemBlocked(item, mode);
  const isIn = mode === "IN";

  return (
    <div className={`bg-white dark:bg-[var(--card)] rounded-xl border overflow-hidden transition-colors ${
      insufficient
        ? "border-red-300 dark:border-red-500/50"
        : "border-gray-200 dark:border-[var(--card-border)]"
    }`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          {showCheckbox && (
            <button
              onClick={() => onToggleChecked(item.id)}
              disabled={item.status !== "ready" || insufficient}
              className={`mt-0.5 p-1.5 rounded-lg transition-colors shrink-0 ${
                checked
                  ? "text-red-600 dark:text-red-400"
                  : "text-gray-400 dark:text-[var(--foreground-subtle)]"
              } ${item.status !== "ready" || insufficient ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-100 dark:hover:bg-[var(--background-subtle)]"}`}
              title={insufficient ? (item.stock === undefined ? "未关联器件，无法出库" : "库存不足，无法出库") : "选择"}
            >
              <Check className={`w-5 h-5 ${checked ? "fill-red-500 text-white rounded" : ""}`} />
            </button>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-mono px-2 py-0.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 rounded">
                {item.code}
              </span>
              {item.partId && (
                <span className="text-xs px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 rounded">
                  已有库存
                </span>
              )}
              {item.status === "loading" && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
              {item.status === "ready" && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-300">
                  <Check className="w-3 h-3" /> 就绪
                </span>
              )}
              {item.status === "error" && isIn && (
                <button onClick={() => onRetry(item.id)} className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-300 hover:underline">
                  <RefreshCw className="w-3 h-3" /> 重试
                </button>
              )}
            </div>

            {isIn ? (
              <input
                type="text"
                value={item.name}
                onChange={(e) => onUpdateName(item.id, e.target.value)}
                className="w-full font-medium text-gray-900 dark:text-[var(--card-foreground)] bg-transparent border-none outline-none focus:bg-gray-50 dark:focus:bg-[var(--background-subtle)] rounded px-1 -mx-1 transition-colors"
                placeholder="器件名称"
              />
            ) : (
              <p className="font-medium text-gray-900 dark:text-[var(--card-foreground)] truncate">{item.name}</p>
            )}

            {item.errorMessage && (
              <p className="text-xs text-amber-600 dark:text-amber-300 mt-1">{item.errorMessage}</p>
            )}
            {insufficient && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {item.stock === undefined ? "未关联器件，无法出库" : `库存不足（现有 ${item.stock}），未勾选`}
              </p>
            )}

            {!isIn && item.stock !== undefined && (
              <p className="text-xs text-gray-500 dark:text-[var(--foreground-subtle)] mt-1">
                当前库存: <span className={`font-semibold ${insufficient ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-[var(--card-foreground)]"}`}>{item.stock}</span> {item.unit}
              </p>
            )}

            {!isIn && item.category && (
              <div className="flex flex-wrap gap-1.5 mt-2 text-xs">
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-[var(--background-muted)] text-gray-600 dark:text-[var(--foreground-muted)] rounded">{item.category}</span>
              </div>
            )}
          </div>

          <button
            onClick={() => onRemove(item.id)}
            className="p-1 text-gray-400 dark:text-[var(--foreground-subtle)] hover:text-red-500 rounded transition-colors shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-3">
          <NumberInput
            value={String(item.quantity)}
            onChange={(val) => onSetQuantity(item.id, parseInt(val) || 1)}
            min={1}
            className="w-full sm:w-40"
          />
          {isIn && (
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
          )}
        </div>

        {item.orderCode && (
          <p className="mt-2 text-xs text-gray-400 dark:text-[var(--foreground-subtle)]">订单号: {item.orderCode}</p>
        )}
      </div>
    </div>
  );
}
