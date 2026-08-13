/**
 * The `bcc` fence in VS Code's markdown preview (wayfinder ticket 058) — the
 * surface where the canvases actually are, with the repo open and the doc being
 * written beside the code it describes.
 *
 * Almost nothing of the fence is here. `$lib/fence/fence.ts` holds the grammar,
 * the resolution, the placeholder and the preamble, shared with the remark
 * plugin; what is left is the four things that are genuinely VS Code's — a
 * markdown-it renderer rule, the per-render hoist of the preamble, the two host
 * rules a live pane needs that a file container does not, and a watcher on the
 * canvases a document actually drew.
 *
 * Three findings from ticket 053 shape the whole file, and each is load-bearing:
 *
 * - **`extendMarkdownIt` runs in the extension host, not the webview.** Full
 *   Node, no sandbox; only the HTML string crosses. That is what makes a
 *   synchronous `readCanvas` during a render legal at all.
 * - **`env.currentDocument` exists at render and never at parse**, so the
 *   resolution has to happen in a *renderer* rule. It is also `undefined` when
 *   a caller renders a bare string (`markdown.api.render`), which is a refusal
 *   with a sentence rather than a throw.
 * - **Never emit `<script>`.** It is parsed, never runs, *and* raises the
 *   "Some content has been disabled in this document" banner over the whole
 *   preview. The sheet needs none; if it ever did, `previewScripts` is the only
 *   route.
 */

import { basename, dirname } from 'node:path';
import * as vscode from 'vscode';
import { FENCE_LANG, fencePlaceholder, fencePreamble, renderFence } from '$lib/fence/fence';
import { openRoot, type CanvasRoot } from '$lib/fs/root';
import { SCOPE_CLASS } from '$lib/render';

/**
 * The two things a live pane needs that a file container gives the sheet for
 * free, and the only CSS this adapter writes.
 *
 * **A container**, because the sheet is sized by one and the preview declares
 * none (SPEC §5). An artifact deliberately has no container and keeps the fixed
 * desktop grid; a preview pane is dragged to half a screen and back, which is
 * the editor's case, not a file's — so the tiers fire here and the sheet
 * reflows with the pane instead of squeezing twelve columns into 500px.
 *
 * **The preview's own element rules, rolled back**, because `media/markdown.css`
 * is an author stylesheet of unscoped element selectors and they inherit
 * straight into fence output. Measured rather than read off: with this block
 * disabled, a computed-style diff against the same markup on a bare page comes
 * back with **51 differences** — every one of the sheet's 44 headings on the
 * preview's `line-height: 1.25` instead of the sheet's own, a **line drawn
 * under the canvas name** by `h1 { border-bottom }`, and the two footer links
 * stripped of their underline. With it, zero. The renderer's scoped preflight
 * already restores the margins Tailwind took (ticket 054), which is why margin
 * is the one property not named here — reverting it at this specificity would
 * undo that. `revert` rather than a value: it rolls the cascade back to the UA
 * origin, which is the origin the sheet was drawn against, so the fix cannot
 * disagree with the artifact about what a heading is.
 *
 * The two inherited ones take initial values instead, since reverting an
 * inherited property just inherits the preview's again: the preview's
 * `line-height` reaches the wrapper, and its `word-wrap: break-word` reaches
 * all 229 elements — which would leave a long unbroken word wrapping here and
 * overflowing in the editor and the artifact, a defect that hides on one
 * surface instead of being had everywhere or nowhere.
 */
const HOST_CSS = `.${SCOPE_CLASS} {
	container-type: inline-size;
	line-height: normal;
	overflow-wrap: normal;
}
.${SCOPE_CLASS} :where(h1, h2, h3, h4, h5, h6) {
	font-weight: revert;
	font-size: revert;
	line-height: revert;
	padding-bottom: revert;
	border-bottom: revert;
}
.${SCOPE_CLASS} :where(a) {
	text-decoration: revert;
}`;

/**
 * The half of markdown-it this file touches. Typed structurally rather than
 * imported: markdown-it is the preview's dependency, not ours, and the shape of
 * a renderer rule is four arguments that have not changed in a decade.
 */
type RenderOptions = unknown;

interface Token {
	readonly info: string;
	readonly content: string;
}

