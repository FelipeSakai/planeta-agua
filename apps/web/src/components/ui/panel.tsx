import type { HTMLAttributes } from "react";

import { cx } from "@/lib/ui";

export function Panel({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cx("rounded-[var(--radius-panel)] border border-[var(--border)] bg-white", className)} {...props} />;
}
