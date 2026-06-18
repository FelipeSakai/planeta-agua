import type { HTMLAttributes } from "react";

import { cx } from "@/lib/ui";

type BadgeVariant = "neutral" | "success" | "warning" | "danger" | "info";

const variants: Record<BadgeVariant, string> = {
  neutral: "bg-[var(--card-muted)] text-[var(--foreground)]",
  success: "bg-[var(--success-soft)] text-[var(--success)]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning)]",
  danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
  info: "bg-[var(--info-soft)] text-[var(--info)]",
};

export function Badge({ className, variant = "neutral", ...props }: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return <span className={cx("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", variants[variant], className)} {...props} />;
}
