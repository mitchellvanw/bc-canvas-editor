/**
 * The extension as VS Code loads it: the committed CommonJS bundle, required
 * with a stubbed `vscode` and driven through a stubbed markdown-it.
 *
 * `dist/extension.js` rather than `extension.ts` is the same call
 * `plugin.test.ts` and `bcc.test.ts` make — the bundle is what a `.vsix`
 * carries, and a test against the source would pass while the shipped bytes
 * were stale. Stubbing the host rather than launching one is the other half:
 * what only a real preview can show — that the sheet arrives whole, that the
 * fonts load, that `markdown.css` no longer reaches into it — was measured over
 * the devtools protocol and is written up in `.scratch/vscode-extension/`. This
 * is the regression net under it.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, '..');
const repo = path.resolve(pkg, '..');
const BUNDLE = path.join(pkg, 'dist/extension.js');

/** Every disposable the extension asked for, so a test can prove it asked. */
interface Host {
	warnings: string[];
	commands: string[];
	watching: string[];
	fire(path: string): void;
}

/**
 * As much of the `vscode` module as this extension touches — which is the
 * argument for the whole shape of `extension.ts`: five namespaces, and the
 * fence itself in none of them.
 */
function hostStub(workspaceFolder: string | null) {
	const host: Host = { warnings: [], commands: [], watching: [], fire: () => {} };
	const listeners = new Map<string, (() => void)[]>();
	host.fire = (target) => {
		for (const listener of listeners.get(target) ?? []) listener();
	};

	const disposable = { dispose() {} };
	const vscode = {
		Uri: { file: (fsPath: string) => ({ fsPath, scheme: 'file' }) },
		Disposable: { from: () => disposable },
		RelativePattern: class {
			constructor(
				readonly base: { fsPath: string },
				readonly pattern: string
			) {}
		},
		window: {
			createOutputChannel: () => ({
				warn: (line: string) => host.warnings.push(line),
				show() {},
				dispose() {}
			})
		},
		workspace: {
			getWorkspaceFolder: () =>
				workspaceFolder === null ? undefined : { uri: { fsPath: workspaceFolder } },
			createFileSystemWatcher: (pattern: { base: { fsPath: string }; pattern: string }) => {
				const target = path.join(pattern.base.fsPath, pattern.pattern);
				host.watching.push(target);
				const on = (listener: () => void) => {
					listeners.set(target, [...(listeners.get(target) ?? []), listener]);
					return disposable;
				};
				return { onDidChange: on, onDidCreate: on, onDidDelete: on, dispose() {} };
			}
		},
		commands: {
			registerCommand: () => disposable,
			executeCommand: (id: string) => {
				host.commands.push(id);
				return Promise.resolve();
			}
		}
	};

	return { host, vscode };
}

interface Token {
	info: string;
	content: string;
}

type Fence = (
	tokens: Token[],
	index: number,
	options: unknown,
	env: unknown,
	self: unknown
) => string;

/** The extension, activated, with a markdown-it whose fence rule it has taken. */
function load(workspaceFolder: string | null) {
	const { host, vscode } = hostStub(workspaceFolder);
	const real = createRequire(BUNDLE);
	const module = { exports: {} as { activate(context: unknown): { extendMarkdownIt(md: unknown): void } } };
	const run = new Function('require', 'module', 'exports', readFileSync(BUNDLE, 'utf8'));
	run((id: string) => (id === 'vscode' ? vscode : real(id)), module, module.exports);

	const renderer = {
		rules: {} as { fence?: Fence },
		renderToken: () => '<pre>untouched</pre>'
	};
	module.exports.activate({ subscriptions: [] }).extendMarkdownIt({ renderer });

	return {
		host,
		/** One fence through the rule, in a document the preview says it is in. */
		draw(body: string, options: { info?: string; document?: string | null; env?: object } = {}) {
			const document = options.document === undefined ? path.join(root, 'docs/guide.md') : options.document;
			const env = options.env ?? {};
			if (document !== null) Object.assign(env, { currentDocument: vscode.Uri.file(document) });
			return renderer.rules.fence!(
				[{ info: options.info ?? 'bcc', content: body }],
				0,
				{},
				env,
				renderer
			);
		}
	};
}

let root: string;

beforeEach(() => {
	root = mkdtempSync(path.join(tmpdir(), 'bcc-vscode-'));
	mkdirSync(path.join(root, 'docs'), { recursive: true });
	writeFileSync(
		path.join(root, 'order-fulfillment.bcc.json'),
		readFileSync(path.join(repo, 'examples/order-fulfillment.bcc.json'), 'utf8')
	);
});

afterEach(() => {
	rmSync(root, { recursive: true, force: true });
});

