import type { ReactNode } from "react";

interface PageHeaderProps {
  breadcrumb?: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ breadcrumb, title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-6">
      {breadcrumb}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-[var(--foreground-subtle)]">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
