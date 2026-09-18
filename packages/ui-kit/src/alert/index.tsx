// packages/ui-kit/src/alert/index.tsx
// A static, inline banner — distinct from Toast (apps/ui/src/components/Toast,
// transient/auto-dismissing, app-local since it's not DOM-portable to
// apps/mobile). Alert is framework-agnostic-safe (no portal, no timers) so it
// lives here in ui-kit.
import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../utils/cx.js";

export type AlertVariant = "success" | "error" | "warning" | "info";

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  variant?: AlertVariant;
  title?: ReactNode;
}

// Complete literal maps — same rule as StatusBadge/Toast (§9).
const VARIANT_STYLES: Record<AlertVariant, string> = {
  success:
    "border-success-500/20 bg-success-500/10 text-success-700 dark:border-success-500/30 dark:bg-success-500/15 dark:text-success-400",
  error:
    "border-error-500/20 bg-error-500/10 text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400",
  warning:
    "border-warning-500/20 bg-warning-500/10 text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/15 dark:text-warning-400",
  info: "border-brand-500/20 bg-brand-500/10 text-brand-700 dark:border-brand-400/30 dark:bg-brand-400/15 dark:text-brand-400",
};

// Status is never color-only (Coding Standards' accessibility expectations)
// — each variant gets its own glyph, not just a different hue.
const VARIANT_ICON: Record<AlertVariant, string> = {
  success: "✓",
  error: "✕",
  warning: "!",
  info: "i",
};

export function Alert({ variant = "info", title, className, children, ...props }: AlertProps) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cx(
        "flex items-start gap-3 rounded-lg border px-4 py-3 text-theme-sm",
        VARIANT_STYLES[variant],
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-current/15 text-theme-xs font-bold"
      >
        {VARIANT_ICON[variant]}
      </span>
      <div className="flex flex-col gap-0.5">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className="text-current/90">{children}</div>}
      </div>
    </div>
  );
}
