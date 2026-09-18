# FAS ERP — Design System & Theming Standard

Adapted from a TailAdmin-based reference (Tailwind CSS v4, CSS-first theme). This is now the **single source of truth for color, type, spacing, shadow, and motion** across the app — `apps/ui`, and `apps/mobile` once it starts consuming shared tokens. No component anywhere hardcodes a hex value, a raw `px` font size, or an ad-hoc `transition` duration once this is wired in. Companion docs: `docs/FAS_ERP_Architecture_Guide.md` (system design), `docs/FAS_ERP_CODING_STANDARDS.md` (code conventions).

---

## 1. Where this lives in the repo

```
packages/ui-kit/
└── src/
    └── theme.css          # the ONE @theme block — every token defined here, nowhere else
```

`apps/ui/src/app/globals.css`:

```css
@import "tailwindcss";
@import "@fas-erp/ui-kit/theme.css"; /* pulls in every token below */
@custom-variant dark (&:is(.dark *));
```

**Rule:** if you need a new color, radius, shadow, or type size, it gets added to `packages/ui-kit/src/theme.css` first, then used — never defined inline in a component's `className` or a one-off `<style>` block. This is the same "check `packages/ui-kit` before writing new shared-shaped code" rule from `FAS_ERP_CODING_STANDARDS.md` §6, applied to design tokens specifically.

---

## 2. Stack

