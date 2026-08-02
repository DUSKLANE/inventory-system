"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SelectField } from "./SelectField";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const [jump, setJump] = useState("");

  const goToPage = () => {
    const p = parseInt(jump, 10);
    if (Number.isFinite(p) && p >= 1) onPageChange(Math.min(p, totalPages));
    setJump("");
  };

  const btn =
    "inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-[var(--foreground-muted)] border border-[var(--border)] rounded hover:bg-[var(--background-subtle)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-[var(--card-border)]">
      <div className="flex items-center gap-3">
        <span className="text-sm text-[var(--foreground-subtle)]">共 {total} 条</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--foreground-subtle)]">每页</span>
          <div className="w-20">
            <SelectField
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </SelectField>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button className={btn} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="w-4 h-4" />
          上一页
        </button>
        <span className="text-sm text-[var(--foreground-subtle)]">
          第 {page} / {totalPages} 页
        </span>
        <button
          className={btn}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          下一页
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1 ml-1">
          <input
            value={jump}
            onChange={(e) => setJump(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && goToPage()}
            className="w-14 rounded px-2 py-1.5 text-sm bg-white dark:bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
            placeholder="页"
            inputMode="numeric"
          />
          <button className={btn} onClick={goToPage}>
            跳转
          </button>
        </div>
      </div>
    </div>
  );
}
