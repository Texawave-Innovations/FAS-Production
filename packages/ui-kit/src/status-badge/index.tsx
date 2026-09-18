// packages/ui-kit/src/status-badge/index.tsx
// Renders a `statuses` row's color_token (FAS_ERP_Architecture_Guide.md
// §6.2) — every module's status display goes through this, never a
// per-module reimplementation (FAS_ERP_DESIGN_SYSTEM.md §9).
import { cx } from "../utils/cx.js";

export type StatusColorToken = "success" | "warning" | "error" | "brand" | "gray";

export interface StatusBadgeProps {
  label: string;
  colorToken: StatusColorToken;
  className?: string;
}

// Complete literal map — never `bg-${colorToken}-500/15` (see this file's
// design-doc counterpart, FAS_ERP_DESIGN_SYSTEM.md §9, for why interpolation
// silently fails to emit CSS under Tailwind v4's static scanner).
const COLOR_STYLES: Record<StatusColorToken, string> = {
  success: "bg-success-500/15 text-success-700 dark:text-success-400",
  warning: "bg-warning-500/15 text-warning-700 dark:text-warning-400",
  error: "bg-error-500/15 text-error-700 dark:text-error-400",
  brand: "bg-brand-500/15 text-brand-700 dark:text-brand-400",
  gray: "bg-gray-500/15 text-gray-700 dark:text-gray-400",
};

export function StatusBadge({ label, colorToken, className }: StatusBadgeProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-theme-xs font-medium uppercase",
        COLOR_STYLES[colorToken],
        className,
      )}
    >
      {label}
    </span>
  );
}
