import { forwardRef, type ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "outline" | "ghost" | "danger" | "success";
export type ButtonSize = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-1.5 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]";

const sizes: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm",
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]",
  outline:
    "bg-transparent border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--background-subtle)]",
  ghost: "bg-transparent text-[var(--foreground-muted)] hover:bg-[var(--background-subtle)]",
  danger: "bg-[var(--error)] text-white hover:opacity-90",
  success: "bg-[var(--success)] text-white hover:opacity-90",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...rest }, ref) => (
    <button
      ref={ref}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className ?? ""}`}
      {...rest}
    />
  )
);
Button.displayName = "Button";
