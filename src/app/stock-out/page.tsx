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
          type: "OUT",
          quantity,
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
        { label: "出库" }
      ]} />
      
      <div className="section">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/25">
            <ArrowUpFromLine className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">出库</h1>
            <p className="text-gray-500 mt-1">扫描二维码或手动输入编码查找器件</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/80 p-6 section shadow-sm">
        <div className="flex gap-4 mb-5">
          <button
            onClick={() => setShowScanner(true)}
            className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-red-600 to-rose-700 text-white rounded-xl text-sm font-semibold hover:from-red-700 hover:to-rose-800 transition-all duration-200 shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30 shrink-0"
          >
            <ScanBarcode className="w-5 h-5" /> 扫码
          </button>
          <div className="flex-1 flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") lookupPart(code); }}
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent focus:bg-white transition-all duration-200"
                placeholder="输入器件编码"
              />
            </div>
            <button
              onClick={() => lookupPart(code)}
              className="px-6 py-3.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
            >
              查询
            </button>
          </div>
        </div>

        {part && (
          <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{part.name}</p>
                <p className="text-sm text-gray-500 font-mono mt-0.5">{part.code}</p>
                {part.category && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-700 mt-1.5">
                    {part.category}
                  </span>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">当前库存</p>
                <p className="text-2xl font-bold text-gray-900">{part.stock?.quantity ?? 0}</p>
                <p className="text-xs text-gray-500">{part.unit}</p>
              </div>
            </div>
          </div>
        )}

        {notFound && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
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
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <FileText className="w-4 h-4 text-red-600" />
            </div>
            <h2 className="font-semibold text-gray-900">出库信息</h2>
          </div>

          {success && (
            <div className="mb-5 p-5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <p className="text-sm text-emerald-700 font-semibold">出库成功！库存已更新为 {part.stock?.quantity ?? 0} {part.unit}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setQuantity(1);
                    setSuccess(false);
                  }}
                  className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-all duration-200"
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
                  className="flex-1 px-3 py-2 bg-white border border-emerald-300 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-50 transition-all duration-200"
                >
                  出库其他器件
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-600 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">出库数量 *</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-12 h-12 flex items-center justify-center bg-gray-50 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-100 hover:border-gray-300 transition-all duration-200"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <input
                  type="number"
                  min="1"
                  max={part.stock?.quantity ?? 0}
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent focus:bg-white transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(part.stock?.quantity ?? 0, quantity + 1))}
                  className="w-12 h-12 flex items-center justify-center bg-gray-50 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-100 hover:border-gray-300 transition-all duration-200"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-3">
                <p className="text-sm text-gray-500">
                  可出库: <span className="font-bold text-gray-900">{part.stock?.quantity ?? 0}</span> {part.unit}
                </p>
                <button
                  type="button"
                  onClick={() => setQuantity(part.stock?.quantity ?? 0)}
                  className="text-sm text-red-600 hover:text-red-700 font-semibold transition-colors duration-200"
                >
                  全部出库
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" /> 操作人
              </label>
              <input
                type="text"
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent focus:bg-white transition-all duration-200"
                placeholder="可选"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" /> 出库原因
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent focus:bg-white transition-all duration-200"
                placeholder="如：生产使用、维修等"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-6 px-4 py-3.5 bg-gradient-to-r from-red-600 to-rose-700 text-white rounded-xl text-sm font-semibold hover:from-red-700 hover:to-rose-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30"
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
