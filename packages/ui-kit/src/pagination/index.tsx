// packages/ui-kit/src/pagination/index.tsx
// Shape matches apps/api's PaginationMeta (common/dto/paginated-response.dto.ts)
// as unwrapped by packages/core's API client — { page, limit, total,
// totalPages } — so a list screen can pass its query response's `meta`
// straight through without reshaping it.
import { Button } from "../button/index.js";
import { cx } from "../utils/cx.js";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ meta, onPageChange, className }: PaginationProps) {
  const { page, limit, total, totalPages } = meta;
  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, total);

  return (
    <div
      className={cx(
        "flex flex-col items-center justify-between gap-3 border-t border-gray-200 px-2 py-3 text-theme-xs text-gray-500 sm:flex-row dark:border-gray-800 dark:text-gray-400",
        className,
      )}
    >
      <p aria-live="polite">
        {total === 0 ? "No results" : `Showing ${rangeStart}–${rangeEnd} of ${total}`}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          Previous
        </Button>
        <span aria-current="page" className="px-1 text-gray-700 dark:text-gray-300">
          Page {page} of {Math.max(totalPages, 1)}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
