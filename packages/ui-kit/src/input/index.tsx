// packages/ui-kit/src/input/index.tsx
import { forwardRef, type InputHTMLAttributes } from "react";
import { cx } from "../utils/cx.js";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

const BASE_STYLES =
  "h-11 w-full rounded-lg border bg-white px-3.5 text-theme-sm text-gray-900 outline-none transition-colors duration-150 placeholder:text-gray-400 focus:shadow-focus-ring disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-gray-500";

const VALID_BORDER =
  "border-gray-300 focus:border-brand-500 dark:border-gray-700 dark:focus:border-brand-400";
const INVALID_BORDER =
  "border-error-500 focus:border-error-500 dark:border-error-500 dark:focus:border-error-500";

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid = false, className, "aria-invalid": ariaInvalid, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={ariaInvalid ?? invalid}
      className={cx(BASE_STYLES, invalid ? INVALID_BORDER : VALID_BORDER, className)}
      {...props}
    />
  );
});
