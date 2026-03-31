import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';

export default tseslint.config(
    // 1. Global Ignores
    {
        ignores: ['dist/**', 'node_modules/**', 'coverage/**', '**/*.d.ts'],
    },

    // 2. Base ESLint recommended rules
    eslint.configs.recommended,

    // 3. TypeScript recommended rules
    ...tseslint.configs.recommended,

    // 4. Your custom rules and environment settings
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
            // Note: We don't need to explicitly pass tsParser anymore, 
            // tseslint.configs.recommended handles the parser setup under the hood!
        },
        rules: {
            // Standard ESLint Rules
            quotes: ['error', 'single'],
            semi: ['error', 'always'],
            'sort-imports': ['error', {
                memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
            }],

            // TypeScript ESLint Rules
            '@typescript-eslint/no-unused-vars': ['error', {
                argsIgnorePattern: '^_',
            }],

            '@typescript-eslint/member-ordering': ['error', {
                default: [
                    'public-static-field',
                    'protected-static-field',
                    'private-static-field',
                    'public-instance-field',
                    'protected-instance-field',
                    'private-instance-field',
                    'public-constructor',
                    'protected-constructor',
                    'private-constructor',
                    'public-static-method',
                    'protected-static-method',
                    'private-static-method',
                    'public-instance-method',
                    'protected-instance-method',
                    'private-instance-method',
                ],
            }],

            '@typescript-eslint/naming-convention': [
                'error',
                {
                    selector: ['property', 'accessor'],
                    format: ['camelCase'],
                    leadingUnderscore: 'forbid',
                },
                {
                    selector: ['property', 'accessor'],
                    modifiers: ['private'],
                    format: ['camelCase'],
                    leadingUnderscore: 'require',
                },
            ],
        },
    },

    // 5. Prettier integration 
    // (Must be last so it can override any formatting rules that conflict with Prettier)
    eslintPluginPrettierRecommended
);