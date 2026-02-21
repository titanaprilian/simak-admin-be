import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginPrettier from "eslint-plugin-prettier";
import configPrettier from "eslint-config-prettier";
import unusedImports from "eslint-plugin-unused-imports";

/** @type {import('eslint').Linter.Config[]} */
export default tseslint.config(
  {
    ignores: ["node_modules", "dist", ".bun", "build", "coverage"],
  },

  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    languageOptions: {
      globals: globals.node,
    },
  },

  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,

  {
    plugins: {
      "unused-imports": unusedImports,
      prettier: pluginPrettier,
    },
    rules: {
      // Prettier: Run Prettier as an ESLint rule
      "prettier/prettier": "error",

      // Unused Imports: Auto-remove them
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],

      // TypeScript overrides
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/ban-ts-comment": "warn",
    },
  },

  configPrettier,
);
