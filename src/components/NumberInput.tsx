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
    const parsedVal = value.trim() === "" ? NaN : Number(value);
    const finalVal = Number.isFinite(parsedVal) ? parsedVal : min;
    const clamped = max !== undefined ? Math.min(max, Math.max(min, finalVal)) : Math.max(min, finalVal);
    onChange(String(clamped));
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={handleDecrement}
        aria-label="减少"
        className="w-11 h-11 flex items-center justify-center bg-[var(--background-subtle)] border border-[var(--border)] rounded-lg text-[var(--foreground-muted)] hover:bg-[var(--background-muted)] active:bg-[var(--border-hover)] transition-colors"
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
        className="flex-1 min-w-0 px-3 py-2.5 bg-[var(--background-subtle)] border border-[var(--border)] rounded-lg text-base font-bold text-center text-[var(--card-foreground)] focus:outline-none focus:bg-[var(--card)] transition-all duration-200 appearance-none"
      />
      <button
        type="button"
        onClick={handleIncrement}
        aria-label="增加"
        className="w-11 h-11 flex items-center justify-center bg-[var(--background-subtle)] border border-[var(--border)] rounded-lg text-[var(--foreground-muted)] hover:bg-[var(--background-muted)] active:bg-[var(--border-hover)] transition-colors"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
