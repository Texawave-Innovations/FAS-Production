// packages/ui-kit/src/select/index.tsx
import { forwardRef, type SelectHTMLAttributes } from "react";
import { cx } from "../utils/cx.js";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
  options: SelectOption[];
  placeholder?: string;
}

const BASE_STYLES =
  "h-11 w-full rounded-lg border bg-white px-3.5 text-theme-sm text-gray-900 outline-none transition-colors duration-150 focus:shadow-focus-ring disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/[0.03] dark:text-white/90";

const VALID_BORDER =
  "border-gray-300 focus:border-brand-500 dark:border-gray-700 dark:focus:border-brand-400";
const INVALID_BORDER =
  "border-error-500 focus:border-error-500 dark:border-error-500 dark:focus:border-error-500";

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { invalid = false, options, placeholder, className, "aria-invalid": ariaInvalid, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      aria-invalid={ariaInvalid ?? invalid}
      className={cx(BASE_STYLES, invalid ? INVALID_BORDER : VALID_BORDER, className)}
      {...props}
    >
      {placeholder && (
        <option value="" disabled hidden>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
    </select>
  );
});
