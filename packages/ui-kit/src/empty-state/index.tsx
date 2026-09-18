// packages/ui-kit/src/empty-state/index.tsx
// For "no data yet" / "no search results" — never for a failed request, see
// ErrorState for that (Coding Standards: "don't use an empty state to hide
// a request failure").
import type { ReactNode } from "react";
import { cx } from "../utils/cx.js";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cx(
        "flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-200 px-6 py-12 text-center dark:border-gray-800",
        className,
      )}
    >
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-500">
          {icon}
        </div>
      )}
      <p className="text-theme-sm font-medium text-gray-700 dark:text-gray-300">{title}</p>
      {description && (
        <p className="max-w-sm text-theme-xs text-gray-500 dark:text-gray-400">{description}</p>
      )}
      {action}
    </div>
  );
}
