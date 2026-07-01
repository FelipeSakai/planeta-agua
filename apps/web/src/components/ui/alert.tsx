import type { HTMLAttributes } from "react";

import { cx } from "@/lib/ui";

type AlertVariant = "info" | "success" | "warning" | "danger";

const variants: Record<AlertVariant, string> = {
  info: "bg-[var(--info-soft)] text-[var(--info)]",
  success: "bg-[var(--success-soft)] text-[var(--success)]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning)]",
  danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
};

export function Alert({ className, variant = "info", ...props }: HTMLAttributes<HTMLDivElement> & { variant?: AlertVariant }) {
  return <div role="alert" aria-live="polite" className={cx("rounded-xl px-4 py-3 text-sm font-medium", variants[variant], className)} {...props} />;
}
