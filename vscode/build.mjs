/**
 * One module, `dist/extension.js`, committed, and named by `package.json`'s
 * `main` (wayfinder ticket 058).
 *
 * Committed for a different reason than `cli/dist` and `remark/dist`, which are
 * committed because an install runs no build step (ticket 051 decisions 3 and
 * 4). Nobody installs this one from git — a `.vsix` is packed from this
 * directory and installed by hand — but the packing step copies bytes and runs
 * nothing, so the bundle has to exist before it. Committing it also puts this
 * extension under the same staleness test as its two siblings, which is the
 * only thing that keeps three adapters drawing one sheet.
 *
 * **The renderer is inlined from `src/lib/render/dist/render.js`**, reached
 * through `$lib/render/index.ts` exactly as the CLI and the remark plugin reach
 * it, so following the imports is all esbuild has to do. The rebuild order is
 * `render` then `cli` then `remark` then `vscode`, which `npm run build:bundles`
 * spells out and four staleness tests catch either way.
 *
 * CommonJS, unlike every other bundle here: VS Code loads an extension with
 * `require`, and an ESM `main` is not a thing the desktop extension host takes.
 * `vscode` itself is external because the host injects it — it is not on disk
 * anywhere, which is why a bundle that tried to inline it would fail to build
 * rather than fail at load. That is also why this file is `.mjs` where its two
 * siblings are `.js`: the extension manifest beside it cannot say
 * `"type": "module"` without telling Node the CommonJS bundle is ESM too.
 */

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));
const outfile = path.resolve(process.argv[2] ?? path.join(here, 'dist/extension.js'));

await build({
	absWorkingDir: here,
	entryPoints: ['src/extension.ts'],
	outfile,
	bundle: true,
	platform: 'node',
	target: 'node20',
	format: 'cjs',
	sourcemap: false,
	tsconfig: path.join(here, 'tsconfig.json'),
	external: ['vscode'],
	logLevel: 'warning'
});
