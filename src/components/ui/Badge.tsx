import type { HTMLAttributes } from "react";

export type BadgeVariant = "in" | "out" | "warning" | "neutral" | "category";

const variants: Record<BadgeVariant, string> = {
  in: "bg-[var(--success-subtle)] text-[var(--success)]",
  out: "bg-[var(--error-subtle)] text-[var(--error)]",
  warning: "bg-[var(--warning-subtle)] text-[var(--warning)]",
  neutral: "bg-[var(--background-subtle)] text-[var(--foreground-muted)]",
  category: "bg-[var(--background-subtle)] text-[var(--foreground-muted)]",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export const Badge = ({ variant = "neutral", className, ...rest }: BadgeProps) => (
  <span
    className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium whitespace-nowrap ${variants[variant]} ${className ?? ""}`}
    {...rest}
  />
);
