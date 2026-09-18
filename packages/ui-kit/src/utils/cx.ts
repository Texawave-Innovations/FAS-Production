// packages/ui-kit/src/utils/cx.ts
// Minimal className joiner — every primitive in this package uses complete,
// literal Tailwind class strings (FAS_ERP_DESIGN_SYSTEM.md §9's rule against
// dynamic class interpolation), so there's never a conflicting-utility case
// that would need clsx/tailwind-merge's dedup logic — a plain join is enough
// and keeps this package dependency-free.
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
