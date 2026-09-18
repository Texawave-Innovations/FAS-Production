import reactHooks from "eslint-plugin-react-hooks";
import baseConfig from "@fas-erp/config/eslint.config.js";

export default [
  ...baseConfig,
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
];
