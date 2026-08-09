/**
 * One bundle, `dist/server.js`, executable and pointed at by `bin`.
 *
 * Bundling is what lets the server reuse `src/lib/model/*` unchanged: esbuild
 * reads the `$lib/*` mapping out of `tsconfig.json` and inlines those modules,
 * so nothing in the app moves and nothing at runtime has to resolve an alias.
 * Everything in `node_modules` stays external — this server is launched from
 * its own checkout, so there is no reason to copy the SDK into the output.
 */

import { chmod } from 'node:fs/promises';
import { build } from 'esbuild';

const outfile = 'dist/server.js';

await build({
	entryPoints: ['src/main.ts'],
	outfile,
	bundle: true,
	platform: 'node',
	target: 'node20',
	format: 'esm',
	packages: 'external',
	sourcemap: true,
	tsconfig: 'tsconfig.json',
	banner: { js: '#!/usr/bin/env node' },
	logLevel: 'warning'
});

await chmod(outfile, 0o755);
