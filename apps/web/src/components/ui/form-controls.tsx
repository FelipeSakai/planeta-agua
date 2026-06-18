import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

import { cx } from "@/lib/ui";

export function Field({
  label,
  help,
  error,
  className,
  children,
}: {
  label: string;
  help?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cx("block space-y-2", className)}>
      <span className="text-sm font-medium text-[var(--foreground)]">{label}</span>
      {children}
      {help ? <span className="block text-xs text-[var(--muted)]">{help}</span> : null}
      {error ? <span className="block text-xs font-medium text-[var(--danger)]">{error}</span> : null}
    </label>
  );
}

const controlClass = "min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-white px-3 text-sm text-[var(--foreground)] transition duration-150 placeholder:text-[var(--subtle)] hover:border-[var(--brand)] focus:border-[var(--brand)] focus:outline-none disabled:cursor-not-allowed disabled:bg-[var(--card-muted)] disabled:text-[var(--muted)]";

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(controlClass, className)} {...props} />;
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(controlClass, "min-h-24 py-2", className)} {...props} />;
}

export function SelectInput({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx(controlClass, className)} {...props} />;
}
