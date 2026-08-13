/**
 * The plugin as a site's build sees it: the committed bundle, in a real
 * unified pipeline, over markdown files on disk.
 *
 * `dist/plugin.js` rather than `plugin.ts` is deliberate and is the same call
 * `bcc.test.ts` makes — the bundle is what a site installs, and a test against
 * the source would pass while the shipped bytes were stale.
 *
 * What only a real build can show — that Astro and Docusaurus configure their
 * pipelines the way this suite assumes — is in `.scratch/remark-plugin/`,
 * where both are built from a scratch site. This is the regression net under
 * it.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import rehypeStringify from 'rehype-stringify';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { VFile } from 'vfile';
import remarkBcc from '../dist/plugin.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, '..');
const repo = path.resolve(pkg, '..');
const PLUGIN = path.join(pkg, 'dist/plugin.js');

let root: string;

beforeEach(() => {
	root = mkdtempSync(path.join(tmpdir(), 'bcc-remark-'));
	mkdirSync(path.join(root, 'docs'), { recursive: true });
	writeFileSync(
		path.join(root, 'order-fulfillment.bcc.json'),
		readFileSync(path.join(repo, 'examples/order-fulfillment.bcc.json'), 'utf8')
	);
});

afterEach(() => {
	rmSync(root, { recursive: true, force: true });
});

interface Built {
	html: string;
	messages: string[];
	sources: string[];
}

/**
 * The pipeline every unified-based generator reduces to. `allowDangerousHtml`
 * is what a raw `html` node needs to survive, on both plugins — the gate the
 * README documents per target.
 */
function build(
	markdown: string,
	options: { raw?: boolean; at?: string; css?: 'inline' | 'imported' } = {}
): Built {
	const raw = options.raw ?? true;
	const at = options.at ?? 'docs/guide.md';
	const file = new VFile({ path: path.join(root, at), cwd: root, value: markdown });
	const result = unified()
		.use(remarkParse)
		.use(remarkBcc, { css: options.css ?? 'inline' })
		.use(remarkRehype, { allowDangerousHtml: raw })
		.use(rehypeStringify, { allowDangerousHtml: raw })
		.processSync(file);

	return {
		html: String(result),
		messages: file.messages.map((message) => message.reason),
		sources: file.messages.map((message) => `${message.source}:${message.ruleId}`)
	};
}

const FENCE = '```bcc\n../order-fulfillment.bcc.json\n```';