interface Renderer {
	rules: { fence?: RenderRule };
	renderToken(tokens: Token[], index: number, options: RenderOptions): string;
}

type RenderRule = (
	tokens: Token[],
	index: number,
	options: RenderOptions,
	env: PreviewEnv | undefined,
	self: Renderer
) => string;

interface MarkdownIt {
	renderer: Renderer;
}

/**
 * What the preview hands a renderer rule. `currentDocument` is a real `Uri` and
 * the only thing here this extension wants; the hoist flag is written back onto
 * the same object, which is per-render and therefore exactly the scope a
 * once-per-document preamble needs.
 */
interface PreviewEnv {
	currentDocument?: vscode.Uri;
	[key: string]: unknown;
}

const PREAMBLE_EMITTED = 'bccPreambleEmitted';

/**
 * The canvases a fence has drawn from, watched so that editing one shows up.
 *
 * The preview re-renders when the *markdown* changes; a canvas is a different
 * file, and it is the one more likely to move — exported from the BC Canvas
 * editor, written by an agent through the MCP server, `bcc fmt`'d in a
 * terminal. Without this the sheet in the preview is silently the old one,
 * which is the failure mode ticket 052 spent its whole placeholder decision
 * avoiding on a surface where at least *something* was visibly wrong.
 *
 * One watcher per file rather than a glob over the workspace: a fence may point
 * at anything `readCanvas` accepts, so a `*.bcc.json` pattern would quietly
 * miss the rest, and the count is bounded by the canvases actually drawn.
 * Refreshing is a whole-preview refresh because that is the only handle VS Code
 * gives — there is no "re-render this fence".
 */
class DrawnCanvases {
	readonly #watchers = new Map<string, vscode.Disposable>();
	#pending: ReturnType<typeof setTimeout> | undefined;

	/** Watch a canvas a fence resolved to, whether or not it could be read. */
	add(path: string): void {
		if (this.#watchers.has(path)) return;
		const watcher = vscode.workspace.createFileSystemWatcher(
			new vscode.RelativePattern(vscode.Uri.file(dirname(path)), basename(path))
		);
		const refresh = () => this.#refresh();
		this.#watchers.set(
			path,
			vscode.Disposable.from(
				watcher.onDidChange(refresh),
				watcher.onDidCreate(refresh),
				watcher.onDidDelete(refresh),
				watcher
			)
		);
	}

	dispose(): void {
		for (const watcher of this.#watchers.values()) watcher.dispose();
		this.#watchers.clear();
		if (this.#pending !== undefined) clearTimeout(this.#pending);
	}

	/**
	 * Coalesced, because a write is rarely one filesystem event — an atomic
	 * write is a create and a rename, and a formatter is a whole directory's
	 * worth at once.
	 */
	#refresh(): void {
		if (this.#pending !== undefined) clearTimeout(this.#pending);
		this.#pending = setTimeout(() => {
			this.#pending = undefined;
			void vscode.commands.executeCommand('markdown.preview.refresh');
		}, 120);
	}
}

/**
 * Where `detail` goes (ticket 052): the developer's channel, not the page.
 *
 * The placeholder in the preview already carries the sentence a reader can act
 * on; what lands here is the level of disclosure a page must not have — what
 * the filesystem said, which field the parser tripped on, the absolute path the
 * root is named against.
 *
 * Reported once per problem rather than once per render. A preview re-renders on
 * every keystroke in the markdown file, and a channel that repeats the same
 * sentence sixty times while somebody types a paragraph is a channel nobody can
 * read the second thing in. The comparison is against the previous render of
 * the same document, so a problem that is still there stays quiet and a new one
 * arrives on its own line.
 */
class FenceLog {
	readonly #channel: vscode.LogOutputChannel;
	readonly #renders = new WeakSet<object>();
	#previous = new Map<string, Set<string>>();
	#current = new Map<string, Set<string>>();

	constructor(channel: vscode.LogOutputChannel) {
		this.#channel = channel;
	}

