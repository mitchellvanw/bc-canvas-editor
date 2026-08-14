import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [svelte({ compilerOptions: { runes: true } })],
	resolve: {
		alias: { $lib: fileURLToPath(new URL('./web/src/lib', import.meta.url)) },
		// Svelte component tests mount the client runtime under jsdom.
		conditions: ['browser']
	},
	test: {
		include: [
			'web/src/**/*.test.ts',
			'cli/**/*.test.ts',
			'remark/**/*.test.ts',
			'vscode/**/*.test.ts'
		]
	}
});
