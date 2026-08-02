"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowDown, ArrowUp, Search, X, Clock, Inbox } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { PageHeader, EmptyState, Pagination, inputClass } from "@/components/ui";

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
  const [pageSize, setPageSize] = useState(20);
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
    params.set("pageSize", String(pageSize));
    fetch(`/api/movements?${params}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((json) => {
        if (seq !== requestSeq.current) return;
        const total = json.total ?? 0;
        setData({
          movements: json.movements ?? [],
          total,
          page: json.page ?? 1,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
        });
      })
      .catch(() => {})
      .finally(() => { if (seq === requestSeq.current) setLoading(false); });
    return () => { requestSeq.current += 1; };
  }, [type, partId, page, pageSize]);

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
    <div className="page-container-narrow">
      <PageHeader
        breadcrumb={<Breadcrumb items={[{ label: "流水记录" }]} />}
        title="流水记录"
        subtitle="全部出入库明细"
      />

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 section">
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-[var(--background-muted)] rounded-lg">
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
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg text-sm text-blue-700 dark:text-blue-300 max-w-full">
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
                  className={`${inputClass} pl-9`}
                />
              </div>
              <button
                onClick={searchParts}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-[var(--foreground-muted)] border border-gray-200 dark:border-[var(--card-border)] rounded-lg hover:bg-gray-50 dark:hover:bg-[var(--background-subtle)] transition-colors shrink-0"
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
              className="w-full flex items-center justify-between p-3 rounded-lg border hover:border-[var(--accent)] hover:bg-[var(--accent-subtle)] transition-colors text-left"
            >
              <p className="text-sm font-medium text-gray-900 dark:text-[var(--card-foreground)]">{p.name}</p>
              <p className="text-xs text-gray-500 dark:text-[var(--foreground-subtle)] font-mono">{p.code}</p>
            </button>
          ))}
        </div>
      )}

      <div className="bg-white dark:bg-[var(--card)] rounded-lg border border-gray-200 dark:border-[var(--card-border)] overflow-hidden section">
        {loading && data === null ? (
          <div className="p-16 text-center text-sm text-gray-400 dark:text-[var(--foreground-subtle)]">加载中...</div>
        ) : !data || data.movements.length === 0 ? (
          <EmptyState
            icon={<Inbox className="w-7 h-7 text-[var(--foreground-subtle)]" />}
            title="暂无流水记录"
            description="完成入库或出库操作后，记录将显示在这里"
          />
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
                    className="px-6 py-3.5 flex items-center gap-4 hover:bg-[var(--background-subtle)] transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
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
