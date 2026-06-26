import { useId, type ReactNode } from "react";

import { cx } from "@/lib/ui";

import { Button } from "./button";

type DrawerProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  badge?: ReactNode;
  className?: string;
};

export function Drawer({ open, title, description, onClose, children, badge, className }: DrawerProps) {
  const titleId = useId();
  const descriptionId = useId();

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40">
      <button
        aria-label="Fechar painel"
        className="absolute inset-0 bg-[#102033]/24 backdrop-blur-[2px]"
        onClick={onClose}
        type="button"
      />

      <aside
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className={cx(
          "absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col border-l border-[var(--border)] bg-[var(--card)] shadow-[0_20px_60px_rgba(16,32,51,0.18)] motion-reduce:transition-none motion-safe:transition-transform motion-safe:duration-200",
          className,
        )}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-soft)] px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-[var(--foreground)]" id={titleId}>
              {title}
            </h2>
            {description ? (
              <p className="mt-1 max-w-xl text-sm leading-6 text-[var(--muted)]" id={descriptionId}>
                {description}
              </p>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {badge}
            <Button aria-label="Fechar painel" onClick={onClose} variant="ghost">
              Fechar
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </aside>
    </div>
  );
}
