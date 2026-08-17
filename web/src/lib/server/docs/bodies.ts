/**
 * The docs page's bodies: the eight committed Markdown files, the six-package
 * pipeline that reads them, and the transformer that turns the directive
 * vocabulary into the page's furniture (SPEC §2.1; tickets 069 and 072).
 *
 * This module is under `$lib/server/` on purpose. A client import of it fails
 * `npm run build`, which is what keeps the sources and the parser out of the
 * browser bundle — measured, that is the difference between 412 bytes and
 * 138 KB fetched on a hover over the homepage's Docs link. The boundary is
 * enforced by the build, not by etiquette.
 *
 * Two things are load-bearing and easy to undo by accident:
 *
 *   - **No `rehype-raw`, no `rehype-sanitize`.** Without raw, `remark-rehype`
 *     drops raw tags and keeps their text, so "no raw HTML in the prose" is a
 *     property of the pipeline instead of a rule to remember, and no script
 *     can reach the page. Sanitize would rewrite `id="editor"` to
 *     `id="user-content-editor"` and break the eight inbound links.
 *   - **Furniture is built as hast** — `hName` / `hProperties` / `hChildren`,
 *     never concatenated HTML. That is what lets a field note carry a link and
 *     keeps escaping the pipeline's job.
 *
 * The vocabulary's only reference is `WORDS` below, by way of the error the
 * guard throws. Nothing else lists the eight words, so nothing else can go
 * stale.
 */

import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { sections, type DocsId } from '$lib/docs/sections';
import canvasFile from '../../../../../docs/site/canvas-file.md?raw';
import cli from '../../../../../docs/site/cli.md?raw';
import editor from '../../../../../docs/site/editor.md?raw';
import exports from '../../../../../docs/site/exports.md?raw';
import fence from '../../../../../docs/site/fence.md?raw';
import mcp from '../../../../../docs/site/mcp.md?raw';
import remark from '../../../../../docs/site/remark.md?raw';
import vscode from '../../../../../docs/site/vscode.md?raw';
// The page's one image. Vite never sees `{@html}` output, so an image written
// in Markdown would emit an unhashed path that 404s — `::figure` owns the URL
// instead, and a second image cannot be added without a code change.
import orderSvg from '../../../../../examples/order-fulfillment.bcc.svg?url';

/**
 * The eight bodies, named rather than globbed: a renamed or missing file is a
 * Vite module-resolution error that fails `vite build` and `vite dev` alike,
 * which is the id contract's first guard.
 */
const SOURCES: Record<DocsId, string> = {
	editor,
	'canvas-file': canvasFile,
	exports,
	cli,
	fence,
	remark,
	vscode,
	mcp
};

/* -------------------------------------------------------------------------
 * The tree, structurally. The transformer walks mdast nodes of many types and
 * writes hast onto them; these local shapes say exactly what it touches.
 * ---------------------------------------------------------------------- */

interface HastText {
	type: 'text';
	value: string;
}
interface HastElement {
	type: 'element';
	tagName: string;
	properties: Record<string, string | number | string[]>;
	children: HastChild[];
}
type HastChild = HastText | HastElement;

interface MdData {
	hName?: string;
	hProperties?: Record<string, string | number | string[]>;
	hChildren?: HastChild[];
}
interface MdNode {
	type: string;
	/** Directive nodes only. */
	name?: string;
	attributes?: Record<string, string | null | undefined> | null;
	/** `code` and `text` nodes. */
	value?: string;
	lang?: string | null;
	children?: MdNode[];
	data?: MdData;
	position?: { start: { line: number } };
}

/** Alternation state for the field notes, held for one render of the page. */
interface Page {
	notes: number;
}

/* -------------------------------------------------------------------------
 * The vocabulary.
 * ---------------------------------------------------------------------- */

type Kind = 'containerDirective' | 'leafDirective' | 'textDirective';

interface Word {
	/** How the word is written — `:::name`, `::name` or `:name[…]`. */
	kind: Kind;
	/**
	 * Every attribute the word takes. All of them are required; a value list
	 * closes the set, `null` leaves it a free string.
	 */
	attributes?: Record<string, readonly string[] | null>;
	build: (node: MdNode, ctx: Ctx) => void;
}

interface Ctx {
	page: Page;
	/** The file being rendered, for the guard's messages. */
	path: string;
}

/** `docs/site/fence.md:12` — a guard message arrives at the line it is about. */
function where(ctx: Ctx, node: MdNode): string {
	return `${ctx.path}:${node.position?.start.line ?? 0}`;
}

function fail(message: string): never {
	throw new Error(message);
}

const FORM: Record<Kind, (name: string) => string> = {
	containerDirective: (name) => `:::${name}`,
	leafDirective: (name) => `::${name}`,
	textDirective: (name) => `:${name}[…]`
};

/** The field note's tilts, in page order: a perfect alternation, measured. */
const TILTS = ['rotate-[1.2deg]', '-rotate-1'];

/** The label above a field note and above the two bordered `#exports` cards. */
const LABEL = ['font-mono', 'font-medium', 'tracking-wide', 'text-ink-faint'];

