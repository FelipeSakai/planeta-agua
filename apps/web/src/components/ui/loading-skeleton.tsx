import { cx } from "@/lib/ui";

export function LoadingSkeleton({ className = "h-4 w-full" }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-md bg-[var(--border-soft)]", className)} />;
}
