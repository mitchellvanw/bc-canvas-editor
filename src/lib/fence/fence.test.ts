import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { openRoot } from '$lib/fs/root';
import { renderSheetParts } from '$lib/render';
import { fencePreamble, renderFence } from './fence';

const EXAMPLES = ['order-fulfillment', 'notifications', 'royalty-distribution'];

function project() {
	const root = openRoot(mkdtempSync(join(tmpdir(), 'bcc-fence-')));
	writeFileSync(
		join(root.path, 'order-fulfillment.bcc.json'),
		readFileSync('examples/order-fulfillment.bcc.json', 'utf8')
	);
	return root;
}

/** A fence in `<root>/docs/guide.md`, pointing wherever the test says. */
function fence(root: ReturnType<typeof openRoot>, pointer: string, info = 'bcc') {
	return renderFence({
		root,
		document: join(root.path, 'docs/guide.md'),
		info,
		body: pointer
	});
}

describe('the sheet a fence draws', () => {
	it('is the renderer’s, wrapper and all', () => {
		const root = project();
		const result = fence(root, '../order-fulfillment.bcc.json');

		expect(result.problem).toBeNull();
		expect(result.html).toContain('class="bcc-canvas"');
		expect(result.html).toContain('Order Fulfillment');
		expect(result.css).toContain('.bcc-canvas {');
	});

	it('trims the pointer, and reads a path with no directory in it', () => {
		const root = project();
		const result = renderFence({
			root,
			document: join(root.path, 'guide.md'),
			info: 'bcc',
			body: '\n  order-fulfillment.bcc.json  \n'
		});

		expect(result.problem).toBeNull();
		expect(result.html).toContain('class="bcc-canvas"');
	});

	/**
	 * The property the preamble rests on. `fencePreamble` is emitted once per
	 * document carrying the CSS of whichever fence drew first, which is only
	 * sound if every canvas produces the same bytes — Svelte injects a
	 * component's whole stylesheet whatever its branches took, but that is its
	 * behaviour rather than its contract, so it is pinned here rather than
	 * assumed. A canvas with empty sections is the case that would break it.
	 */
	it('carries CSS that does not depend on which canvas drew', () => {
		const sheets = EXAMPLES.map((name) =>
			renderSheetParts(JSON.parse(readFileSync(`examples/${name}.bcc.json`, 'utf8')))
		);
		for (const sheet of sheets) expect(sheet.css).toBe(sheets[0].css);
	});

	it('hoists the fonts into the preamble and nowhere else', () => {
		const root = project();
		const result = fence(root, '../order-fulfillment.bcc.json');

		expect(result.html).not.toContain('@font-face');
		expect(fencePreamble(result.css!)).toContain('@font-face');
	});
});

describe('a fence that cannot draw', () => {
	it('refuses a tail after bcc, quoting the line', () => {
		const root = project();
		const result = fence(root, '../order-fulfillment.bcc.json', 'bcc view=markdown');

		expect(result.problem).toBe(
			`bcc takes no options; this fence's info string reads "bcc view=markdown".`
		);
		expect(result.css).toBeNull();
	});

	it('refuses a body that is not one path', () => {
		const root = project();
		const two = fence(root, 'a.bcc.json\nb.bcc.json');
		const none = fence(root, '   \n  ');

		for (const result of [two, none]) {
			expect(result.problem).toBe('A bcc fence holds one path to a Canvas file and nothing else.');
		}
	});

	it('refuses a leading slash as syntax rather than reading it two ways', () => {
		const root = project();
		const result = fence(root, '/order-fulfillment.bcc.json');

		expect(result.problem).toContain('relative to the markdown file that holds it');
		expect(result.problem).toContain('a leading "/" is not read here as the repo root');
	});

	it('refuses when there is no document to resolve against', () => {
		const root = project();
		const result = renderFence({
			root,
			document: null,
			info: 'bcc',
			body: 'order-fulfillment.bcc.json'
		});

		expect(result.problem).toBe(
			'order-fulfillment.bcc.json: no document to resolve against; ' +
				'a bcc fence needs the location of the file that holds it.'
		);
	});

	it('refuses a path out of the root, naming it as the author wrote it', () => {
		const root = project();
		const result = fence(root, '../../elsewhere/secret.bcc.json');

		expect(result.problem).toContain('outside the canvas root');
		// The escape is named from the root, not from this machine.
		expect(result.html).not.toContain(root.path);
	});

	it('says a missing file is missing', () => {
		const root = project();
		const result = fence(root, 'nowhere.bcc.json');

		expect(result.problem).toContain('docs/nowhere.bcc.json: could not be read');
		expect(result.html).toContain('docs/nowhere.bcc.json: could not be read.');
	});
});

describe('the placeholder', () => {
	it('says what happened, with no preamble to depend on', () => {
		const root = project();
		const result = fence(root, 'nowhere.bcc.json');

		expect(result.html).toContain('This bcc fence didn&#39;t render.');
		expect(result.html).not.toContain('class=');
		expect(result.html).not.toContain('@font-face');
		expect(result.css).toBeNull();
	});

	/**
	 * Ticket 052: `detail` goes to the adapter's warning channel, never the
	 * page. Two reasons rather than one — SPEC §3.3 puts the detail where the
	 * offending bytes are on screen and they are in another file, and a built
	 * site would otherwise publish the author's absolute paths to strangers.
	 */
	it('withholds the detail the warning channel gets', () => {
		const root = project();
		writeFileSync(join(root.path, 'broken.bcc.json'), '{"version": 2, "name": 4}');
		const result = renderFence({
			root,
			document: join(root.path, 'guide.md'),
			info: 'bcc',
			body: 'broken.bcc.json'
		});

		expect(result.html).toContain('broken.bcc.json: not a Canvas file.');
		expect(result.problem).toContain('broken.bcc.json: ');
		expect(result.problem!.length).toBeGreaterThan('broken.bcc.json: not a Canvas file.'.length);
	});

	it('escapes the sentence it carries', () => {
		const root = project();
		const result = fence(root, '../order-fulfillment.bcc.json', 'bcc <script>');

		expect(result.html).toContain('&lt;script&gt;');
		expect(result.html).not.toContain('<script>');
	});
});