/** The context name off the sheet's title bar — which canvas actually drew. */
function name(html: string): string {
	return html.match(/<h1 class="tb__name[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? '';
}

describe('a bcc fence in a unified pipeline', () => {
	it('renders the sheet, with the fonts once ahead of it', () => {
		const built = build(`# Guide\n\n${FENCE}\n`);

		expect(built.html).toContain('class="bcc-canvas"');
		expect(built.html).toContain('Order Fulfillment');
		expect(built.messages).toEqual([]);
		expect(built.html.indexOf('@font-face')).toBeLessThan(built.html.indexOf('bcc-canvas'));
	});

	it('emits the preamble once however many fences there are', () => {
		const one = build(`${FENCE}\n`);
		const three = build(`${FENCE}\n\n${FENCE}\n\n${FENCE}\n`);

		expect([...three.html.matchAll(/@font-face/g)].length).toBe(
			[...one.html.matchAll(/@font-face/g)].length
		);
		expect([...three.html.matchAll(/class="bcc-canvas"/g)].length).toBe(3);
		// Three fences cost three sheets and one preamble, not three preambles:
		// the fonts are ~200 KB of base64 and the scoped CSS another 15 KB.
		expect(three.html.length - one.html.length).toBeLessThan(3 * 40_000);
	});

	it('puts the preamble ahead of a fence nested in a list', () => {
		const built = build(`- a canvas:\n\n  \`\`\`bcc\n  ../order-fulfillment.bcc.json\n  \`\`\`\n`);

		expect(built.html).toContain('class="bcc-canvas"');
		expect(built.html.indexOf('@font-face')).toBeLessThan(built.html.indexOf('<ul>'));
	});

	it('leaves every other fence alone', () => {
		const built = build('```js\nconst x = 1;\n```\n\n```\nplain\n```\n');

		expect(built.html).toContain('<code class="language-js">');
		expect(built.html).not.toContain('bcc-canvas');
		expect(built.html).not.toContain('@font-face');
	});

	it('resolves relative to the markdown file, not the build directory', () => {
		writeFileSync(
			path.join(root, 'docs/order-fulfillment.bcc.json'),
			readFileSync(path.join(repo, 'examples/notifications.bcc.json'), 'utf8')
		);
		const fence = '```bcc\norder-fulfillment.bcc.json\n```\n';

		// One pointer, two documents, two canvases. The name in the title bar is
		// what says which — the Notifications canvas *mentions* Order Fulfillment
		// on an inbound lane, so anything looser than this passes either way.
		expect(name(build(fence, { at: 'docs/guide.md' }).html)).toContain('Notifications');
		expect(name(build(fence, { at: 'guide.md' }).html)).toContain('Order Fulfillment');
	});
});

describe('a fence that cannot draw', () => {
	it('leaves a placeholder on the page and the sentence on the build', () => {
		const built = build('```bcc\nnowhere.bcc.json\n```\n');

		expect(built.html).toContain('This bcc fence didn&#39;t render.');
		expect(built.html).toContain('docs/nowhere.bcc.json: could not be read.');
		expect(built.messages.length).toBe(1);
		expect(built.messages[0]).toContain('ENOENT');
		expect(built.sources).toEqual(['remark-bcc:fence']);
	});

	it('does not fail the build', () => {
		// A docs build that dies on a broken fence takes the choice away from the
		// site; a warning lets a pipeline escalate through its own fail-on-warn.
		expect(() => build('```bcc\nnowhere.bcc.json\n```\n')).not.toThrow();
	});

	it('refuses a pointer out of the root without naming this machine', () => {
		const built = build('```bcc\n../../../etc/hosts\n```\n');

		expect(built.html).toContain('outside the canvas root');
		expect(built.html).not.toContain(root);
	});
});

describe('the raw-HTML gate', () => {
	/**
	 * The one outcome ticket 052 refused is a fence that renders nothing
	 * silently, and a pipeline without `allowDangerousHtml` produces exactly
	 * that — for the placeholder as much as for the sheet, since both are raw
	 * HTML. It cannot be worked around from inside the plugin, so it is pinned
	 * here and documented per target in `README.md`.
	 */
	it('drops both the sheet and the placeholder when raw HTML is not allowed', () => {
		const drawn = build(`${FENCE}\n`, { raw: false });
		const broken = build('```bcc\nnowhere.bcc.json\n```\n', { raw: false });

		expect(drawn.html).not.toContain('bcc-canvas');
		expect(broken.html).not.toContain('This bcc fence');
		// The warning still arrives, which is the only thing left that can say so.
		expect(broken.messages.length).toBe(1);
	});
});

describe('the stylesheet a site can import instead', () => {
	/**
	 * `{ css: 'imported' }` is not a preference: React's server render escapes
	 * the text inside a `<style>` element, so on Docusaurus an inlined preamble
	 * arrives with `'Archivo'` as `&#x27;Archivo&#x27;` and the sheet draws in
	 * Times. Measured on a real build — `.scratch/remark-plugin/`.
	 */
	it('leaves the page to the site, and draws the same sheet', () => {
		const inline = build(`${FENCE}\n`);
		const imported = build(`${FENCE}\n`, { css: 'imported' });

		expect(imported.html).not.toContain('@font-face');
		expect(imported.html).not.toContain('<style>');
		expect(imported.html).toContain('class="bcc-canvas"');
		// The same markup either way — only the preamble is gone.
		expect(inline.html.endsWith(imported.html)).toBe(true);
	});

	it('carries what the preamble carries', () => {
		const css = readFileSync(path.join(pkg, 'dist/sheet.css'), 'utf8');
		const inline = build(`${FENCE}\n`);

		expect([...css.matchAll(/@font-face/g)].length).toBe(
			[...inline.html.matchAll(/@font-face/g)].length
		);
		expect(css).toContain('.bcc-canvas {');
		// Tokens on the wrapper, never `:root` — a stylesheet a whole site
		// imports is exactly where that would have hurt (ticket 050 decision 5).
		expect(css).not.toContain(':root');
	});
});

describe('the committed bundle', () => {
	it(
		'is what build.js produces from the plugin and the renderer as they stand today',
		() => {
			// The rebuild order is `render`, `cli`, `remark`: this bundle inlines
			// the committed renderer module the same way the CLI does, so a sheet
			// change that stops at `build:render` leaves this stale.
			const scratch = mkdtempSync(path.join(tmpdir(), 'bcc-remark-build-'));
			try {
				const rebuilt = path.join(scratch, 'plugin.js');
				execFileSync(process.execPath, [path.join(pkg, 'build.js'), rebuilt], { cwd: repo });
				for (const name of ['plugin.js', 'sheet.css']) {
					expect(
						readFileSync(path.join(scratch, name)).equals(readFileSync(path.join(pkg, 'dist', name))),
						`remark/dist/${name} is stale — run \`npm run build:bundles\` and commit the result`
					).toBe(true);
				}
			} finally {
				rmSync(scratch, { recursive: true, force: true });
			}
		},
		120_000
	);

	it('runs inside someone else’s build with nothing of ours beside it', () => {
		// A site installs `bc-canvas-editor` and gets `remark/dist` and `cli/dist`.
		// Anything this bundle imported that was not Node's would have to be a
		// dependency of theirs, resolved from their tree, on their versions.
		const bundle = readFileSync(PLUGIN, 'utf8');
		const imports = [...bundle.matchAll(/^import\s.*?from\s*"([^"]+)"/gm)].map((m) => m[1]);
		expect(imports.filter((name) => !name.startsWith('node:'))).toEqual([]);
	});
});
