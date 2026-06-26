import type { HTMLAttributes } from "react";

import { cx } from "@/lib/ui";

export function Panel({ className, ...props }: HTMLAttributes<HTMLElement>) {
  const hasCustomBackground = typeof className === "string" && /(?:^|\s)bg-/.test(className);

  return <section className={cx("rounded-[var(--radius-panel)] border border-[var(--border)]", !hasCustomBackground && "bg-white", className)} {...props} />;
}
