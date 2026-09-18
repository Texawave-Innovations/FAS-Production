// packages/ui-kit/src/skeleton/index.tsx
import type { HTMLAttributes } from "react";
import { cx } from "../utils/cx.js";

export type SkeletonProps = HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cx("animate-pulse rounded-md bg-gray-200 dark:bg-white/10", className)}
      {...props}
    />
  );
}
