"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import QRScanner from "@/components/QRScanner";
import { Search, ArrowDownToLine, Plus, Minus, Check, AlertTriangle, Loader2, Package, User, FileText, CheckCircle2, XCircle, ScanBarcode } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";

interface Part {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  stock?: { quantity: number };
}

function StockInContent() {
  const searchParams = useSearchParams();
  const [showScanner, setShowScanner] = useState(false);
  const [code, setCode] = useState(searchParams.get("code") || "");
  const [part, setPart] = useState<Part | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [quantity, setQuantity] = useState(1);
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
    setCode(scannedCode);
    lookupPart(scannedCode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!part) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partId: part.id,
          type: "IN",
          quantity,
          operator,
          reason,
          code,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "入库失败");
        return;
      }
      setSuccess(true);
      setQuantity(1);
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
        { label: "入库" }
      ]} />
      
      <div className="section">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <ArrowDownToLine className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">入库</h1>
            <p className="text-gray-500 mt-1">扫描二维码或手动输入编码查找器件</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-8 section shadow-sm">
        <div className="flex gap-2 sm:gap-5 mb-4 sm:mb-6">
          <button
            onClick={() => setShowScanner(true)}
            className="flex items-center gap-2 px-4 sm:px-7 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 shrink-0"
          >
            <ScanBarcode className="w-4 h-4 sm:w-5 sm:h-5" /> 扫码
          </button>
          <div className="flex-1 flex gap-2 sm:gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") lookupPart(code); }}
                className="w-full pl-9 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all duration-200"
                placeholder="输入器件编码"
              />
            </div>
            <button
              onClick={() => lookupPart(code)}
              className="px-4 sm:px-6 py-3 sm:py-4 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
            >
              查询
            </button>
          </div>
        </div>

        {part && (
          <div className="mt-4 p-5 bg-emerald-50 dark-card border border-emerald-200 rounded-xl">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-xl bg-emerald-100 dark-icon-bg flex items-center justify-center">
                <Package className="w-7 h-7 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold dark-text">{part.name}</p>
                <p className="text-sm dark-muted font-mono mt-1">{part.code}</p>
                {part.category && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-100 text-emerald-700 mt-2">
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
          <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-800">未找到器件</p>
                <p className="text-xs text-amber-600 mt-1">
                  编码 <span className="font-mono font-medium">{code}</span> 不存在，请先{" "}
                  <Link href="/parts" className="underline font-medium hover:text-amber-700">新增器件</Link>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {part && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200/80 p-5 sm:p-8 shadow-sm mt-4 sm:mt-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">入库信息</h2>
          </div>

          {success && (
            <div className="mb-6 p-5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <p className="text-sm text-emerald-700 font-semibold">入库成功！库存已更新为 {part.stock?.quantity ?? 0} {part.unit}</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setQuantity(1);
                    setSuccess(false);
                  }}
                  className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-all duration-200"
                >
                  继续入库同一器件
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPart(null);
                    setCode("");
                    setSuccess(false);
                  }}
                  className="flex-1 px-4 py-3 bg-white border border-emerald-300 text-emerald-700 rounded-xl text-sm font-medium hover:bg-emerald-50 transition-all duration-200"
                >
                  入库其他器件
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-4">
              <XCircle className="w-6 h-6 text-red-600 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="space-y-8">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-4">入库数量 *</label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-14 h-14 flex items-center justify-center bg-gray-50 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-100 hover:border-gray-300 transition-all duration-200"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="flex-1 px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-14 h-14 flex items-center justify-center bg-gray-50 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-100 hover:border-gray-300 transition-all duration-200"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="flex gap-3 mt-4">
                {[10, 50, 100, 500].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setQuantity(n)}
                    className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                      quantity === n
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <User className="w-5 h-5 text-gray-500" /> 操作人
              </label>
              <input
                type="text"
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all duration-200"
                placeholder="可选"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-500" /> 入库原因
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all duration-200"
                placeholder="如：采购、退货等"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-8 px-5 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-base font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                提交中...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                确认入库
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

export default function StockInPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin" />
          <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-blue-600 rounded-full animate-spin" />
        </div>
      </div>
    }>
      <StockInContent />
    </Suspense>
  );
}
