// packages/ui-kit/src/data-table/index.tsx
// The shared list-screen table (FAS_ERP_DESIGN_SYSTEM.md §9: "build this
// once ... every module's list screen consumes it rather than hand-rolling a
// <table>"). Deliberately data/rendering-only — no fetching, no pagination
// logic (pair it with <Pagination /> and a query hook in the feature that
// owns the data), no per-module knowledge.
import type { ReactNode } from "react";
import { EmptyState } from "../empty-state/index.js";
import { ErrorState } from "../error-state/index.js";
import { Skeleton } from "../skeleton/index.js";
import { cx } from "../utils/cx.js";

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  // Right-align numeric/amount columns per FAS_ERP_DESIGN_SYSTEM.md's
  // JetBrains Mono guidance for tabular/numeric data.
  align?: "left" | "right";
  className?: string;
}

export interface DataTableProps<T> {
  columns: Array<DataTableColumn<T>>;
  rows: T[];
  getRowKey: (row: T) => string | number;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  emptyTitle?: ReactNode;
  emptyDescription?: ReactNode;
  onRowClick?: (row: T) => void;
  loadingRowCount?: number;
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  isLoading = false,
  isError = false,
  onRetry,
  emptyTitle = "No records",
  emptyDescription,
  onRowClick,
  loadingRowCount = 5,
}: DataTableProps<T>) {
  if (isError) {
    return <ErrorState title="Couldn't load this list" onRetry={onRetry} />;
  }

  if (!isLoading && rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    // Deliberate horizontal scroll container, not an accidental overflow —
    // Coding Standards §20's "no horizontal scroll on a table at 375px
    // unless wrapped in overflow-x-auto on purpose."
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
      <table className="w-full min-w-max border-collapse text-left">
        <thead className="bg-gray-50 text-theme-xs text-gray-500 uppercase dark:bg-white/[0.03] dark:text-gray-400">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cx(
                  "px-4 py-3 font-medium",
                  column.align === "right" && "text-right",
                  column.className,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
          {isLoading
            ? Array.from({ length: loadingRowCount }).map((_, rowIndex) => (
                <tr key={rowIndex}>
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3">
                      <Skeleton className="h-4 w-full max-w-32" />
                    </td>
                  ))}
                </tr>
              ))
            : rows.map((row) => (
                <tr
                  key={getRowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cx(
                    "text-theme-sm text-gray-700 dark:text-gray-300",
                    onRowClick && "cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5",
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cx(
                        "px-4 py-3",
                        column.align === "right" && "text-right font-mono",
                        column.className,
                      )}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}
