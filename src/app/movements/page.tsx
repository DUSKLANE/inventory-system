"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search, X, Clock, Inbox } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";

interface Movement {
  id: string;
  partId: string;
  type: string;
  quantity: number;
  operator: string;
  reason: string;
  code: string;
  createdAt: string;
  part?: { id?: string; code: string; name: string; unit: string };
}

interface PartOption {
  id: string;
  code: string;
  name: string;
}

function MovementsContent() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<{ movements: Movement[]; total: number; page: number; totalPages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<string>(() => {
    const t = searchParams.get("type");
    return t === "IN" || t === "OUT" ? t : "";
  });
  const [page, setPage] = useState(1);
  const [partQuery, setPartQuery] = useState("");
  const [partOptions, setPartOptions] = useState<PartOption[]>([]);
  const [partId, setPartId] = useState("");
  const [partLabel, setPartLabel] = useState("");
  const requestSeq = useRef(0);

  useEffect(() => {
    const t = searchParams.get("type");
    if (t === "IN" || t === "OUT") setType(t);
  }, [searchParams]);

  useEffect(() => {
    const seq = ++requestSeq.current;
    setLoading(true);
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (partId) params.set("partId", partId);
    params.set("page", String(page));
    params.set("pageSize", "50");
    fetch(`/api/movements?${params}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((json) => {
        if (seq !== requestSeq.current) return;
        const total = json.total ?? 0;
        setData({
          movements: json.movements ?? [],
          total,
          page: json.page ?? 1,
          totalPages: Math.max(1, Math.ceil(total / 50)),
        });
      })
      .catch(() => {})
      .finally(() => { if (seq === requestSeq.current) setLoading(false); });
    return () => { requestSeq.current += 1; };
  }, [type, partId, page]);

  const searchParts = async () => {
    if (!partQuery.trim()) return;
    try {
      const res = await fetch(`/api/parts?q=${encodeURIComponent(partQuery.trim())}&pageSize=10`);
      const json = await res.json();
      setPartOptions(json.parts ?? []);
    } catch {
      setPartOptions([]);
    }
  };

  const clearPart = () => {
    setPartId("");
    setPartLabel("");
    setPartQuery("");
    setPartOptions([]);
  };

  const typeTabs = [
    { value: "", label: "全部" },
    { value: "IN", label: "入库" },
    { value: "OUT", label: "出库" },
  ];

  return (
    <div className="page-container max-w-4xl">
      <Breadcrumb items={[{ label: "流水记录" }]} />

      <div className="section">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-[var(--card-foreground)]">流水记录</h1>
            <p className="text-sm text-gray-500 dark:text-[var(--foreground-subtle)]">全部出入库明细</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 section">
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-[var(--background-muted)] rounded-xl">
          {typeTabs.map((t) => (
            <button
              key={t.value}
              onClick={() => { setType(t.value); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                type === t.value
                  ? "bg-white dark:bg-[var(--card)] text-gray-900 dark:text-[var(--card-foreground)] shadow-sm"
                  : "text-gray-500 dark:text-[var(--foreground-subtle)] hover:text-gray-700 dark:hover:text-[var(--foreground-muted)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 flex items-center gap-2 min-w-0">
          {partId ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl text-sm text-blue-700 dark:text-blue-300 max-w-full">
              <span className="truncate">{partLabel}</span>
              <button onClick={clearPart} className="shrink-0 p-0.5 hover:text-blue-900 dark:hover:text-blue-200">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <>
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[var(--foreground-subtle)]" />
                <input
                  type="text"
                  value={partQuery}
                  onChange={(e) => setPartQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") searchParts(); }}
                  placeholder="按器件搜索流水"
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[var(--card)] border border-gray-200 dark:border-[var(--card-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={searchParts}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-[var(--foreground-muted)] border border-gray-200 dark:border-[var(--card-border)] rounded-xl hover:bg-gray-50 dark:hover:bg-[var(--background-subtle)] transition-colors shrink-0"
              >
                搜索
              </button>
            </>
          )}
        </div>
      </div>

      {partOptions.length > 0 && (
        <div className="section space-y-2">
          {partOptions.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setPartId(p.id);
                setPartLabel(`${p.name} (${p.code})`);
                setPartOptions([]);
                setPartQuery("");
                setPage(1);
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-[var(--card-border)] hover:border-blue-300 dark:hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 transition-colors text-left"
            >
              <p className="text-sm font-medium text-gray-900 dark:text-[var(--card-foreground)]">{p.name}</p>
              <p className="text-xs text-gray-500 dark:text-[var(--foreground-subtle)] font-mono">{p.code}</p>
            </button>
          ))}
        </div>
      )}

      <div className="bg-white dark:bg-[var(--card)] rounded-2xl border border-gray-200 dark:border-[var(--card-border)] overflow-hidden section">
        {loading && data === null ? (
          <div className="p-16 text-center text-sm text-gray-400 dark:text-[var(--foreground-subtle)]">加载中...</div>
        ) : !data || data.movements.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gray-100 dark:bg-[var(--background-muted)] flex items-center justify-center">
              <Inbox className="w-7 h-7 text-gray-400 dark:text-[var(--foreground-subtle)]" />
            </div>
            <p className="text-gray-500 dark:text-[var(--foreground-subtle)] font-medium">暂无流水记录</p>
            <p className="text-sm text-gray-400 dark:text-[var(--foreground-subtle)] mt-1">完成入库或出库操作后，记录将显示在这里</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100 dark:divide-[var(--card-border)]">
              {data.movements.map((m) => {
                const isIn = m.type === "IN";
                const part = m.part ?? { id: m.partId, code: m.code, name: m.code, unit: "" };
                return (
                  <Link
                    key={m.id}
                    href={`/parts/${m.partId}`}
                    className="px-4 sm:px-8 py-4 flex items-center gap-4 hover:bg-gray-50/80 dark:hover:bg-[var(--background-subtle)] transition-colors duration-150"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isIn
                        ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                    }`}>
                      {isIn ? <ArrowDown className="w-5 h-5" /> : <ArrowUp className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-[var(--card-foreground)] truncate">{part.name}</p>
                      <p className="text-xs text-gray-500 dark:text-[var(--foreground-subtle)] font-mono mt-0.5">{part.code}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-base font-bold ${isIn ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {isIn ? "+" : "-"}{m.quantity} <span className="text-xs font-normal text-gray-500 dark:text-[var(--foreground-subtle)]">{part.unit}</span>
                      </p>
                      <p className="text-xs text-gray-400 dark:text-[var(--foreground-subtle)] mt-0.5">
                        {new Date(m.createdAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "numeric", minute: "numeric" })}
                      </p>
                    </div>
                    <div className="hidden sm:block text-right shrink-0 max-w-48">
                      {m.reason && <p className="text-xs text-gray-500 dark:text-[var(--foreground-subtle)] truncate">{m.reason}</p>}
                      {m.operator && <p className="text-xs text-gray-400 dark:text-[var(--foreground-subtle)] mt-0.5">{m.operator}</p>}
                    </div>
                  </Link>
                );
              })}
            </div>

            {data.totalPages > 1 && (
              <div className="px-8 py-4 border-t border-gray-100 dark:border-[var(--card-border)] flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-[var(--foreground-subtle)]">共 {data.total} 条</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 dark:text-[var(--foreground-muted)] border border-gray-200 dark:border-[var(--card-border)] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-[var(--background-subtle)] transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> 上一页
                  </button>
                  <span className="text-sm text-gray-500 dark:text-[var(--foreground-subtle)]">第 {page} / {data.totalPages} 页</span>
                  <button
                    onClick={() => setPage(Math.min(data.totalPages, page + 1))}
                    disabled={page === data.totalPages}
                    className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 dark:text-[var(--foreground-muted)] border border-gray-200 dark:border-[var(--card-border)] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-[var(--background-subtle)] transition-colors"
                  >
                    下一页 <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function MovementsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Clock className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    }>
      <MovementsContent />
    </Suspense>
  );
}
