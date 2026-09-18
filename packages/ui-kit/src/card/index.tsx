// packages/ui-kit/src/card/index.tsx
import type { HTMLAttributes } from "react";
import { cx } from "../utils/cx.js";

export type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cx(
        "rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-md dark:border-gray-800 dark:bg-white/[0.03]",
        className,
      )}
      {...props}
    />
  );
}
