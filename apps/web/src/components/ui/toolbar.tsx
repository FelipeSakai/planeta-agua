import type { ReactNode } from "react";

export function Toolbar({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--card)] p-3 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 flex-wrap gap-2 [&>*]:min-w-[min(220px,100%)] [&>*]:flex-1">{children}</div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