const CARD_TONES: Record<string, { card: string[]; label: string[]; list: boolean }> = {
	solid: { card: ['border', 'border-line', 'bg-sheet', 'p-5', 'sm:self-start'], label: LABEL, list: true },
	dashed: { card: ['border', 'border-dashed', 'border-ink-faint', 'bg-sheet', 'p-5'], label: LABEL, list: true },
	framed: {
		card: ['overflow-hidden', 'rounded-[4px]', 'border', 'border-line', 'bg-sheet', 'shadow-sm'],
		label: ['border-b', 'border-line', 'px-3', 'py-2', 'font-mono', 'text-ink-soft'],
		list: false
	}
};

const GRID_COLS: Record<string, string[]> = {
	even: ['mt-6', 'grid', 'gap-5', 'sm:grid-cols-2'],
	'wider-right': [
		'mt-6',
		'grid',
		'items-stretch',
		'gap-5',
		'md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]'
	]
};

const WORDS: Record<string, Word> = {
	note: {
		kind: 'containerDirective',
		build(node, ctx) {
			const tilt = TILTS[ctx.page.notes++ % TILTS.length];
			element(node, 'aside', { className: ['note', tilt] });
			label(node, 'field note', LABEL);
		}
	},

	term: {
		kind: 'containerDirective',
		build(node, ctx) {
			// The directive consumes its fence: nothing an author writes can
			// colour inside a term block, so the prompt and comment spans can
			// only come from here.
			const code = (node.children ?? []).find((child) => child.type === 'code');
			if (!code) fail(`:term at ${where(ctx, node)} must contain a fenced code block`);
			element(node, 'pre', { className: ['term'] });
			node.data = { ...node.data, hChildren: shellLines(code.value ?? '') };
			node.children = [];
		}
	},

	filecard: {
		kind: 'containerDirective',
		attributes: { name: null },
		build(node) {
			element(node, 'figure', { className: ['filecard'] });
			for (const child of node.children ?? []) {
				if (child.type !== 'code') continue;
				// The card's teaching device: in `orders.md` the fence markers
				// are greyed so the *path* is what stands out.
				child.data = {
					...child.data,
					hChildren:
						child.lang === 'markdown' ? fenceLines(child.value ?? '') : [text(child.value ?? '')]
				};
			}
			label(node, attribute(node, 'name'), [], 'figcaption');
		}
	},

	grid: {
		kind: 'containerDirective',
		attributes: { cols: Object.keys(GRID_COLS) },
		build(node) {
			element(node, 'div', { className: GRID_COLS[attribute(node, 'cols')] });
		}
	},

	card: {
		kind: 'containerDirective',
		attributes: { label: null, tone: Object.keys(CARD_TONES) },
		build(node) {
			const tone = CARD_TONES[attribute(node, 'tone')];
			element(node, 'div', { className: tone.card });
			if (tone.list) definitionList(node);
			label(node, attribute(node, 'label'), tone.label);
		}
	},

	scroller: {
		kind: 'containerDirective',
		build(node) {
			element(node, 'div', { className: ['overflow-x-auto'] });
		}
	},

	figure: {
		kind: 'leafDirective',
		attributes: { alt: null },
		build(node) {
			element(node, 'img', {
				src: orderSvg,
				alt: attribute(node, 'alt'),
				className: ['h-40', 'w-full', 'object-cover', 'object-top'],
				width: 1440,
				height: 1292,
				loading: 'lazy'
			});
			node.children = [];
		}
	},

	kbd: {
		kind: 'textDirective',
		build(node) {
			element(node, 'kbd', {});
		}
	}
};

const KNOWN = Object.keys(WORDS);

/* -------------------------------------------------------------------------
 * Building furniture.
 * ---------------------------------------------------------------------- */

function text(value: string): HastText {
	return { type: 'text', value };
}

function span(value: string): HastElement {
	return {
		type: 'element',
		tagName: 'span',
		properties: { className: ['text-ink-faint'] },
		children: [text(value)]
	};
}

function element(node: MdNode, hName: string, hProperties: HastElement['properties']): void {
	node.data = { ...node.data, hName, hProperties };
}

/** Unshift the word's label — a node, never a string prepended to a template. */
function label(node: MdNode, value: string, className: string[], hName = 'p'): void {
	node.children = [
		{
			type: 'paragraph',
			data: { hName, ...(className.length ? { hProperties: { className } } : {}) },
			children: [{ type: 'text', value }]
		},
		...(node.children ?? [])
	];
}

/**
 * `remark-gfm` has no definition lists, so the two `#exports` cards write an
 * ordinary list and it becomes a `<dl>` here: each item's first paragraph is
 * the term, the rest the description.
 */
function definitionList(node: MdNode): void {
	node.children = (node.children ?? []).map((child) => {
		if (child.type !== 'list') return child;
		const rows: MdNode[] = [];
		for (const item of child.children ?? []) {
			for (const [i, part] of (item.children ?? []).entries()) {
				part.data = { ...part.data, hName: i === 0 ? 'dt' : 'dd' };
				rows.push(part);
			}
		}
		return { type: 'definitionList', data: { hName: 'dl' }, children: rows };
	});
}

