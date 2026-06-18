import type { ReactNode } from "react";

export function Toolbar({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-panel)] border border-[var(--border)] bg-white p-3 md:flex-row md:items-center md:justify-between">
      <div className="grid flex-1 gap-2 md:grid-cols-[minmax(220px,1fr)_auto_auto]">{children}</div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
