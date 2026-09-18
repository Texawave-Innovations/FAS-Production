import baseConfig from "@fas-erp/config/eslint.config.js";

// Expo scaffold (Phase 0 per FAS_ERP_Architecture_Guide.md §5) — no
// react-native-specific plugin yet since there's nothing here beyond the
// generated App.tsx; add eslint-plugin-react/react-native when real screens
// land, not speculatively.
export default [
  ...baseConfig,
  {
    ignores: [".expo/**", "android/**", "ios/**"],
  },
  {
    // Same "frontend must not import database internals" rule as apps/ui —
    // see that config's comment.
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@fas-erp/database",
              message: "Frontend code must not import database internals — use @fas-erp/api-types for wire shapes instead.",
            },
            {
              name: "@prisma/client",
              message: "Frontend code must not import Prisma types directly — use @fas-erp/api-types for wire shapes instead.",
            },
          ],
        },
      ],
    },
  },
];
