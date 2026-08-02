"use client";

import { useState, useRef, useEffect } from "react";
import { inputClass } from "@/components/ui/constants";

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  inputClassName?: string;
}

export default function Combobox({ value, onChange, options, placeholder = "选择或输入", inputClassName }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = value
    ? options.filter((opt) => opt.toLowerCase().includes(value.toLowerCase()))
    : options;

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
        className={`${inputClass} ${inputClassName ?? ""}`}
        placeholder={placeholder}
      />
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
