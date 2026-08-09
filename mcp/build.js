/**
 * One bundle, `dist/server.js`, executable, committed, and pointed at by `bin`.
 *
 * Bundling is what lets the server reuse `src/lib/model/*` unchanged: esbuild
 * reads the `$lib/*` mapping out of `tsconfig.json` and inlines those modules,
 * so nothing in the app moves and nothing at runtime has to resolve an alias.
 * Dependencies are inlined too, because the bundle is what a plugin install
 * copies — files as they sit in the repo, no `npm install` — so the one
 * committed file has to run with nothing beside it but Node. No sourcemap for
 * the same reason: the map would double what is committed, to serve a file
 * that is only ever read in this checkout.
 *
 * `server.test.ts` builds to a scratch path (the optional argument) and diffs
 * against the committed bytes, so the bundle cannot go stale silently.
 */

import { chmod } from 'node:fs/promises';
import { build } from 'esbuild';

const outfile = process.argv[2] ?? 'dist/server.js';

await build({
	entryPoints: ['src/main.ts'],
	outfile,
	bundle: true,
	platform: 'node',
	target: 'node20',
	format: 'esm',
	sourcemap: false,
	tsconfig: 'tsconfig.json',
	banner: { js: '#!/usr/bin/env node' },
	logLevel: 'warning'
});

await chmod(outfile, 0o755);
