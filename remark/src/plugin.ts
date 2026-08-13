/**
 * `remark-bcc` — a `bcc` fence renders on every unified-based site.
 *
 * The best leverage on wayfinder's render map (ticket 057): Astro, Docusaurus,
 * Eleventy and everything else built on unified expose remark or rehype rather
 * than a diagram API of their own, so one plugin covers all of them. Build
 * time, no client bundle, no marketplace, no review queue.
 *
 * ```js
 * import remarkBcc from 'bc-canvas-editor/remark';
 * ```
 *
 * The plugin itself is thin on purpose. The grammar, the resolution, the
 * placeholder and the preamble are `$lib/fence/fence.ts`'s, shared with the VS
 * Code adapter; what is left here is the three things that are genuinely
 * unified's — walking mdast for `code` nodes, replacing them with raw `html`,
 * and putting the sentence on a VFile message so a build can escalate through
 * its own fail-on-warn rather than having this plugin choose failure for
 * someone else's site.
 *
 * **Raw HTML has to be allowed through, and not every pipeline does by
 * default** — see `README.md`'s bcc-fence section for what each target needs.
 * That gate applies to the placeholder as much as to the sheet, so a pipeline
 * that drops raw HTML renders neither, which is why the plugin says so once per
 * document on the same channel as everything else rather than failing quietly.
 */

import { openRoot, type CanvasRoot } from '$lib/fs/root';
import { FENCE_LANG, fencePreamble, renderFence } from '$lib/fence/fence';
import { isAbsolute, resolve } from 'node:path';

/** The mdast this plugin touches, structurally — no unified types are imported. */
interface Node {
	type: string;
	lang?: string | null;
	meta?: string | null;
	value?: string;
	children?: Node[];
	position?: unknown;
}

/** The half of VFile this plugin uses, and nothing beyond it. */
interface File {
	cwd: string;
	path?: string;
	message(reason: string, place?: unknown): { source?: string | null; ruleId?: string | null };
}

export interface Options {
	/**
	 * Where the walk stops, and what paths are named against in messages.
	 * Defaults to the VFile's `cwd` — the directory the site's build runs in,
	 * which for every generator here is the project root (ticket 052 decision
	 * 4). Pass one when the canvases live above it.
	 */
	root?: string;
	/**
	 * Where the sheet's CSS comes from.
	 *
	 * `'inline'` (the default) puts it in the page ahead of the first fence,
	 * which needs nothing configured and is self-contained.
	 *
	 * `'imported'` emits none, for a site that imports
	 * `bc-canvas-editor/sheet.css` through its own CSS pipeline. **Docusaurus,
	 * and anything else that renders markdown through React, must use this** —
	 * React's server render escapes the text inside a `<style>` element, so an
	 * inlined preamble arrives with every quoted font name, attribute selector
	 * and child combinator turned into entities and the sheet draws in Times.
	 * It is also the better answer for any site with a fence on many pages: one
	 * cached stylesheet rather than ~215 KB of fonts and CSS per page.
	 */
	css?: 'inline' | 'imported';
}

/**
 * Both fields of a `code` node's info string, back as the author typed them.
 * mdast splits the first word off as `lang` and keeps the rest as `meta`, so a
 * tail is visible here but only by rejoining them — and rejoining is what lets
 * the refusal quote the line rather than describe it.
 */
function infoString(node: Node): string {
	return node.meta ? `${node.lang} ${node.meta}` : (node.lang ?? '');
}

/** Every `code` node in the tree, with the parent that holds it. */
function fences(tree: Node, found: { parent: Node; index: number; node: Node }[] = []) {
	const children = tree.children;
	if (!children) return found;
	for (let index = 0; index < children.length; index += 1) {
		const node = children[index];
		if (node.type === 'code' && node.lang === FENCE_LANG) found.push({ parent: tree, index, node });
		else fences(node, found);
	}
	return found;
}

export default function remarkBcc(options: Options = {}) {
	// Opened once per root rather than once per document: a build walks hundreds
	// of markdown files and every one of them would otherwise re-`realpath` the
	// same directory.
	const roots = new Map<string, CanvasRoot>();

	return function transformer(tree: Node, file: File): void {
		const found = fences(tree);
		if (!found.length) return;

		const rootPath = resolve(file.cwd, options.root ?? '.');
		let root = roots.get(rootPath);
		if (!root) {
			root = openRoot(rootPath);
			roots.set(rootPath, root);
		}

		// A pipeline handed a bare string has no location to resolve against, and
		// guessing at the working directory would resolve a pointer to a file the
		// author never named. `fence.ts` refuses it with a sentence.
		const document = file.path ? (isAbsolute(file.path) ? file.path : resolve(file.cwd, file.path)) : null;

		let preamble: string | null = null;
		for (const { parent, index, node } of found) {
			const result = renderFence({
				root,
				document,
				info: infoString(node),
				body: node.value ?? ''
			});

			if (result.problem !== null) {
				const message = file.message(result.problem, node);
				message.source = 'remark-bcc';
				message.ruleId = 'fence';
			}
			// The first sheet to draw carries the CSS every other one would repeat
			// byte for byte; the fonts inside it are ~200 KB (ticket 052 decision 9).
			if (result.css !== null && options.css !== 'imported') {
				preamble ??= fencePreamble(result.css);
			}

			parent.children![index] = { type: 'html', value: result.html };
		}

		// Ahead of the first fence, wherever in the document that is: a fence
		// inside a list or a blockquote is still a fence, and the preamble that
		// serves it belongs above everything rather than beside one of them.
		if (preamble !== null) tree.children!.unshift({ type: 'html', value: preamble });
	};
}
