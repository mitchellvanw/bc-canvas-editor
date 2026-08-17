/**
 * The docs pipeline and its build-time guard (SPEC §2.1, ticket 072).
 *
 * Two jobs. The transformer turns the eight words into the markup the page
 * already had — checked here against the shapes the shell used to write by
 * hand — and the guard throws on anything else, which is what fails
 * `npm run build` rather than shipping a directive that renders as nothing.
 * The vocabulary has no other reference: the guard's own message is it.
 */
import { describe, expect, it } from 'vitest';
import { renderBodies, renderDocsMarkdown } from './bodies';
import { sections } from '$lib/docs/sections';

const render = (markdown: string) => renderDocsMarkdown(markdown, 'docs/site/probe.md');

describe('the eight words (ticket 072 decision 2)', () => {
	it('opens every body with the lede, and throws when one does not', () => {
		expect(render('The opening line.\n\nAnd a second.')).toBe(
			'<p class="lede">The opening line.</p>\n<p>And a second.</p>'
		);
		// The lede is the page's one piece of positional typography, so losing
		// it is loud rather than silent.
		expect(() => render('### A heading first\n\nThen prose.')).toThrow(
			/must open with a paragraph/
		);
	});

	it(':::note draws the tilted aside with its label, alternating tilt down the page', () => {
		expect(render('Lede.\n\n:::note\nA caveat.\n:::')).toContain(
			'<aside class="note rotate-[1.2deg]">' +
				'<p class="font-mono font-medium tracking-wide text-ink-faint">field note</p>' +
				'<p>A caveat.</p></aside>'
		);
		// Built as hast, so a note can carry a link — the string-concatenating
		// prototype could not (072's reframing finding).
		expect(render('Lede.\n\n:::note\nSee [SPEC.md](/x) and `bcc fmt`.\n:::')).toContain(
			'<p>See <a href="/x">SPEC.md</a> and <code>bcc fmt</code>.</p>'
		);
	});

	it(':::term reproduces the hand-placed prompt and comment spans', () => {
		const html = render('Lede.\n\n:::term\n```console\n$ bcc ls    # what is here\n```\n:::');
		expect(html).toContain(
			'<pre class="term"><span class="text-ink-faint">$</span> bcc ls    ' +
				'<span class="text-ink-faint"># what is here</span></pre>'
		);
		// No nested <code>: the directive consumes its fence, so the DOM is the
		// bare <pre class="term"> the page has today.
		expect(html).not.toContain('<code');
	});

	it(':::filecard captions the card and greys the fence lines of a markdown fence', () => {
		expect(render('Lede.\n\n:::filecard{name="astro.config.mjs"}\n```\nconst x = 1;\n```\n:::')).toContain(
			'<figure class="filecard"><figcaption>astro.config.mjs</figcaption><pre><code>const x = 1;</code></pre></figure>'
		);
		expect(render('Lede.\n\n:::filecard{name="orders.md"}\n````markdown\n```bcc\n../a.bcc.json\n```\n````\n:::')).toContain(
			'<code class="language-markdown"><span class="text-ink-faint">```bcc</span>\n' +
				'../a.bcc.json\n<span class="text-ink-faint">```</span></code>'
		);
	});

	it(':::card turns its list into the <dl> remark-gfm has no syntax for', () => {
		const html = render(
			'Lede.\n\n:::card{label="comes back" tone="solid"}\n- `a.json` — a file\n\n  What it is.\n:::'
		);
		expect(html).toContain(
			'<div class="border border-line bg-sheet p-5 sm:self-start">' +
				'<p class="font-mono font-medium tracking-wide text-ink-faint">comes back</p>' +
				'<dl><dt><code>a.json</code> — a file</dt><dd>What it is.</dd></dl></div>'
		);
	});

	it(':::grid, :::scroller, ::figure and :kbd carry the rest of the furniture', () => {
		expect(render('Lede.\n\n::::grid{cols="even"}\n:::scroller\nrow\n:::\n::::')).toContain(
			'<div class="mt-6 grid gap-5 sm:grid-cols-2"><div class="overflow-x-auto"><p>row</p></div></div>'
		);
		expect(render('Lede.\n\n::figure{alt="A sheet"}')).toMatch(
			/<img src="[^"]+\.svg" alt="A sheet" class="h-40 w-full object-cover object-top" width="1440" height="1292" loading="lazy">/
		);
		expect(render('Press :kbd[⌘Z] to undo.')).toBe('<p class="lede">Press <kbd>⌘Z</kbd> to undo.</p>');
	});
});