/** A term block's lines: `$` at line start, and `#…` to end of line. */
function shellLines(value: string): HastChild[] {
	return joinLines(value, (line) => {
		const out: HastChild[] = [];
		let rest = line;
		if (rest.startsWith('$ ')) {
			out.push(span('$'));
			rest = rest.slice(1);
		}
		const comment = /(^|\s)#/.exec(rest);
		if (comment) {
			const at = comment.index + comment[1].length;
			if (at > 0) out.push(text(rest.slice(0, at)));
			out.push(span(rest.slice(at)));
		} else if (rest) {
			out.push(text(rest));
		}
		return out;
	});
}

/** A markdown fence inside a filecard: the fence markers themselves are grey. */
function fenceLines(value: string): HastChild[] {
	return joinLines(value, (line) => [line.startsWith('```') ? span(line) : text(line)]);
}

function joinLines(value: string, line: (source: string) => HastChild[]): HastChild[] {
	const out: HastChild[] = [];
	value.split('\n').forEach((source, i) => {
		if (i > 0) push(out, text('\n'));
		for (const node of line(source)) push(out, node);
	});
	return out;
}

/** Adjacent text nodes are merged, so the `<pre>` reads as one run of source. */
function push(out: HastChild[], node: HastChild): void {
	const last = out.at(-1);
	if (node.type === 'text' && last?.type === 'text') last.value += node.value;
	else out.push(node);
}

function attribute(node: MdNode, name: string): string {
	return node.attributes?.[name] ?? '';
}

/* -------------------------------------------------------------------------
 * The guard, and the walk.
 * ---------------------------------------------------------------------- */

function transform(tree: MdNode, path: string, page: Page): void {
	// The lede is the page's one piece of positional typography — the first
	// paragraph of every body, tagged rather than announced by a ninth word.
	const first = tree.children?.[0];
	if (!first || first.type !== 'paragraph') {
		fail(`${path} must open with a paragraph — it carries the page's lede`);
	}
	first.data = { ...first.data, hProperties: { className: ['lede'] } };

	walk(tree, { page, path });
}

function walk(node: MdNode, ctx: Ctx): void {
	for (const child of node.children ?? []) {
		if (child.type.endsWith('Directive')) apply(child, ctx);
		walk(child, ctx);
	}
}

function apply(node: MdNode, ctx: Ctx): void {
	const name = node.name ?? '';
	const at = where(ctx, node);
	const word = WORDS[name];
	if (!word) {
		// Every accidental text directive lands here too: `9:30` and `npm:test`
		// parse as directives named `30` and `test`.
		fail(`unknown directive "${name}" at ${at} — known: ${KNOWN.join(', ')}`);
	}
	if (node.type !== word.kind) {
		fail(
			`:${name} at ${at} is a ${node.type.replace('Directive', '')} directive` +
				` — ${name} is written ${FORM[word.kind](name)}`
		);
	}

	const allowed = word.attributes ?? {};
	const names = Object.keys(allowed);
	for (const [key, value] of Object.entries(node.attributes ?? {})) {
		if (!(key in allowed)) {
			fail(
				`unknown attribute "${key}" on :${name} at ${at}` +
					` — allowed: ${names.length ? names.join(', ') : '(none)'}`
			);
		}
		const values = allowed[key];
		if (values && !values.includes(value ?? '')) {
			fail(`:${name} at ${at} — ${key} must be one of: ${values.join(', ')}`);
		}
	}
	for (const key of names) {
		if (!node.attributes?.[key]) {
			fail(`:${name} at ${at} is missing required attribute "${key}"`);
		}
	}

	word.build(node, ctx);
}

/* -------------------------------------------------------------------------
 * The pipeline.
 * ---------------------------------------------------------------------- */

function pipeline(page: Page) {
	return unified()
		.use(remarkParse)
		.use(remarkGfm)
		.use(remarkDirective)
		.use(() => (tree: unknown, file: { path?: string }) =>
			transform(tree as MdNode, file.path ?? '<markdown>', page)
		)
		.use(remarkRehype)
		.use(rehypeSlug)
		.use(rehypeStringify);
}

/**
 * Render one body. Exported for the transformer's own tests; the page renders
 * all eight through {@link renderBodies}, which is what makes the field notes
 * alternate down the page rather than within a file.
 */
export function renderDocsMarkdown(markdown: string, path: string): string {
	return String(pipeline({ notes: 0 }).processSync({ path, value: markdown }));
}

/** The eight bodies as HTML, keyed by id, in register order. */
export function renderBodies(): Record<DocsId, string> {
	const page: Page = { notes: 0 };
	const processor = pipeline(page);
	const bodies = {} as Record<DocsId, string>;
	for (const section of sections) {
		bodies[section.id] = String(
			processor.processSync({ path: `docs/site/${section.id}.md`, value: SOURCES[section.id] })
		);
	}
	return bodies;
}
