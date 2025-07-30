import { defineConfig } from "eslint/config";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([{
    extends: compat.extends("plugin:@typescript-eslint/recommended", "plugin:prettier/recommended"),

    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.node,
        },

        parser: tsParser,
    },

    rules: {
        quotes: ["error", "single"],
        semi: ["error", "always"],

        "@typescript-eslint/no-unused-vars": ["error", {
            argsIgnorePattern: "^_",
        }],

        "sort-imports": ["error", {
            memberSyntaxSortOrder: ["none", "all", "multiple", "single"],
        }],

        "@typescript-eslint/member-ordering": ["error"],
        "@typescript-eslint/naming-convention": ["error"],
    },
}]);
