/**
 * Byte-identity across the seam move, mechanically (ticket 041).
 *
 * The claim the move rests on is that the Markdown a canvas renders to did not
 * change when the renderer crossed from `mcp/src/digest.ts` to
 * `src/lib/model/digest.ts`. Pinned assertions carried over unchanged are good
 * evidence; identical bytes out of both trees is proof. This bundles a probe
 * against one tree — any checkout, at any commit — and prints every committed
 * example's digest concatenated, so two runs can be `cmp`'d.
 *
 *   git worktree add --detach /tmp/before HEAD~1
 *   node .scratch/views-seam/render-digest.mjs /tmp/before mcp/src/digest.ts /tmp/before.md
 *   node .scratch/views-seam/render-digest.mjs . src/lib/model/digest.ts /tmp/after.md
 *   cmp /tmp/before.md /tmp/after.md
 *
 * Ran clean at the move: 6183 bytes, sha256
 * 01e0040bd9b9e0bfe73aa3460615ffb0c91d5b52d79bf6304a8e9825c2eae2e6 from both.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// esbuild is the MCP package's devDependency; the app does not carry one.
const { build } = await import(
	fileURLToPath(new URL('../../mcp/node_modules/esbuild/lib/main.js', import.meta.url))
);

const [treeArg, digestPath, out] = process.argv.slice(2);
const tree = resolve(treeArg);
const dir = mkdtempSync(join(tmpdir(), 'views-seam-'));
const entry = join(dir, 'probe.ts');

writeFileSync(
	entry,
	`import { readdirSync, readFileSync } from 'node:fs';
import { parseCanvasFile } from '$lib/model/parse';
import { canvasDigest } from ${JSON.stringify(join(tree, digestPath))};
const dir = ${JSON.stringify(join(tree, 'examples'))};
const out = [];
for (const name of readdirSync(dir).sort()) {
	const parsed = parseCanvasFile(readFileSync(dir + '/' + name, 'utf8'));
	if (!parsed.ok) throw new Error(name + ': ' + parsed.reason);
	out.push('===== ' + name + '\\n' + canvasDigest(parsed.file));
}
process.stdout.write(out.join(''));
`
);

const bundle = join(dir, 'probe.mjs');
await build({
	entryPoints: [entry],
	outfile: bundle,
	bundle: true,
	platform: 'node',
	format: 'esm',
	// The same one-directional seam the server bundles through, spelled out
	// rather than read from a tsconfig, since the tree under test may be a bare
	// worktree with no `.svelte-kit/tsconfig.json` for the app config to extend.
	alias: { $lib: join(tree, 'src/lib') },
	logLevel: 'warning'
});

writeFileSync(out, execFileSync(process.execPath, [bundle]));
