import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default tseslint.config(
	eslint.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	{
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
			globals: {
				...globals.node,
				...globals.browser,
			},
		},
		rules: {
			"@typescript-eslint/no-explicit-any": "error",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{ argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
			],
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-call": "off",
			"@typescript-eslint/no-unsafe-return": "off",
			"@typescript-eslint/no-unnecessary-condition": "off",
			"@typescript-eslint/no-confusing-void-expression": "off",
			"@typescript-eslint/no-floating-promises": "off",
			"@typescript-eslint/no-misused-promises": "off",
			"@typescript-eslint/restrict-template-expressions": "off",
			"@typescript-eslint/no-base-to-string": "off",
			"@typescript-eslint/no-redundant-type-constituents": "off",
			"@typescript-eslint/await-thenable": "off",
			"@typescript-eslint/require-await": "off",
			"@typescript-eslint/no-require-imports": "off",
			"@typescript-eslint/no-unnecessary-type-assertion": "warn",
			"no-useless-assignment": "off",
			"@typescript-eslint/consistent-type-imports": [
				"error",
				{ prefer: "type-imports", fixStyle: "inline-type-imports" },
			],
		},
	},
	{
		files: ["**/*.{tsx,jsx}"],
		plugins: {
			react: reactPlugin,
			"react-hooks": reactHooks,
		},
		settings: {
			react: { version: "detect" },
		},
		rules: {
			...reactHooks.configs.recommended.rules,
			"react/react-in-jsx-scope": "off",
			"react-hooks/set-state-in-effect": "off",
			"react-hooks/preserve-manual-memoization": "off",
			"react-hooks/refs": "off",
			"react-hooks/immutability": "off",
			"react-hooks/purity": "off",
			"react-hooks/static-components": "off",
		},
	},
	{
		files: ["packages/types/**/*.ts"],
		rules: {
			"@typescript-eslint/no-deprecated": "off",
		},
	},
	{
		files: ["**/*.{test,spec}.{ts,tsx}", "**/tests/**/*.{ts,tsx}"],
		rules: {
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-call": "off",
		},
	},
	{
		ignores: [
			"**/dist/**",
			"**/.next/**",
			"**/.medusa/**",
			"**/node_modules/**",
			"**/.turbo/**",
			"**/scripts/**",
			"**/*.mjs",
			"**/vitest.config.ts",
			"**/playwright.config.ts",
		],
	},
);
