// packages/ui-kit/src/error-state/index.tsx
// For a failed request with a retry — the counterpart EmptyState must never
// substitute for (Coding Standards: "don't use an empty state to hide a
// request failure").
import type { ReactNode } from "react";
import { Button } from "../button/index.js";
import { cx } from "../utils/cx.js";

export interface ErrorStateProps {
  title?: ReactNode;
  description?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
  retryLabel = "Retry",
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cx(
        "flex flex-col items-center gap-3 rounded-2xl border border-error-500/20 bg-error-500/5 px-6 py-12 text-center dark:border-error-500/30 dark:bg-error-500/10",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error-500/15 text-theme-sm font-bold text-error-600 dark:text-error-400">
        !
      </div>
      <p className="text-theme-sm font-medium text-gray-700 dark:text-gray-300">{title}</p>
      {description && (
        <p className="max-w-sm text-theme-xs text-gray-500 dark:text-gray-400">{description}</p>
      )}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
