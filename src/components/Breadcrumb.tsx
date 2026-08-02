"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center gap-2 text-sm text-[var(--foreground-subtle)] mb-6">
      <Link href="/" className="flex items-center gap-1 hover:text-[var(--foreground)] transition-colors">
        <Home className="w-4 h-4" />
        <span>首页</span>
      </Link>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-[var(--foreground-subtle)]" />
          {item.href ? (
            <Link href={item.href} className="hover:text-[var(--foreground)] transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-[var(--foreground)] font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
