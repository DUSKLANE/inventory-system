interface SpinnerProps {
  size?: "sm" | "md";
  className?: string;
}

export function Spinner({ size = "md", className }: SpinnerProps) {
  const sizeClass = size === "sm" ? "h-4 w-4 border-2" : "h-8 w-8 border-[3px]";
  return (
    <div
      role="status"
      aria-label="加载中"
      className={`${sizeClass} animate-spin rounded-full border-[var(--border)] border-t-[var(--accent)] ${className ?? ""}`}
    />
  );
}
