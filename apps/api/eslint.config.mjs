import baseConfig from "@fas-erp/config/eslint.config.js";

export default [
  ...baseConfig,
  {
    rules: {
      // Nest decorators commonly take an empty class body (e.g. `export class AppModule {}`).
      "@typescript-eslint/no-extraneous-class": "off",
    },
  },
];
