import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-lg bg-[var(--background-subtle)]">
        {icon}
      </div>
      <p className="text-sm font-medium text-[var(--foreground)]">{title}</p>
      {description && <p className="mt-1 text-sm text-[var(--foreground-subtle)]">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