- **Tailwind CSS v4**, theme defined entirely in CSS via `@theme { ... }` — no `tailwind.config.js`.
- **Dark mode**: class-based, `@custom-variant dark (&:is(.dark *));` — toggled by adding/removing `.dark` on `<html>`, persisted to `localStorage` (`theme-mode`: `light | dark | auto`, `auto` follows `prefers-color-scheme`).
- **Fonts**: `next/font/google` — Inter (sans, default body/UI font for ERP's dense data screens), JetBrains Mono (for anything tabular/numeric that benefits from monospace — item codes, amounts in ledgers), Merriweather (serif, reserved for print/PDF document templates — invoices, DCs — not the app UI).

---

## 3. Color tokens

### Brand (primary)

`brand-25` `#f2f7fc` · `brand-50` `#e1edf8` · `brand-100` `#c3daf0` · `brand-200` `#96bfe1` · `brand-300` `#60a5fa` · `brand-400` `#3b82f6` · **`brand-500` `#0f4c81` (base)** · `brand-600` `#0d4270` · `brand-700` `#0b3860` · `brand-800` `#092e4f` · `brand-900` `#07243e` · `brand-950` `#05192d`

### Neutral (gray)

`gray-25` `#fcfcfd` · `gray-50` `#f8fafc` · `gray-100` `#f2f4f7` · `gray-200` `#e4e7ec` · `gray-300` `#d0d5dd` · `gray-400` `#98a2b3` · `gray-500` `#667085` · `gray-600` `#475467` · `gray-700` `#344054` · `gray-800` `#1d2939` · `gray-900` `#101828` · `gray-950` `#0c111d` · `gray-dark` `#1a2231` (dark-mode surface)

### Semantic — **this is what `statuses.color_token` references**

| Token     | 500 (base) | Meaning in FAS ERP                                 |
| --------- | ---------- | -------------------------------------------------- |
| `success` | `#12b76a`  | Approved, QA-accepted, dispatched, payment cleared |
| `error`   | `#f04438`  | Rejected, QA-failed, overdue, validation failure   |
| `warning` | `#f79009`  | Pending approval, QA hold, low stock, near-due     |
| `brand`   | `#0f4c81`  | In-progress, active, default/neutral-active state  |
| `gray`    | `#667085`  | Draft, cancelled, inactive, archived               |

Full 25–950 range for each is defined in `packages/ui-kit/src/theme.css` (`--color-success-*`/`--color-error-*`/`--color-warning-*`) — the 500 values match this doc exactly, the surrounding tints/shades are the standard ramp completing them (see that file's own header comment). Use the 500 as the base and let Tailwind's opacity modifiers (`/15`, `/20`) do badge backgrounds rather than reaching for a separate light tint.

### Chart palette (categorical — dashboards, stock-level charts, production throughput)

`chart-1 #3b82f6` (blue) · `chart-2 #12b76a` (green) · `chart-3 #f79009` (amber) · `chart-4 #7a5af8` (purple) · `chart-5 #0ba5ec` (light blue)

### Base / body

`white #ffffff` · `black #101828` (this is gray-900, not pure black — never use pure `#000`) · Light body bg `#fdfdfd` · Dark body bg `#0a0f18` · Dark sidebar bg `#1a2332`

---

## 4. Dark mode substitution rules (apply every time you write a color utility)

| Light                             | Dark                                                             |
| --------------------------------- | ---------------------------------------------------------------- |
| `bg-white`                        | `dark:bg-gray-900` (or `dark:bg-white/[0.03]` for subtle panels) |
| `text-gray-800` / `text-gray-900` | `dark:text-white/90`                                             |
| `text-gray-500`                   | `dark:text-gray-400`                                             |
| `border-gray-200`                 | `dark:border-gray-800` (hairlines: `dark:border-white/[0.05]`)   |
| `hover:bg-gray-100`               | `dark:hover:bg-white/5`                                          |
| Focus ring: brand-500-based       | brand-400-based in dark                                          |

Shadows get **stronger/darker**, not lighter, in dark mode — see §6.

**Rule:** every color utility ships with its `dark:` pair in the same commit. A PR adding `bg-white` without a `dark:bg-*` next to it is incomplete, same severity as a missing test.

---

## 5. Border radius

Tailwind defaults, no custom scale: `rounded-md`/`rounded-lg` for cards, buttons, inputs (default choice — use this unless you have a reason not to), `rounded-xl`/`rounded-2xl` for cards/modals, `rounded-full` for avatars/pills/badges/icon buttons, `rounded-3xl` reserved for hero/marketing surfaces (rare in an ERP's app shell).

---

## 6. Shadows

```
--shadow-theme-xs: 0px 1px 2px 0px rgba(16,24,40,0.05)
--shadow-theme-sm: 0px 1px 3px 0px rgba(16,24,40,0.10), 0px 1px 2px 0px rgba(16,24,40,0.06)
--shadow-theme-md: 0px 4px 8px -2px rgba(16,24,40,0.10), 0px 2px 4px -2px rgba(16,24,40,0.06)
--shadow-theme-lg: 0px 12px 16px -4px rgba(16,24,40,0.08), 0px 4px 6px -2px rgba(16,24,40,0.03)
--shadow-theme-xl: 0px 20px 24px -4px rgba(16,24,40,0.08), 0px 8px 8px -4px rgba(16,24,40,0.03)
--shadow-focus-ring: 0px 0px 0px 4px rgba(15,76,129,0.12)   /* brand-500 @ 12% */
```

Dark mode: switch to pure-black rgba, higher opacity (e.g. `--shadow-theme-sm` becomes `0px 1px 3px rgba(0,0,0,0.3), 0px 1px 2px rgba(0,0,0,0.24)`; focus ring becomes `rgba(59,130,246,0.16)`, brand-400 @ 16%). Already implemented in the `.dark { }` block of `packages/ui-kit/src/theme.css` — that block is the source of truth if this doc and the file ever drift, since the file is what actually ships.

---

## 7. Typography

```
text-title-2xl: 72px / 90px      text-title-lg: 48px / 60px      text-theme-xl: 20px / 30px
text-title-xl:  60px / 72px      text-title-md: 36px / 44px      text-theme-sm: 14px / 20px
                                   text-title-sm: 30px / 38px      text-theme-xs: 12px / 18px
```

**FAS ERP usage rule (this is the "fix the standard font size" part):**

- `text-title-*` sizes are for marketing/auth screens only (login splash, empty states) — an ERP's actual working screens (tables, forms, detail views) almost never need anything above `text-theme-xl`.
- **Default body/UI text across every module: `text-theme-sm` (14px).** This is the ERP working-screen default — table cells, form labels, list rows.
- Page/section headers inside the authenticated shell: `text-theme-xl` (20px), `font-semibold`.
- Secondary/meta text (timestamps, helper text, table sub-rows): `text-theme-xs` (12px), `text-gray-500 dark:text-gray-400`.
- Body default: `font-sans font-normal tracking-[-0.01em]` — set once on `<body>`, never per-component.
- **No component picks its own font size outside this scale.** If a screen "needs" a size not listed here, that's a signal to reconsider the layout, not to add a one-off `text-[15px]`.

---

## 8. Motion

| Pattern                                                                 | Use for                                                                          |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `transition-colors duration-150`/`duration-200`                         | hover/active state on menu items, links, nav                                     |
| `transition-all duration-300 ease-in-out`                               | sidebar expand/collapse, panel open/close                                        |
| `transition-transform duration-200`                                     | chevron/arrow rotation on dropdowns                                              |
| `transition-opacity`                                                    | overlays, backdrops fade in/out                                                  |
| `duration-300 ease-linear`                                              | scroll containers, generic reveal                                                |
| `animate-ping`                                                          | live/notification status dot — reserve for status indicators only, don't overuse |
| CSS Grid accordion (`grid-template-rows: 0fr → 1fr`, 300ms ease-in-out) | sidebar submenu — smoother than `max-height` hacks                               |

**Rule of thumb:** 150–300ms, `ease-in-out` for size/position, `ease-linear` for continuous/scroll-tied motion. No animation library (Framer Motion/GSAP) — plain CSS transitions are sufficient for an ERP's UI and keep the bundle light. If a future module (e.g., a CMMS asset map, a Kanban work-order board) genuinely needs spring physics or gesture handling, that's a deliberate exception to raise in review, not a default.

---

## 9. Component conventions

- **Status badges** — read `color_token` off the `statuses` row (§6.2 of `FAS_ERP_Architecture_Guide.md`), map it to a **complete, literal** Tailwind class string per token — never build the class with string interpolation (`` `bg-${token}-500/15` ``). Tailwind v4's compiler statically scans source for whole class names; an interpolated `bg-${token}-...` string is never emitted because no literal `bg-success-500/15` (etc.) appears anywhere in the source for the scanner to find. Use a literal lookup object instead, one entry per semantic token — this is the same pattern `apps/ui/src/components/Toast/index.tsx`'s `VARIANT_STYLES` already uses for the four toast variants; a `<StatusBadge />` (or any future token-driven variant component) in `packages/ui-kit` follows the identical shape:
  ```ts
  const STATUS_BADGE_STYLES: Record<"success" | "warning" | "error" | "brand" | "gray", string> = {
    success: "bg-success-500/15 text-success-700 dark:text-success-400",
    warning: "bg-warning-500/15 text-warning-700 dark:text-warning-400",
    error: "bg-error-500/15 text-error-700 dark:text-error-400",
    brand: "bg-brand-500/15 text-brand-700 dark:text-brand-400",
    gray: "bg-gray-500/15 text-gray-700 dark:text-gray-400",
  };
  // render: `rounded-full px-2.5 py-0.5 text-theme-xs font-medium uppercase ${STATUS_BADGE_STYLES[colorToken]}`
  ```
  One `<StatusBadge status={status} />` widget in `packages/ui-kit`, used by every module — never a per-module reimplementation.
- **Nav active state**: `bg-brand-400/[0.16] text-white` (active) vs `text-gray-300 hover:bg-white/5 hover:text-gray-100` (inactive) — tint, not solid fill.
- **Scrollbars**: shared thin-scrollbar utility, `bg-gray-200 dark:bg-gray-700` thumb, rounded-full; `no-scrollbar` utility for hiding entirely (e.g. horizontally-scrolling table wrappers).
- **Charts (ApexCharts)** — used for dashboards (production throughput, stock levels, sales trends): axis/legend `text-gray-700 dark:text-gray-400`, gridlines `stroke-gray-100 dark:stroke-gray-800`, tooltip `border-gray-200 dark:border-gray-800 dark:bg-gray-900`, `shadow-theme-sm`. Use the `chart-1..5` palette in order for multi-series charts, never ad-hoc hex.
- **Data tables** (the most common surface in an ERP — item lists, work order lists, ledgers): header row `bg-gray-50 dark:bg-white/[0.03] text-theme-xs text-gray-500 uppercase`, row hover `hover:bg-gray-50 dark:hover:bg-white/5`, row text `text-theme-sm`. Build this once as `packages/ui-kit`'s `<DataTable />`, every module's list screen consumes it rather than hand-rolling a `<table>`.

---

## 9A. Component library (`packages/ui-kit`)

Every primitive below is a real, typed, working component — not pseudocode to copy — imported as `import { X } from "@fas-erp/ui-kit"`. Each has light/dark styling, a disabled/loading/error state where applicable, and keeps the 44×44px minimum touch target (§ Responsive standard) on interactive elements. `apps/ui/src/components/Toast` (transient notifications) and `apps/ui/src/features/*` (domain-aware widgets — anything that reads `statuses` or calls a hook that hits the API) are deliberately **not** here — see `FAS_ERP_CODING_STANDARDS.md` §4's primitive-vs-widget line.

| Component                     | Path                             | States it covers                                                                                                                                                                                       |
| ----------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Button`, `IconButton`        | `button/`                        | `loading` (spinner, `aria-busy`), `disabled`, 5 variants incl. `danger`                                                                                                                                |
| `Input`, `Textarea`, `Select` | `input/`, `textarea/`, `select/` | `invalid` (red border + `aria-invalid`), `disabled`, placeholder                                                                                                                                       |
| `Checkbox`                    | `checkbox/`                      | optional inline `label`, `disabled`                                                                                                                                                                    |
| `FormField`                   | `form-field/`                    | wires `label`/`error`/`hint` to the control's `id`/`aria-describedby`/`aria-invalid` automatically via `cloneElement` — wrap any single control in it instead of hand-wiring those attributes per form |
| `Card`                        | `card/`                          | — (layout primitive)                                                                                                                                                                                   |
| `Alert`                       | `alert/`                         | 4 semantic variants, icon + text (never color alone, per the accessibility note below)                                                                                                                 |
| `Skeleton`                    | `skeleton/`                      | the loading building block `DataTable` uses internally; use directly for non-table loading placeholders                                                                                                |
| `EmptyState`                  | `empty-state/`                   | "no data" / "no search results" — never for a failed request                                                                                                                                           |
| `ErrorState`                  | `error-state/`                   | failed request + optional `onRetry` — never substitute `EmptyState` for this                                                                                                                           |
| `StatusBadge`                 | `status-badge/`                  | renders a `statuses` row's `color_token` (Architecture Guide §6.2) via the literal class map in §9 above                                                                                               |
| `DataTable`                   | `data-table/`                    | `isLoading` (skeleton rows), `isError` (`ErrorState` + `onRetry`), empty (`EmptyState`), populated, with a deliberate `overflow-x-auto` wrapper                                                        |
| `Pagination`                  | `pagination/`                    | consumes the backend's `{page, limit, total, totalPages}` shape directly (`common/dto/paginated-response.dto.ts`'s `PaginationMeta`, unwrapped by the API client)                                      |

None of these call the API or know about a business entity — a feature composes them with its own query hooks (§19A of `FAS_ERP_CODING_STANDARDS.md`) and domain data.

---

## 10. `theme.css` (packages/ui-kit/src/theme.css)

The full brand/gray/semantic/chart palette, typography scale, and light+dark shadow tables from §3–§7 above are implemented verbatim in `packages/ui-kit/src/theme.css` — that file, not this doc, is the source of truth if the two ever drift (a token value only changes by editing the file; this doc gets updated to match, not the other way around). The shape:

```css
@import "tailwindcss";
@custom-variant dark (&:is(.dark *));

@theme {
  --color-brand-500: #0f4c81;
  /* ...full brand/gray/semantic/chart scales... */
  --font-sans: var(--font-inter);
  --shadow-theme-sm: 0px 1px 3px 0px rgba(16, 24, 40, 0.1), 0px 1px 2px 0px rgba(16, 24, 40, 0.06);
  --shadow-focus-ring: 0px 0px 0px 4px rgba(15, 76, 129, 0.12);
}

.dark {
  --shadow-theme-sm: 0px 1px 3px 0px rgba(0, 0, 0, 0.3), 0px 1px 2px 0px rgba(0, 0, 0, 0.24);
  --shadow-focus-ring: 0px 0px 0px 4px rgba(59, 130, 246, 0.16);
}
```

---

## 11. Enforcement

`apps/ui/eslint.config.mjs` registers `eslint-plugin-tailwindcss`'s `tailwindcss/no-arbitrary-value` as an error — verified it catches real violations (`w-[20rem]`, `text-[13px]`) while correctly _not_ flagging an opacity modifier on a real token (`bg-white/[0.03]`, used throughout the dark-mode substitution table in §4), so it doesn't fight the doc's own prescribed patterns. Scoped to `apps/ui` only, not `packages/config`'s shared base — `packages/ui-kit`'s own components are the ones defining the token scale in the first place, and `packages/core`/`apps/api` have no `className` strings to check at all, so adding a Tailwind-aware plugin there would be pure overhead.

PR checklist (`FAS_ERP_CODING_STANDARDS.md` §9) already has the matching line:

> - [ ] No hardcoded hex/px colors or font sizes — uses tokens from `packages/ui-kit/src/theme.css`.
