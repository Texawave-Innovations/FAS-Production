// packages/ui-kit/src/checkbox/index.tsx
import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cx } from "../utils/cx.js";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, id, className, disabled, ...props },
  ref,
) {
  const input = (
    <input
      ref={ref}
      id={id}
      type="checkbox"
      disabled={disabled}
      className={cx(
        // Native checkbox styled via accent-color rather than a fully custom
        // SVG-box — keeps native keyboard/focus/AT behavior for free.
        "h-5 w-5 shrink-0 cursor-pointer rounded border-gray-300 accent-brand-500 outline-none focus-visible:shadow-focus-ring disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:accent-brand-400",
        className,
      )}
      {...props}
    />
  );

  if (!label) return input;

  return (
    <label
      htmlFor={id}
      className={cx(
        "inline-flex min-h-11 items-center gap-2 text-theme-sm text-gray-700 dark:text-gray-300",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
      )}
    >
      {input}
      {label}
    </label>
  );
});
