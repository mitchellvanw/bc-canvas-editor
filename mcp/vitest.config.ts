import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// The server runs in Node: no jsdom, no browser condition, and `$lib` pointing
// at the app's model layer exactly as the bundle resolves it.
export default defineConfig({
	resolve: {
		alias: { $lib: fileURLToPath(new URL('../web/src/lib', import.meta.url)) }
	},
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node'
	}
});
