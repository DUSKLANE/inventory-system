"use client";

import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";

interface NumberInputProps {
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  className?: string;
}

export default function NumberInput({ value, onChange, min = 1, max, className = "" }: NumberInputProps) {
  const [editingValue, setEditingValue] = useState<string | null>(null);

  // 外部 value 变化时丢弃未提交的编辑值，避免显示陈旧值（如扫码页同码累加）
  useEffect(() => {
    setEditingValue(null);
  }, [value]);

  const displayValue = editingValue !== null ? editingValue : value;
  const parsed = parseInt(value, 10);
  const numValue = Number.isFinite(parsed) ? parsed : min;

  const handleDecrement = () => {
    setEditingValue(null);
    onChange(String(Math.max(min, numValue - 1)));
  };

  const handleIncrement = () => {
    setEditingValue(null);
    const next = numValue + 1;
    onChange(max !== undefined ? String(Math.min(max, next)) : String(next));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEditingValue(val);
    const num = Number(val);
    if (val !== "" && val !== "-" && Number.isInteger(num) && num >= 0) {
      onChange(String(num));
    }
  };

  const handleBlur = () => {
    setEditingValue(null);
    const parsedVal = Number(value);
    const finalVal = Number.isFinite(parsedVal) ? parsedVal : min;
    const clamped = Math.min(max ?? finalVal, Math.max(min, finalVal));
    onChange(String(clamped));
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={handleDecrement}
        className="w-11 h-11 flex items-center justify-center bg-gray-50 dark:bg-[var(--background-subtle)] border border-gray-200 dark:border-[var(--card-border)] rounded-xl text-gray-600 dark:text-[var(--foreground-muted)] hover:bg-gray-100 dark:hover:bg-[var(--background-muted)] active:bg-gray-200 dark:active:bg-[var(--background-muted)] transition-colors"
      >
        <Minus className="w-4 h-4" />
      </button>
      <input
        type="number"
        min={min}
        max={max}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className="flex-1 min-w-0 px-3 py-2.5 bg-gray-50 dark:bg-[var(--background-subtle)] border border-gray-200 dark:border-[var(--card-border)] rounded-xl text-base font-bold text-center text-gray-900 dark:text-[var(--card-foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-[var(--card)] transition-all duration-200"
      />
      <button
        type="button"
        onClick={handleIncrement}
        className="w-11 h-11 flex items-center justify-center bg-gray-50 dark:bg-[var(--background-subtle)] border border-gray-200 dark:border-[var(--card-border)] rounded-xl text-gray-600 dark:text-[var(--foreground-muted)] hover:bg-gray-100 dark:hover:bg-[var(--background-muted)] active:bg-gray-200 dark:active:bg-[var(--background-muted)] transition-colors"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
