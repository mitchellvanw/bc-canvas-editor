/**
 * One bundle, `dist/bcc.js`, executable, committed, and pointed at by the root
 * `package.json`'s `bin` (wayfinder ticket 051 decisions 3 and 4).
 *
 * It is committed because an install-time build is not available to it: npm 11
 * gates `prepare` behind `allow-scripts` and npm 10 drags the whole devDep tree
 * through it, so the same `npx` invocation would behave differently on two npm
 * versions. A committed bundle behaves the same on both.
 *
 * **The renderer is inlined from `web/src/lib/render/dist/render.js`, never
 * re-derived from `CanvasSheet.svelte`** (ticket 051 decision 5). That is the
 * whole of what makes "the sheet `bcc` renders and the sheet the editor exports
 * are the same sheet" a structural property rather than a tested-for one: a
 * second Svelte server-compile here would be a second thing that can drift.
 * `$lib/render/index.ts` imports the built module, so following the imports is
 * all esbuild has to do — and the rebuild order is `render` then `cli`, which
 * `npm run build:bundles` spells out and two staleness tests catch either way.
 *
 * `playwright-core` is the one thing left outside. It is a devDependency and a
 * lazy import: measuring a sheet's height needs a browser, everything else here
 * does not, and a foreign `npx --yes github:…` install carries `cli/dist` and
 * no dependencies at all. Inlining it would put a browser driver into every
 * install to serve one flag.
 *
 * `bcc.test.ts` builds to a scratch path (the optional argument) and diffs
 * against the committed bytes, so the bundle cannot go stale silently.
 */

import { chmod } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));
const outfile = path.resolve(process.argv[2] ?? path.join(here, 'dist/bcc.js'));

await build({
	absWorkingDir: here,
	entryPoints: ['src/main.ts'],
	outfile,
	bundle: true,
	platform: 'node',
	target: 'node20',
	format: 'esm',
	sourcemap: false,
	tsconfig: path.join(here, 'tsconfig.json'),
	// Everything else is inlined; this one is asked for only by `render --svg`
	// and is absent from an install by design. `measure.ts` catches the miss.
	external: ['playwright-core'],
	banner: { js: '#!/usr/bin/env node' },
	logLevel: 'warning'
});

await chmod(outfile, 0o755);
