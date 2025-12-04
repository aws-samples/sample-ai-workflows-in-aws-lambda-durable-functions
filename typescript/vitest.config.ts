import path from "path";
import { defineConfig } from "vitest/config";
export default defineConfig({
	test: {
		globals: true,
	},
	resolve: {
		alias: {
			"@aws/durable-execution-sdk-js-testing": path.resolve(
				import.meta.dirname,
				"node_modules/@aws/durable-execution-sdk-js-testing/dist-cjs/index.js",
			),
			"@aws/durable-execution-sdk-js": path.resolve(
				import.meta.dirname,
				"node_modules/@aws/durable-execution-sdk-js/dist-cjs/index.js",
			),
		},
	},
});
