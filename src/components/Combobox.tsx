"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { inputClass } from "@/components/ui/constants";

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  inputClassName?: string;
  /** 只允许从下拉列表选择，禁止手输 */
  selectOnly?: boolean;
}

export default function Combobox({ value, onChange, options, placeholder = "选择或输入", inputClassName, selectOnly = false }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // selectOnly 模式下值只能来自选项本身，若按 value 过滤会把下拉收窄到单个选项，故始终展示全部
  const filtered = selectOnly || !value
    ? options
    : options.filter((opt) => opt.toLowerCase().includes(value.toLowerCase()));

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        value={value}
        readOnly={selectOnly}
        onChange={(e) => {
          if (selectOnly) return;
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        className={`${inputClass} ${selectOnly ? "cursor-pointer pr-9" : ""} ${inputClassName ?? ""}`}
        placeholder={placeholder}
      />
      {selectOnly && (
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[var(--foreground-subtle)] pointer-events-none" />
      )}
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-52 overflow-y-auto bg-white dark:bg-[var(--card)] border border-[var(--card-border)] rounded-lg shadow-lg">
          {filtered.map((opt) => (
            <button
              key={opt}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-sm text-[var(--foreground)] hover:bg-[var(--background-subtle)] active:bg-[var(--background-muted)] transition-colors min-h-[44px] flex items-center"
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
