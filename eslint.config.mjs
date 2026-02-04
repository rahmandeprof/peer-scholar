// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import unusedImports from 'eslint-plugin-unused-imports';
// @ts-ignore
import importPlugin from 'eslint-plugin-import';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import stylistic from '@stylistic/eslint-plugin';
import globals from 'globals';

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  importPlugin.flatConfigs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    plugins: {
      'unused-imports': unusedImports,
      'simple-import-sort': simpleImportSort,
      '@stylistic': stylistic,
    },
    rules: {
      'no-unused-vars': 'off',
      'unused-imports/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'warn',
      'padding-line-between-statements': [
        'warn',
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
        {
          blankLine: 'any',
          prev: ['const', 'let', 'var'],
          next: ['const', 'let', 'var'],
        },
      ],
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^@nestjs'], // Nestjs imports
            ['\\.module$'], // Module imports
            ['\\.provider$'], // Provider imports
            ['\\.interceptor$'], // Interceptor imports
            ['\\.guard$'], // Guard imports
            ['\\.strategy$'], // Strategy imports
            ['\\.decorator$'], // Decorator imports
            ['\\.validation$'], // Validation imports
            ['\\.entity$'], // Entity imports
            ['\\.dto$'], // Dto imports
            ['\\.controller$'], // Controller imports
            ['\\.service$'], // Service imports
            ['^'], // Other imports
            ['^@?\\w'], // Other node_modules
            ['^\\.'], // Relative imports
          ],
        },
      ],
      'no-console': 'warn',
      'no-implied-eval': 'error',
      'no-empty-function': 'off',
      'no-else-return': 'error',
      'no-await-in-loop': 'warn',
      'no-duplicate-case': 'error',
      'no-inner-declarations': 'error',
      'func-style': ['error', 'declaration', { allowArrowFunctions: true }],
      'no-trailing-spaces': 'error',
      'require-await': 'off',
      indent: 'off',
      'max-params': 'off',
      'no-shadow': 'off',
      'no-nested-ternary': 'warn',
      '@stylistic/block-spacing': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/array-type': 'error',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/no-empty-function': [
        'error',
        { allow: ['constructors'] },
      ],
      '@typescript-eslint/no-loop-func': 'error',
      '@typescript-eslint/no-array-constructor': 'error',
      '@typescript-eslint/no-base-to-string': 'error',
      '@typescript-eslint/no-duplicate-enum-values': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-implied-eval': 'error',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-var-requires': 'error',
      '@typescript-eslint/restrict-plus-operands': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'off',
      '@typescript-eslint/no-shadow': 'error',
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',
      // Relaxed rules to reduce strict errors
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',

      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-deprecated': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/use-unknown-in-catch-callback-variable': 'off',
      '@typescript-eslint/no-unnecessary-type-parameters': 'off',
      '@typescript-eslint/return-await': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-misused-spread': 'warn',
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',

      'import/named': 'off',
      'import/no-unresolved': 'off',
    },
  },
  eslintPluginPrettierRecommended,
  {
    rules: {
      'prettier/prettier': 'warn',
    },
  },
);
