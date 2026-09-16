# FAS ERP — Design System & Theming Standard

Adapted from a TailAdmin-based reference (Tailwind CSS v4, CSS-first theme). This is now the **single source of truth for color, type, spacing, shadow, and motion** across the app — `apps/ui`, and `apps/mobile` once it starts consuming shared tokens. No component anywhere hardcodes a hex value, a raw `px` font size, or an ad-hoc `transition` duration once this is wired in. Companion docs: `docs/ARCHITECTURE.md` (system design), `docs/CODING_STANDARDS.md` (code conventions).

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
@import "@fas-erp/ui-kit/theme.css";   /* pulls in every token below */
@custom-variant dark (&:is(.dark *));
```

**Rule:** if you need a new color, radius, shadow, or type size, it gets added to `packages/ui-kit/src/theme.css` first, then used — never defined inline in a component's `className` or a one-off `<style>` block. This is the same "check `packages/ui-kit` before writing new shared-shaped code" rule from `CODING_STANDARDS.md` §6, applied to design tokens specifically.

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
| Token | 500 (base) | Meaning in FAS ERP |
|---|---|---|
| `success` | `#12b76a` | Approved, QA-accepted, dispatched, payment cleared |
| `error` | `#f04438` | Rejected, QA-failed, overdue, validation failure |
| `warning` | `#f79009` | Pending approval, QA hold, low stock, near-due |
| `brand` | `#0f4c81` | In-progress, active, default/neutral-active state |
| `gray` | `#667085` | Draft, cancelled, inactive, archived |

Full 25–950 range for each exists in the palette (see original reference); use the 500 as the base and let Tailwind's opacity modifiers (`/15`, `/20`) do badge backgrounds rather than reaching for a separate light tint.

### Chart palette (categorical — dashboards, stock-level charts, production throughput)
`chart-1 #3b82f6` (blue) · `chart-2 #12b76a` (green) · `chart-3 #f79009` (amber) · `chart-4 #7a5af8` (purple) · `chart-5 #0ba5ec` (light blue)

### Base / body
`white #ffffff` · `black #101828` (this is gray-900, not pure black — never use pure `#000`) · Light body bg `#fdfdfd` · Dark body bg `#0a0f18` · Dark sidebar bg `#1a2332`

---

## 4. Dark mode substitution rules (apply every time you write a color utility)

| Light | Dark |
|---|---|
| `bg-white` | `dark:bg-gray-900` (or `dark:bg-white/[0.03]` for subtle panels) |
| `text-gray-800` / `text-gray-900` | `dark:text-white/90` |
| `text-gray-500` | `dark:text-gray-400` |
| `border-gray-200` | `dark:border-gray-800` (hairlines: `dark:border-white/[0.05]`) |
| `hover:bg-gray-100` | `dark:hover:bg-white/5` |
| Focus ring: brand-500-based | brand-400-based in dark |

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

Dark mode: switch to pure-black rgba, higher opacity (e.g. `--shadow-theme-sm` becomes `0px 1px 3px rgba(0,0,0,0.3), 0px 1px 2px rgba(0,0,0,0.24)`; focus ring becomes `rgba(59,130,246,0.16)`, brand-400 @ 16%). Full table in the original reference — copy verbatim into the `.dark { }` block of `theme.css`.

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

| Pattern | Use for |
|---|---|
| `transition-colors duration-150`/`duration-200` | hover/active state on menu items, links, nav |
| `transition-all duration-300 ease-in-out` | sidebar expand/collapse, panel open/close |
| `transition-transform duration-200` | chevron/arrow rotation on dropdowns |
| `transition-opacity` | overlays, backdrops fade in/out |
| `duration-300 ease-linear` | scroll containers, generic reveal |
| `animate-ping` | live/notification status dot — reserve for status indicators only, don't overuse |
| CSS Grid accordion (`grid-template-rows: 0fr → 1fr`, 300ms ease-in-out) | sidebar submenu — smoother than `max-height` hacks |

**Rule of thumb:** 150–300ms, `ease-in-out` for size/position, `ease-linear` for continuous/scroll-tied motion. No animation library (Framer Motion/GSAP) — plain CSS transitions are sufficient for an ERP's UI and keep the bundle light. If a future module (e.g., a CMMS asset map, a Kanban work-order board) genuinely needs spring physics or gesture handling, that's a deliberate exception to raise in review, not a default.

---

## 9. Component conventions

- **Status badges** — read `color_token` off the `statuses` row (§6.2 of `ARCHITECTURE.md`), map to the semantic token, render as `rounded-full px-2.5 py-0.5 text-theme-xs font-medium uppercase bg-{token}-500/15 text-{token}-700 dark:text-{token}-400`. One `<StatusBadge status={status} />` widget in `packages/ui-kit`, used by every module — never a per-module reimplementation.
- **Nav active state**: `bg-brand-400/[0.16] text-white` (active) vs `text-gray-300 hover:bg-white/5 hover:text-gray-100` (inactive) — tint, not solid fill.
- **Scrollbars**: shared thin-scrollbar utility, `bg-gray-200 dark:bg-gray-700` thumb, rounded-full; `no-scrollbar` utility for hiding entirely (e.g. horizontally-scrolling table wrappers).
- **Charts (ApexCharts)** — used for dashboards (production throughput, stock levels, sales trends): axis/legend `text-gray-700 dark:text-gray-400`, gridlines `stroke-gray-100 dark:stroke-gray-800`, tooltip `border-gray-200 dark:border-gray-800 dark:bg-gray-900`, `shadow-theme-sm`. Use the `chart-1..5` palette in order for multi-series charts, never ad-hoc hex.
- **Data tables** (the most common surface in an ERP — item lists, work order lists, ledgers): header row `bg-gray-50 dark:bg-white/[0.03] text-theme-xs text-gray-500 uppercase`, row hover `hover:bg-gray-50 dark:hover:bg-white/5`, row text `text-theme-sm`. Build this once as `packages/ui-kit`'s `<DataTable />`, every module's list screen consumes it rather than hand-rolling a `<table>`.

---

## 10. `theme.css` starter (paste and extend with the full palette from §3)

```css
@import "tailwindcss";
@custom-variant dark (&:is(.dark *));

@theme {
  --color-brand-500: #0f4c81;
  --color-brand-400: #3b82f6;
  /* ...full brand/gray/semantic scales from §3... */

  --font-sans: var(--font-inter);
  --font-mono: var(--font-jetbrains-mono);
  --font-serif: var(--font-merriweather);

  --shadow-theme-sm: 0px 1px 3px 0px rgba(16,24,40,0.10), 0px 1px 2px 0px rgba(16,24,40,0.06);
  --shadow-focus-ring: 0px 0px 0px 4px rgba(15,76,129,0.12);
}

.dark {
  --shadow-focus-ring: 0px 0px 0px 4px rgba(59,130,246,0.16);
}
```

---

## 11. Enforcement

Add to `packages/config`'s ESLint (alongside the `sonarjs`/`import` rules already in `CODING_STANDARDS.md` §6): `eslint-plugin-tailwindcss`'s `no-arbitrary-value` (or a custom rule) to flag raw hex/px in `className` strings — same enforcement philosophy as the "reuse, don't recreate" rule: a lint failure, not a style guide nobody reads. Add one line to the PR checklist in `CODING_STANDARDS.md` §9:

> - [ ] No hardcoded hex/px colors or font sizes — uses tokens from `packages/ui-kit/src/theme.css`.
