"use client";

import { useState, useRef, useEffect } from "react";

const CATEGORY_OPTIONS = [
  "电阻", "电容", "电感", "二极管", "三极管", "IC", "连接器", "晶振", "LED", "其他",
];

interface CategoryInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function CategoryInput({ value, onChange, placeholder = "选择或输入分类" }: CategoryInputProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = value
    ? CATEGORY_OPTIONS.filter((c) => c.toLowerCase().includes(value.toLowerCase()))
    : CATEGORY_OPTIONS;

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
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        className="w-full px-5 py-4 bg-gray-50 dark:bg-[var(--background-subtle)] border border-gray-200 dark:border-[var(--card-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-[var(--card)] transition-all duration-200"
        placeholder={placeholder}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-52 overflow-y-auto bg-white dark:bg-[var(--card)] border border-gray-200 dark:border-[var(--card-border)] rounded-xl shadow-lg">
          {filtered.map((cat) => (
            <button
              key={cat}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(cat);
                setOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-sm text-gray-900 dark:text-[var(--card-foreground)] hover:bg-gray-100 dark:hover:bg-[var(--background-subtle)] active:bg-gray-200 dark:active:bg-[var(--background-muted)] transition-colors min-h-[44px] flex items-center"
            >
              {cat}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
