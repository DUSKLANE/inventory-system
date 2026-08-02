import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { selectClass } from "./constants";

export const SelectField = ({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <div className="relative">
    <select className={`${selectClass} ${className ?? ""}`} {...rest} />
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--foreground-subtle)]" />
  </div>
);
