import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

import { cx } from "@/lib/ui";

export function Field({
  id,
  htmlFor,
  label,
  help,
  helpId,
  error,
  errorId,
  className,
  children,
}: {
  id?: string;
  htmlFor?: string;
  label: string;
  help?: string;
  helpId?: string;
  error?: string;
  errorId?: string;
  className?: string;
  children: ReactNode;
}) {
  const controlId = htmlFor ?? id;
  const resolvedHelpId = help ? (helpId ?? (controlId ? `${controlId}-help` : undefined)) : undefined;
  const resolvedErrorId = error ? (errorId ?? (controlId ? `${controlId}-error` : undefined)) : undefined;

  return (
    <div className={cx("block space-y-2", className)}>
      <label className="block text-sm font-medium text-[var(--foreground)]" htmlFor={controlId}>
        {label}
      </label>
      {children}
      {help ? (
        <p className="text-xs text-[var(--muted)]" id={resolvedHelpId}>
          {help}
        </p>
      ) : null}
      {error ? (
        <p className="text-xs font-medium text-[var(--danger)]" id={resolvedErrorId}>
          {error}
        </p>
      ) : null}
    </div>
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
