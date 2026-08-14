/**
 * One module, `dist/render.js`, committed, imported by every consumer — the
 * CLI, the remark plugin, the VS Code extension and the editor's own Export
 * HTML (wayfinder ticket 050 decision 8). Byte identity between what `bcc`
 * renders and what the editor exports is structural because of that: it is one
 * function, called twice, not two functions a test compares.
 *
 * The build exists because two payloads are environment-bound. `CanvasSheet`
 * has to be compiled in *server* mode, and `vite-plugin-svelte` derives
 * `generate` from Vite's SSR flag, so one build cannot emit both the client
 * compile the editor mounts and the server compile this renders through. And
 * the tokens and fonts come off disk, which an installed package has no disk
 * to do — `@fontsource/*` is a devDependency and never ships.
 *
 * Three things are lifted out of `src/app.css` rather than duplicated beside
 * it: the `@theme` tokens, the paper-ground rule, and the `@fontsource`
 * imports that name the faces. A weight added to `app.css` therefore cannot
 * silently miss the renderer, and the tokens cannot drift from the ones
 * `contrast.test.ts` verifies.
 *
 * `render.test.ts` builds to a scratch path (the optional argument) and diffs
 * against the committed bytes, so the module cannot go stale silently — the
 * same guard `mcp/dist/server.js` has, and the reason `CanvasSheet.svelte`
 * cannot move without the renderer following.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Before Vite loads. The committed bytes must not depend on who ran the
// build, and `vitest` sets NODE_ENV=test — which the Svelte compiler reads as
// dev mode and answers with an 82 KB larger module, failing the staleness
// check for a difference nobody made.
process.env.NODE_ENV = 'production';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');

// Also before Vite loads, and for the same reason: the bundle's `//#region`
// comments and the sheet's scoped-CSS hash both derive from paths relative to
// the working directory — which `vite-plugin-svelte` captures at import time —
// and the committed bytes must not depend on where the build was invoked from.
process.chdir(root);

const { svelte } = await import('@sveltejs/vite-plugin-svelte');
const { build } = await import('vite');

const appCss = readFileSync(path.join(root, 'src/app.css'), 'utf8');

/** `@theme`'s body is already plain `--name: value;` declarations. */
function themeTokens() {
	const match = appCss.match(/@theme\s*\{([\s\S]*?)\n\}/);
	if (!match) throw new Error('src/app.css has no @theme block');
	return match[1].trim();
}

/**
 * The cream paper ground, minus the `body,` half of its selector: the renderer
 * scopes it to its own class so a fragment paints its own ground and nothing
 * of the host's.
 */
function groundRule() {
	const match = appCss.match(/\nbody,\n\.paper-ground \{\n([\s\S]*?)\n\}/);
	if (!match) throw new Error('src/app.css has no `body, .paper-ground` rule');
	return match[1];
}

/**
 * The faces named by app.css's `@fontsource` imports, authored fresh from the
 * files on disk rather than by rewriting fontsource's compiled `src:` list.
 * That is the whole `.woff` fix: fontsource names a WOFF2 *and* a legacy WOFF
 * in one list, and the old exporter base64'd both — 202 KB of fallback no
 * WOFF2-capable browser will ever request. Authoring simply never writes one.
 */
function fontFaceCss() {
	const faces = [];
	for (const match of appCss.matchAll(/@import\s+'(@fontsource\/[^']+)';/g)) {
		// `root` is the web project (`web/`); the repo's node_modules sits one up.
		const cssPath = path.join(root, '../node_modules', match[1]);
		const source = readFileSync(cssPath, 'utf8');
		const family = source.match(/font-family:\s*('[^']*'|"[^"]*"|[^;]+);/);
		const style = source.match(/font-style:\s*([^;]+);/);
		const weight = source.match(/font-weight:\s*([^;]+);/);
		const woff2 = source.match(/url\(([^)]*\.woff2)\)/);
		if (!family || !style || !weight || !woff2) {
			throw new Error(`${match[1]} is not a single-face fontsource stylesheet`);
		}
		const file = path.resolve(path.dirname(cssPath), woff2[1]);
		const data = readFileSync(file).toString('base64');
		faces.push(
			`@font-face {\n` +
				`\tfont-family: ${family[1].trim()};\n` +
				`\tfont-style: ${style[1].trim()};\n` +
				`\tfont-weight: ${weight[1].trim()};\n` +
				`\tfont-display: swap;\n` +
				`\tsrc: url(data:font/woff2;base64,${data}) format('woff2');\n` +
				`}`
		);
	}
	if (!faces.length) throw new Error('src/app.css imports no @fontsource stylesheets');
	return faces.join('\n');
}

const outfile = path.resolve(process.argv[2] ?? path.join(here, 'dist/render.js'));

await build({
	root,
	configFile: false,
	logLevel: 'warn',
	// Pinned, not inherited. Vite reads the ambient NODE_ENV, and `vitest` sets
	// it to `test` — which is how the staleness check came to rebuild a
	// dev-mode sheet 82 KB larger than the committed one and call it stale.
	mode: 'production',
	resolve: { alias: { $lib: path.join(root, 'src/lib') } },
	define: {
		__BCC_TOKENS__: JSON.stringify(themeTokens()),
		__BCC_GROUND__: JSON.stringify(groundRule()),
		__BCC_FONT_FACE__: JSON.stringify(fontFaceCss())
	},
	plugins: [
		// `emitCss: false` is what puts the sheet's scoped CSS on `render()`'s
		// `head` instead of in a build asset — the parts the containers need.
		// The server compile is not asked for here and cannot be: the plugin
		// derives `generate` from Vite's SSR flag and ignores the option, which
		// is the whole reason this build is separate from the app's.
		svelte({ compilerOptions: { runes: true }, emitCss: false })
	],
	// Nothing external: the module a plugin install copies, an `npx` fetches
	// and a webview loads has to run with nothing beside it.
	ssr: { noExternal: true },
	build: {
		ssr: true,
		minify: false,
		emptyOutDir: false,
		outDir: path.dirname(outfile),
		rollupOptions: {
			input: path.join(here, 'module.ts'),
			output: {
				format: 'esm',
				entryFileNames: path.basename(outfile),
				// The root tsconfig runs `checkJs` over `src/**/*.js`, and this is
				// build output rather than source: `index.ts` is where its types are
				// declared, and svelte-check has no business grading a bundle.
				banner: '// @ts-nocheck\n/* Generated by src/lib/render/build.js — do not edit. */'
			}
		}
	}
});
