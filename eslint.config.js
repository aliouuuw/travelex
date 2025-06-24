import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReactConfig from "eslint-plugin-react/configs/recommended.js";
import tanstackQuery from "@tanstack/eslint-plugin-query";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";


export default tseslint.config(
  {
    ignores: ["dist", "node_modules", "eslint.config.js"],
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    ...pluginReactConfig,
    languageOptions: {
      ...pluginReactConfig.languageOptions,
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: { ...globals.browser, ...globals.es2020 },
    },
    plugins: {
      "react-refresh": reactRefresh,
      "react-hooks": reactHooks,
      "@tanstack/query": tanstackQuery,
    },
    rules: {
      ...tanstackQuery.configs.recommended.rules,
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  ...tseslint.configs.recommended,
);
