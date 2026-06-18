import type { ReactNode } from "react";

import { cx } from "@/lib/ui";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
};

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  empty,
  renderMobileCard,
}: {
  rows: T[];
  columns: Array<DataTableColumn<T>>;
  rowKey: (row: T) => string;
  empty: ReactNode;
  renderMobileCard: (row: T) => ReactNode;
}) {
  if (rows.length === 0) {
    return <>{empty}</>;
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border)] bg-white">
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-[var(--card-muted)] text-xs font-medium text-[var(--muted)]">
            <tr>
              {columns.map((column) => (
                <th className="px-4 py-3" key={column.key} scope="col">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-soft)]">
            {rows.map((row) => (
              <tr className="transition duration-150 hover:bg-[var(--card-muted)]" key={rowKey(row)}>
                {columns.map((column) => (
                  <td className={cx("px-4 py-3 align-middle", column.className)} key={column.key}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-[var(--border-soft)] md:hidden">
        {rows.map((row) => (
          <article className="p-4" key={rowKey(row)}>
            {renderMobileCard(row)}
          </article>
        ))}
      </div>
    </div>
  );
}
