// packages/ui-kit — shared design-system primitives (web-focused, used by
// apps/ui). Design tokens live in ./theme.css (Tailwind v4).
//
// Dumb, reusable, no API calls, no domain knowledge (FAS_ERP_CODING_STANDARDS.md
// §4). A component that reads from `statuses` or calls a hook that hits the
// API is a widget — it belongs in a feature's components/, not here.
export * from "./alert/index.js";
export * from "./button/index.js";
export * from "./card/index.js";
export * from "./checkbox/index.js";
export * from "./data-table/index.js";
export * from "./empty-state/index.js";
export * from "./error-state/index.js";
export * from "./form-field/index.js";
export * from "./input/index.js";
export * from "./pagination/index.js";
export * from "./select/index.js";
export * from "./skeleton/index.js";
export * from "./status-badge/index.js";
export * from "./textarea/index.js";