describe('a bcc fence in the preview', () => {
	it('draws the sheet, with the preamble and the host rules ahead of it', () => {
		const html = load(root).draw('../order-fulfillment.bcc.json');

		expect(html).toContain('class="bcc-canvas"');
		expect(html).toContain('Order Fulfillment');
		expect(html.indexOf('@font-face')).toBeLessThan(html.indexOf('class="bcc-canvas"'));
		// The two things a live pane needs that a file container does not.
		expect(html).toContain('container-type: inline-size');
		expect(html).toContain('text-decoration: revert');
	});

	it('emits the preamble once per render, however many fences there are', () => {
		const extension = load(root);
		const env = {};
		const first = extension.draw('../order-fulfillment.bcc.json', { env });
		const second = extension.draw('../order-fulfillment.bcc.json', { env });

		expect(first).toContain('@font-face');
		expect(second).not.toContain('@font-face');
		expect(second).toContain('class="bcc-canvas"');
		// A new render is a new `env`, and it gets its own preamble — the fonts
		// are the page's, not the session's.
		expect(extension.draw('../order-fulfillment.bcc.json', { env: {} })).toContain('@font-face');
	});

	it('leaves every other fence to the rule it replaced', () => {
		const extension = load(root);

		expect(extension.draw('const x = 1;', { info: 'js' })).toBe('<pre>untouched</pre>');
		expect(extension.draw('plain', { info: '' })).toBe('<pre>untouched</pre>');
	});

	it('resolves against the document, not the workspace folder', () => {
		const extension = load(root);
		writeFileSync(
			path.join(root, 'docs/order-fulfillment.bcc.json'),
			readFileSync(path.join(repo, 'examples/notifications.bcc.json'), 'utf8')
		);

		// One pointer, two documents, two canvases: the name in the title bar is
		// what says which drew.
		const beside = extension.draw('order-fulfillment.bcc.json');
		const above = extension.draw('order-fulfillment.bcc.json', {
			document: path.join(root, 'guide.md')
		});

		expect(beside).toContain('Notifications');
		expect(above).toContain('Order Fulfillment');
	});
});

describe('a fence that cannot draw', () => {
	it('leaves a placeholder in the preview and the detail on the channel', () => {
		const extension = load(root);
		const html = extension.draw('nowhere.bcc.json');

		expect(html).toContain('This bcc fence didn&#39;t render.');
		expect(html).toContain('docs/nowhere.bcc.json: could not be read.');
		// Ticket 052: the page gets the sentence, the developer gets the detail.
		expect(html).not.toContain('ENOENT');
		expect(extension.host.warnings.length).toBe(1);
		expect(extension.host.warnings[0]).toContain('ENOENT');
	});

	it('reports a problem once, not once per keystroke', () => {
		const extension = load(root);
		for (let render = 0; render < 5; render += 1) {
			extension.draw('nowhere.bcc.json', { env: {} });
		}

		// A preview re-renders on every keystroke in the markdown file. Five
		// renders of the same broken fence is one line, or the channel is a place
		// nobody can read the second thing in.
		expect(extension.host.warnings.length).toBe(1);
	});

	it('refuses a document it cannot resolve against, rather than guessing', () => {
		const extension = load(root);
		const html = extension.draw('order-fulfillment.bcc.json', { document: null });

		expect(html).toContain('no document to resolve against');
		expect(html).not.toContain('class="bcc-canvas"');
	});

	it('draws in a folder that is not a workspace, from the document’s own directory', () => {
		// A markdown file opened on its own: the walk stops at its directory, so a
		// pointer beside it reads and `../` does not.
		const extension = load(null);

		expect(extension.draw('order-fulfillment.bcc.json', { document: path.join(root, 'g.md') })).toContain(
			'Order Fulfillment'
		);
		expect(extension.draw('../order-fulfillment.bcc.json')).toContain('outside the canvas root');
	});
});

describe('the canvases a document drew', () => {
	it('refreshes the preview when one of them changes on disk', async () => {
		const extension = load(root);
		extension.draw('../order-fulfillment.bcc.json');

		const watched = path.join(root, 'order-fulfillment.bcc.json');
		expect(extension.host.watching).toEqual([watched]);

		extension.host.fire(watched);
		await new Promise((resolve) => setTimeout(resolve, 250));
		expect(extension.host.commands).toEqual(['markdown.preview.refresh']);
	});

	it('watches a canvas that is not there yet, so the fence heals when it arrives', () => {
		const extension = load(root);
		extension.draw('nowhere.bcc.json');

		expect(extension.host.watching).toEqual([path.join(root, 'docs/nowhere.bcc.json')]);
	});

	it('watches nothing for a fence that never named a file', () => {
		const extension = load(root);
		extension.draw('/order-fulfillment.bcc.json');

		expect(extension.host.watching).toEqual([]);
	});
});

describe('the committed bundle', () => {
	it(
		'is what build.mjs produces from the extension and the renderer as they stand today',
		() => {
			// The rebuild order is `render`, `cli`, `remark`, `vscode`: this bundle
			// inlines the committed renderer module the way the other two do, so a
			// sheet change that stops at `build:render` leaves this stale.
			const scratch = mkdtempSync(path.join(tmpdir(), 'bcc-vscode-build-'));
			try {
				const rebuilt = path.join(scratch, 'extension.js');
				execFileSync(process.execPath, [path.join(pkg, 'build.mjs'), rebuilt], { cwd: repo });
				expect(
					readFileSync(rebuilt).equals(readFileSync(BUNDLE)),
					'vscode/dist/extension.js is stale — run `npm run build:bundles` and commit the result'
				).toBe(true);
			} finally {
				rmSync(scratch, { recursive: true, force: true });
			}
		},
		120_000
	);

	it('asks the host for nothing but vscode itself', () => {
		// A `.vsix` carries `dist/` and no `node_modules`. Anything required here
		// that is neither Node's nor the host's would be missing at load time, on
		// a machine with no way to install it.
		const bundle = readFileSync(BUNDLE, 'utf8');
		const required = [...bundle.matchAll(/require\("([^"]+)"\)/g)].map((match) => match[1]);

		expect([...new Set(required)].filter((name) => !name.startsWith('node:')).sort()).toEqual([
			'vscode'
		]);
	});
});
