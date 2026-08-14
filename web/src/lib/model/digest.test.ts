/**
 * The Markdown rendering, pinned.
 *
 * It is the view a model forms its idea of a canvas from, and — since the
 * renderer crossed the seam (ticket 041) — the same bytes a person reads in the
 * Markdown View and downloads as `.bcc.md`. A silent change in how a lane or a
 * message reads is a silent change in what gets drafted next, in two audiences
 * at once. These assertions are carried over from `mcp/src/digest.test.ts`
 * unchanged, because byte-identity across the move is the whole point of it.
 *
 * The committed example is the fixture on purpose: it is the same file
 * `src/lib/chrome/examples.test.ts` pins byte-exactly, so the two halves of the
 * round trip are held against one document.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { blankCanvas, type CanvasFile } from '$lib/model/canvas';
import { canvasDigest } from '$lib/model/digest';
import { parseCanvasFile } from '$lib/model/parse';
import { toCanvasFile } from '$lib/model/serialize';

function example(name: string): CanvasFile {
	const text = readFileSync(
		fileURLToPath(new URL(`../../../../examples/${name}.bcc.json`, import.meta.url)),
		'utf8'
	);
	const parsed = parseCanvasFile(text);
	if (!parsed.ok) throw new Error(`the fixture no longer parses: ${parsed.reason}`);
	return parsed.file;
}

describe('canvasDigest', () => {
	it('reads the sheet top to bottom, in words', () => {
		const digest = canvasDigest(example('order-fulfillment'));

		expect(digest).toContain('# Order Fulfillment');
		// Classification is the tenth panel, so it reads as a section like the
		// rest — a heading, not a title-block line.
		expect(digest).toContain(
			'## Strategic classification\n\nDomain: core · Business model: revenue · Evolution: custom-built'
		);
		expect(digest).toContain('## Inbound communication');
		// The lane speaks the way the sheet does: the relationship pair under
		// the collaborator with each end behind its sr prefix — the arrow
		// keeping a one-sided pair visibly one-sided — and the message leading
		// with its type spelled out, the accessible name rather than the glyph.
		expect(digest).toContain('### Checkout — bounded-context\n\n→ this context: customer-supplier');
		expect(digest).toContain('event Payment Confirmed — Triggers fulfillment.');
		expect(digest).toContain('command Place Order');
	});

	it('speaks a kind and a two-ended relationship the way the sheet does', () => {
		const digest = canvasDigest(example('notifications'));

		expect(digest).toContain('### Messaging Platform — external-system');
		expect(digest).toContain('Collaborator: open-host-service → this context: conformist');
	});

	it("carries none of the sheet's glyphs", () => {
		for (const name of ['order-fulfillment', 'notifications', 'appointment-scheduling']) {
			const digest = canvasDigest(example(name));
			for (const glyph of ['▶', '◆']) expect(digest).not.toContain(glyph);
		}
	});

	it('costs a fraction of the JSON it describes', () => {
		const file = example('order-fulfillment');
		const json = JSON.stringify(toCanvasFile(file), null, 2);

		expect(canvasDigest(file).length).toBeLessThan(json.length * 0.6);
	});

	it('names the sections that hold nothing, once, instead of printing them empty', () => {
		const digest = canvasDigest(example('royalty-distribution'));
		const [, missing] = digest.split('Nothing yet under: ');

		expect(missing).toBeDefined();
		// The half-finished example is the point of that line: a model reading it
		// should see the gaps as gaps, not infer the canvas is done.
		expect(missing.trimEnd().endsWith('.')).toBe(true);
		expect(digest).not.toContain('## Open questions\n\n\n');
	});

	it('opens an unnamed canvas the way the title bar does', () => {
		const digest = canvasDigest(toCanvasFile(blankCanvas()));

		expect(digest.startsWith('# Untitled\n')).toBe(true);
		expect(digest).toContain('Nothing yet under: Name, Purpose');
	});
});
