import js from "@eslint/js";
import astro from "eslint-plugin-astro";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      ".astro/**",
      "coverage/**",
      "shots/**",
      "artifacts/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ["tests/**/*.cjs"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    /* v2.0 测量脚本用 Playwright page.evaluate 内联浏览器上下文 */
    files: [
      "scripts/measure-image-ratio.mjs",
      "scripts/capture-editorial.mjs",
      "tests/editorial-browser.mjs",
      "tests/immersive-browser.mjs",
      "tests/carousel-navigation.mjs",
      "tests/materials-browser.mjs",
      "tests/supplement-browser.mjs",
      "tests/v11-browser.mjs",
    ],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    files: ["src/**/*.astro"],
    languageOptions: {
      parserOptions: { parser: tseslint.parser },
      globals: {
        __BUILD_COMMIT__: "readonly",
        __BUILD_TIME__: "readonly",
        __BUILD_MODE__: "readonly",
      },
    },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];
