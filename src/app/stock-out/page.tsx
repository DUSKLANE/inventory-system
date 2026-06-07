"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import QRScanner from "@/components/QRScanner";
import { Search, ArrowUpFromLine, Plus, Minus, Check, AlertTriangle, Loader2, Package, User, FileText, CheckCircle2, XCircle, ScanBarcode } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";

interface Part {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  stock?: { quantity: number };
}

function StockOutContent() {
  const searchParams = useSearchParams();
  const [showScanner, setShowScanner] = useState(false);
  const [code, setCode] = useState(searchParams.get("code") || "");
  const [part, setPart] = useState<Part | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [quantity, setQuantity] = useState("1");
  const [operator, setOperator] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const lookupPart = useCallback(async (codeToLookup: string) => {
    if (!codeToLookup.trim()) return;
    setNotFound(false);
    setPart(null);
    setSuccess(false);
    setError("");
    try {
      const res = await fetch(`/api/parts/lookup?code=${encodeURIComponent(codeToLookup.trim())}`);
      const data = await res.json();
      if (data.found) {
        setPart(data.part);
      } else {
        setNotFound(true);
      }
    } catch {
      setError("查询失败");
    }
  }, []);

  useEffect(() => {
    const initialCode = searchParams.get("code");
    if (initialCode && initialCode !== code) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      lookupPart(initialCode);
    }
  }, [searchParams, lookupPart, code]);

  const handleScan = (scannedCode: string) => {
    setShowScanner(false);
    // 解析嘉立创二维码，提取 pc 字段
    let codeToLookup = scannedCode.trim();
    if (codeToLookup.startsWith("{") && codeToLookup.endsWith("}")) {
      const inner = codeToLookup.slice(1, -1);
      const pairs = inner.split(",");
      for (const pair of pairs) {
        const [key, ...valueParts] = pair.split(":");
        if (key?.trim() === "pc" && valueParts.length > 0) {
          codeToLookup = valueParts.join(":").trim();
          break;
        }
      }
    }
    setCode(codeToLookup);
    lookupPart(codeToLookup);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!part) return;
    const qty = parseInt(quantity) || 1;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partId: part.id,
          type: "OUT",
          quantity: qty,
          operator,
          reason,
          code,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "出库失败");
        return;
      }
      setSuccess(true);
      setQuantity("1");
      setReason("");
      lookupPart(code);
    } catch {
      setError("网络错误");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container max-w-3xl">
      <Breadcrumb items={[
        { label: "出库" }
      ]} />
      
      <div className="section">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/25">
            <ArrowUpFromLine className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-[var(--card-foreground)] tracking-tight">出库</h1>
            <p className="text-gray-500 dark:text-[var(--foreground-subtle)] mt-1">扫描二维码或手动输入编码查找器件</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[var(--card)] rounded-2xl border border-gray-200/80 dark:border-[var(--card-border)] p-4 sm:p-6 section shadow-sm">
        <div className="flex gap-2 sm:gap-4 mb-4 sm:mb-5">
          <button
            onClick={() => setShowScanner(true)}
            className="flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-3.5 bg-gradient-to-r from-red-600 to-rose-700 text-white rounded-xl text-sm font-semibold hover:from-red-700 hover:to-rose-800 transition-all duration-200 shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30 shrink-0"
          >
            <ScanBarcode className="w-4 h-4 sm:w-5 sm:h-5" /> 扫码
          </button>
          <div className="flex-1 flex gap-2 sm:gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-[var(--foreground-subtle)]" />
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") lookupPart(code); }}
                className="w-full pl-9 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-3.5 bg-gray-50 dark:bg-[var(--background-subtle)] border border-gray-200 dark:border-[var(--card-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent focus:bg-white dark:focus:bg-[var(--card)] transition-all duration-200"
                placeholder="输入器件编码"
              />
            </div>
            <button
              onClick={() => lookupPart(code)}
              className="px-4 sm:px-6 py-3 sm:py-3.5 border border-gray-200 dark:border-[var(--card-border)] rounded-xl text-sm font-semibold text-gray-700 dark:text-[var(--foreground-muted)] hover:bg-gray-50 dark:hover:bg-[var(--background-subtle)] hover:border-gray-300 dark:hover:border-[var(--card-border)] transition-all duration-200"
            >
              查询
            </button>
          </div>
        </div>
      </div>

      {part && (
        <div className="p-5 bg-blue-50 dark:bg-blue-500/10 dark-card border border-blue-200 dark:border-blue-500/20 rounded-xl section">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-500/20 dark-icon-bg flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold dark-text">{part.name}</p>
              <p className="text-sm dark-muted font-mono mt-0.5">{part.code}</p>
              {part.category && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 mt-1.5">
                  {part.category}
                </span>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs dark-muted mb-1">当前库存</p>
              <p className="text-2xl font-bold dark-text">{part.stock?.quantity ?? 0}</p>
              <p className="text-xs dark-muted">{part.unit}</p>
            </div>
          </div>
        </div>
      )}

      {notFound && (
        <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl section">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">未找到器件</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                编码 <span className="font-mono font-medium">{code}</span> 不存在，请先{" "}
                <Link href="/parts" className="underline font-medium hover:text-amber-700 dark:hover:text-amber-300">新增器件</Link>
              </p>
            </div>
          </div>
        </div>
      )}

      {part && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-[var(--card)] rounded-2xl border border-gray-200/80 dark:border-[var(--card-border)] p-4 sm:p-8 shadow-sm mt-4 sm:mt-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-5">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md sm:rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-sm sm:font-semibold font-semibold text-gray-900 dark:text-[var(--card-foreground)]">出库信息</h2>
          </div>

          {success && (
            <div className="mb-3 sm:mb-5 p-3 sm:p-5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg sm:rounded-xl">
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
                <p className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 font-semibold">出库成功！库存已更新为 {part.stock?.quantity ?? 0} {part.unit}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setQuantity("1");
                    setSuccess(false);
                  }}
                  className="flex-1 px-2 py-2 sm:px-4 sm:py-3 bg-emerald-600 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium hover:bg-emerald-700 transition-all duration-200"
                >
                  继续出库同一器件
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPart(null);
                    setCode("");
                    setSuccess(false);
                  }}
                  className="flex-1 px-2 py-2 sm:px-4 sm:py-3 bg-white dark:bg-[var(--card)] border border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all duration-200"
                >
                  出库其他器件
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-3 sm:mb-5 p-3 sm:p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg sm:rounded-xl flex items-center gap-2 sm:gap-3">
              <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400 shrink-0" />
              <p className="text-xs sm:text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <div className="flex flex-col gap-4 sm:gap-7">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-[var(--foreground-muted)] mb-1.5 sm:mb-3">出库数量 *</label>
              <div className="flex items-center gap-1.5 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity(String(Math.max(1, (parseInt(quantity) || 1) - 1)))}
                  className="w-9 h-9 sm:w-12 sm:h-12 flex items-center justify-center bg-gray-50 dark:bg-[var(--background-subtle)] border border-gray-200 dark:border-[var(--card-border)] rounded-lg sm:rounded-xl text-gray-600 dark:text-[var(--foreground-muted)] hover:bg-gray-100 dark:hover:bg-[var(--background-muted)] hover:border-gray-300 dark:hover:border-[var(--card-border)] transition-all duration-200"
                >
                  <Minus className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                </button>
                <input
                  type="number"
                  min="1"
                  max={part.stock?.quantity ?? 0}
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  onBlur={() => { if (!quantity || parseInt(quantity) < 1) setQuantity("1"); }}
                  className="flex-1 px-2 py-1.5 sm:px-4 sm:py-3 bg-gray-50 dark:bg-[var(--background-subtle)] border border-gray-200 dark:border-[var(--card-border)] rounded-lg sm:rounded-xl text-base sm:text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent focus:bg-white dark:focus:bg-[var(--card)] transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(String(Math.min(part.stock?.quantity ?? 0, (parseInt(quantity) || 1) + 1)))}
                  className="w-9 h-9 sm:w-12 sm:h-12 flex items-center justify-center bg-gray-50 dark:bg-[var(--background-subtle)] border border-gray-200 dark:border-[var(--card-border)] rounded-lg sm:rounded-xl text-gray-600 dark:text-[var(--foreground-muted)] hover:bg-gray-100 dark:hover:bg-[var(--background-muted)] hover:border-gray-300 dark:hover:border-[var(--card-border)] transition-all duration-200"
                >
                  <Plus className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-1.5 sm:mt-3">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-[var(--foreground-subtle)]">
                  可出库: <span className="font-bold text-gray-900 dark:text-[var(--card-foreground)]">{part.stock?.quantity ?? 0}</span> {part.unit}
                </p>
                <button
                  type="button"
                  onClick={() => setQuantity(String(part.stock?.quantity ?? 0))}
                  className="text-xs sm:text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-semibold transition-colors duration-200"
                >
                  全部出库
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-[var(--foreground-muted)] mb-1 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 dark:text-[var(--foreground-subtle)]" /> 操作人
              </label>
              <input
                type="text"
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-gray-50 dark:bg-[var(--background-subtle)] border border-gray-200 dark:border-[var(--card-border)] rounded-lg sm:rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent focus:bg-white dark:focus:bg-[var(--card)] transition-all duration-200"
                placeholder="可选"
              />
            </div>
            <div>
              <label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-[var(--foreground-muted)] mb-1 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 dark:text-[var(--foreground-subtle)]" /> 出库原因
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-gray-50 dark:bg-[var(--background-subtle)] border border-gray-200 dark:border-[var(--card-border)] rounded-lg sm:rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent focus:bg-white dark:focus:bg-[var(--card)] transition-all duration-200"
                placeholder="如：生产使用、维修等"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-4 sm:mt-6 px-3 py-2.5 sm:px-4 sm:py-3.5 bg-gradient-to-r from-red-600 to-rose-700 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold hover:from-red-700 hover:to-rose-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                提交中...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                确认出库
              </>
            )}
          </button>
        </form>
      )}

      {showScanner && (
        <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}
    </div>
  );
}

export default function StockOutPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-red-200 rounded-full animate-spin" />
          <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-red-600 rounded-full animate-spin" />
        </div>
      </div>
    }>
      <StockOutContent />
    </Suspense>
  );
}
