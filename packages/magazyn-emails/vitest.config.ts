import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"server-only": path.resolve(import.meta.dirname, "src/test-stubs/server-only.ts"),
		},
	},
	test: {
		include: ["src/**/*.test.ts"],
	},
});