describe('the guard (ticket 072 decisions 7 and 10)', () => {
	it('throws on an unknown name, and names the vocabulary in the message', () => {
		expect(() => render('Lede.\n\n:::flecard{name="orders.md"}\nx\n:::')).toThrow(
			'unknown directive "flecard" at docs/site/probe.md:3 — known: note, term, filecard, grid, card, scroller, figure, kbd'
		);
	});

	it('catches the colon hazard, because a consumed word parses as an unknown directive', () => {
		// `9:30` and `npm:test` render as `9` and `npm` with the rest deleted —
		// the second instance of silent content corruption this page guards.
		expect(() => render('The time is 9:30 today.')).toThrow(/unknown directive "30"/);
		expect(() => render('Run npm:test now.')).toThrow(/unknown directive "test"/);
		// A space after the colon disarms it; today's prose reads that way.
		expect(render('Three views: Sheet, JSON, Markdown.')).toBe(
			'<p class="lede">Three views: Sheet, JSON, Markdown.</p>'
		);
	});

	it('throws on a misspelled, missing or out-of-set attribute', () => {
		expect(() => render('Lede.\n\n:::filecard{nmae="orders.md"}\nx\n:::')).toThrow(
			'unknown attribute "nmae" on :filecard at docs/site/probe.md:3 — allowed: name'
		);
		expect(() => render('Lede.\n\n:::filecard\nx\n:::')).toThrow(
			':filecard at docs/site/probe.md:3 is missing required attribute "name"'
		);
		expect(() => render('Lede.\n\n:::card{label="x" tone="framded"}\ny\n:::')).toThrow(
			':card at docs/site/probe.md:3 — tone must be one of: solid, dashed, framed'
		);
		expect(() => render('Lede.\n\n::::grid{cols="three"}\nx\n::::')).toThrow(
			/cols must be one of: even, wider-right/
		);
	});

	it('throws when a word is written in the wrong directive form', () => {
		expect(() => render('Lede.\n\n::note\n')).toThrow(
			':note at docs/site/probe.md:3 is a leaf directive — note is written :::note'
		);
		expect(() => render('Lede.\n\n:::figure{alt="x"}\nbody\n:::')).toThrow(
			/figure is written ::figure/
		);
	});

	it('throws on a :::term with no fence to colour', () => {
		expect(() => render('Lede.\n\n:::term\njust prose\n:::')).toThrow(
			':term at docs/site/probe.md:3 must contain a fenced code block'
		);
	});
});

describe('the eight bodies (SPEC §2.1)', () => {
	const bodies = renderBodies();

	it('renders one body per register row, none of them empty', () => {
		expect(Object.keys(bodies).toSorted()).toEqual(sections.map((s) => s.id).toSorted());
		for (const [id, html] of Object.entries(bodies)) {
			expect(html.startsWith('<p class="lede">'), `${id} opens with the lede`).toBe(true);
		}
	});

	it('carries no script and no raw HTML through to the page', () => {
		for (const html of Object.values(bodies)) expect(html).not.toContain('<script');
	});

	it('alternates the six field notes down the page, editor first', () => {
		const tilts = sections.flatMap((s) => [...bodies[s.id].matchAll(/<aside class="note ([^"]+)"/g)].map((m) => m[1]));
		expect(tilts).toEqual([
			'rotate-[1.2deg]',
			'-rotate-1',
			'rotate-[1.2deg]',
			'-rotate-1',
			'rotate-[1.2deg]',
			'-rotate-1'
		]);
	});
});
