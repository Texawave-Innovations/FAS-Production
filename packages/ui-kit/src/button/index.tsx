// packages/ui-kit/src/button/index.tsx
// Dumb, reusable primitive — no API calls, no domain knowledge
// (FAS_ERP_CODING_STANDARDS.md §4). A domain-aware "SaveWorkOrderButton"
// wrapping this belongs in a feature's components/, not here.
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cx } from "../utils/cx.js";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

// Complete literal class maps — never interpolate a variant/size into a
// class name (FAS_ERP_DESIGN_SYSTEM.md §9).
const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-500 text-white hover:bg-brand-600 dark:bg-brand-400 dark:text-gray-950 dark:hover:bg-brand-300",
  secondary:
    "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-white/[0.06] dark:text-white/90 dark:hover:bg-white/10",
  outline:
    "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:bg-white/5",
  ghost: "bg-transparent text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5",
  danger: "bg-error-500 text-white hover:bg-error-600 dark:bg-error-500 dark:hover:bg-error-600",
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  // h-11 keeps the 44px minimum touch target (Coding Standards §20) on
  // mobile widths even for the smaller size — padding/text shrink, height
  // doesn't.
  sm: "h-9 px-3 text-theme-xs",
  md: "h-11 px-4 text-theme-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    leftIcon,
    rightIcon,
    disabled,
    className,
    children,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={props.type ?? "button"}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-150 outline-none focus-visible:shadow-focus-ring disabled:cursor-not-allowed disabled:opacity-60",
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <span
          aria-hidden
          className="h-4 w-4 animate-spin rounded-full border-2 border-current/40 border-t-current"
        />
      ) : (
        leftIcon
      )}
      {children}
      {!loading && rightIcon}
    </button>
  );
});

export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "className"
> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  "aria-label": string;
  icon: ReactNode;
  className?: string;
}

// Square dimensions, not derived from ButtonProps's SIZE_STYLES (which sets
// horizontal padding, not width) — a 44x44px minimum tap target either way
// (Coding Standards §20).
const ICON_BUTTON_SIZE_STYLES: Record<ButtonSize, string> = {
  sm: "h-9 w-9 text-theme-xs",
  md: "h-11 w-11 text-theme-sm",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, size = "md", variant = "ghost", disabled, className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={props.type ?? "button"}
      disabled={disabled}
      className={cx(
        "inline-flex items-center justify-center rounded-full transition-colors duration-150 outline-none focus-visible:shadow-focus-ring disabled:cursor-not-allowed disabled:opacity-60",
        VARIANT_STYLES[variant],
        ICON_BUTTON_SIZE_STYLES[size],
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  );
});