	/**
	 * Called for every fence, drawn or not. `env` is a fresh object per render,
	 * which is what makes "the previous render of this document" observable from
	 * inside a rule that is only ever handed one fence at a time.
	 */
	rendering(env: PreviewEnv | undefined, document: string): void {
		if (env === undefined || this.#renders.has(env)) return;
		this.#renders.add(env);
		this.#previous.set(document, this.#current.get(document) ?? new Set());
		this.#current.set(document, new Set());
	}

	problem(document: string, sentence: string): void {
		const current = this.#current.get(document);
		if (current === undefined) {
			this.#channel.warn(`${document}: ${sentence}`);
			return;
		}
		current.add(sentence);
		if (!this.#previous.get(document)?.has(sentence)) {
			this.#channel.warn(`${document}: ${sentence}`);
		}
	}

	show(): void {
		this.#channel.show(true);
	}
}

/** Roots are opened once and kept: `openRoot` resolves symlinks off disk. */
const roots = new Map<string, CanvasRoot>();

function rootAt(path: string): CanvasRoot {
	let root = roots.get(path);
	if (root === undefined) {
		root = openRoot(path);
		roots.set(path, root);
	}
	return root;
}

/**
 * Where a fence in this document is, or null when it is nowhere a pointer can
 * be resolved against — a bare string handed to `markdown.api.render`, an
 * untitled buffer, a document on a virtual filesystem. `fence.ts` refuses those
 * with a sentence, which is why this returns null rather than guessing.
 *
 * The root is the workspace folder holding the document, falling back to the
 * document's own directory for a markdown file opened on its own. That fallback
 * is a real difference and not a technicality: a loose file's fence cannot
 * reach `../`, because there is no folder for the walk to stop at.
 */
function locate(uri: vscode.Uri | undefined): { root: CanvasRoot; document: string } | null {
	if (uri === undefined || uri.scheme !== 'file') return null;
	const document = uri.fsPath;
	return { root: rootAt(vscode.workspace.getWorkspaceFolder(uri)?.uri.fsPath ?? dirname(document)), document };
}

export function activate(context: vscode.ExtensionContext) {
	const log = new FenceLog(vscode.window.createOutputChannel('BC Canvas', { log: true }));
	const drawn = new DrawnCanvases();
	context.subscriptions.push(
		drawn,
		vscode.commands.registerCommand('bcc.showFenceLog', () => log.show())
	);

	function draw(token: Token, env: PreviewEnv | undefined): string {
		const uri = env?.currentDocument;
		let location: { root: CanvasRoot; document: string } | null;
		try {
			location = locate(uri);
		} catch (error) {
			// `openRoot` off a folder VS Code just named: unreachable in practice,
			// and shaped like every other failure rather than like an exception,
			// because a fence that throws takes the whole preview render with it.
			const folder = uri === undefined ? '' : uri.fsPath;
			return fencePlaceholder(
				`${folder}: this folder could not be opened as a canvas root (${message(error)}).`
			);
		}

		const result = renderFence({ location, info: token.info, body: token.content });

		const named = location?.document ?? '(no document)';
		log.rendering(env, named);
		if (result.problem !== null) log.problem(named, result.problem);
		if (result.path !== null) drawn.add(result.path);

		if (result.css === null) return result.html;
		if (env !== undefined && env[PREAMBLE_EMITTED] === true) return result.html;
		if (env !== undefined) env[PREAMBLE_EMITTED] = true;
		// Ahead of the first sheet rather than at the top of the document: a
		// renderer rule returns a string for its own token and has nowhere else to
		// put one. The fonts inside it are ~200 KB of base64 and cannot be served
		// from this extension's directory — `localResourceRoots` is empty unless
		// styles or scripts are contributed — so hoisting is what keeps three
		// fences in one file from costing 600 KB on every keystroke.
		return `${fencePreamble(result.css)}\n<style>\n${HOST_CSS}\n</style>\n${result.html}`;
	}

	return {
		extendMarkdownIt(md: MarkdownIt): MarkdownIt {
			const original = md.renderer.rules.fence;
			md.renderer.rules.fence = (tokens, index, options, env, self) => {
				const token = tokens[index];
				// The first word only: a tail after `bcc` is this fence's to refuse
				// (ticket 052), not somebody else's to highlight.
				if (token.info.trim().split(/\s+/)[0] !== FENCE_LANG) {
					return original
						? original(tokens, index, options, env, self)
						: self.renderToken(tokens, index, options);
				}
				return draw(token, env);
			};
			return md;
		}
	};
}

function message(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export function deactivate() {}
