// packages/ui-kit/src/textarea/index.tsx
import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cx } from "../utils/cx.js";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

const BASE_STYLES =
  "min-h-24 w-full rounded-lg border bg-white px-3.5 py-2.5 text-theme-sm text-gray-900 outline-none transition-colors duration-150 placeholder:text-gray-400 focus:shadow-focus-ring disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-gray-500";

const VALID_BORDER =
  "border-gray-300 focus:border-brand-500 dark:border-gray-700 dark:focus:border-brand-400";
const INVALID_BORDER =
  "border-error-500 focus:border-error-500 dark:border-error-500 dark:focus:border-error-500";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid = false, className, "aria-invalid": ariaInvalid, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      aria-invalid={ariaInvalid ?? invalid}
      className={cx(BASE_STYLES, invalid ? INVALID_BORDER : VALID_BORDER, className)}
      {...props}
    />
  );
});
