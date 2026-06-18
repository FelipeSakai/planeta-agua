import type { ButtonHTMLAttributes } from "react";

import { cx } from "@/lib/ui";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  isLoading?: boolean;
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-[var(--brand)] text-white hover:bg-[var(--brand-strong)]",
  secondary: "border border-[var(--border)] bg-white text-[var(--foreground)] hover:bg-[var(--card-muted)]",
  ghost: "text-[var(--foreground)] hover:bg-[var(--card-muted)]",
  danger: "bg-[var(--danger)] text-white hover:bg-[#8f1d15]",
};

export function Button({
  className,
  type = "button",
  variant = "primary",
  isLoading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={cx(
        "inline-flex min-h-10 items-center justify-center rounded-[var(--radius-control)] px-4 py-2 text-sm font-medium transition duration-150 disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className,
      )}
      {...props}
    >
      {isLoading ? "Carregando..." : children}
    </button>
  );
}
