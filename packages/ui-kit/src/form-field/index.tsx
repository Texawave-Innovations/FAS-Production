// packages/ui-kit/src/form-field/index.tsx
// Composes a label + control + helper/error text with the right aria wiring
// — every form control in the app should be wrapped in this rather than each
// feature hand-rolling its own label/error markup (see LoginForm for the
// pre-FormField pattern this replaces going forward). `children` must be a
// single form-control element (Input/Select/Textarea/Checkbox) — FormField
// clones it to inject `id`/`aria-invalid`/`aria-describedby` so the caller
// never has to wire those by hand or risk the label/control/error trio
// getting out of sync.
import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";
import { cx } from "../utils/cx.js";

export interface FormFieldProps {
  label: ReactNode;
  id?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactElement<{
    id?: string;
    "aria-invalid"?: boolean;
    "aria-describedby"?: string;
  }>;
  className?: string;
}

export function FormField({
  label,
  id,
  error,
  hint,
  required,
  children,
  className,
}: FormFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;

  const control = isValidElement(children)
    ? cloneElement(children, {
        id: fieldId,
        "aria-invalid": Boolean(error),
        "aria-describedby": error ? errorId : hint ? hintId : undefined,
      })
    : children;

  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={fieldId}
        className="text-theme-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
        {required && (
          <span aria-hidden className="ml-0.5 text-error-500 dark:text-error-400">
            *
          </span>
        )}
      </label>
      {control}
      {error ? (
        <p id={errorId} role="alert" className="text-theme-xs text-error-600 dark:text-error-400">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-theme-xs text-gray-500 dark:text-gray-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
