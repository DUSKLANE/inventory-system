"use client";

import { useState, useRef, useEffect } from "react";

const PACKAGE_OPTIONS = [
  "0201", "0402", "0603", "0805", "1206", "1210", "2010", "2512",
  "SOT-23", "SOT-23-5", "SOT-23-6", "SOT-223", "SOT-89",
  "SOIC-8", "SOIC-14", "SOIC-16", "SOIC-20", "SOIC-28",
  "TSSOP-8", "TSSOP-14", "TSSOP-16", "TSSOP-20",
  "QFP-32", "QFP-44", "QFP-48", "QFP-64", "QFP-100",
  "QFN-16", "QFN-20", "QFN-24", "QFN-32", "QFN-48",
  "BGA", "DIP-8", "DIP-14", "DIP-16", "DIP-20", "DIP-28",
  "TO-220", "TO-220F", "TO-252", "TO-263", "TO-92",
  "LQFP-32", "LQFP-48", "LQFP-64", "LQFP-100",
  "MSOP-8", "SC-70", "SOD-123", "SOD-323",
];

interface PackageInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function PackageInput({ value, onChange, placeholder = "如 SOT-23, QFP-48" }: PackageInputProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = value
    ? PACKAGE_OPTIONS.filter((p) => p.toLowerCase().includes(value.toLowerCase()))
    : PACKAGE_OPTIONS;

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
          {filtered.map((pkg) => (
            <button
              key={pkg}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(pkg);
                setOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-sm text-gray-900 dark:text-[var(--card-foreground)] hover:bg-gray-100 dark:hover:bg-[var(--background-subtle)] active:bg-gray-200 dark:active:bg-[var(--background-muted)] transition-colors min-h-[44px] flex items-center"
            >
              {pkg}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
