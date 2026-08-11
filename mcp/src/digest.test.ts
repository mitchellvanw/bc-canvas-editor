/**
 * The digest, pinned.
 *
 * It is the view a model forms its idea of a canvas from, so a silent change
 * in how a lane or a message reads is a silent change in what gets drafted
 * next. The committed example is the fixture on purpose: it is the same file
 * `src/lib/chrome/examples.test.ts` pins byte-exactly on the app side, so the
 * two halves of the round trip are held against one document.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { blankCanvas, type CanvasFile } from '$lib/model/canvas';
import { parseCanvasFile } from '$lib/model/parse';
import { toCanvasFile } from '$lib/model/serialize';
import { canvasDigest } from './digest';

function example(name: string): CanvasFile {
	const text = readFileSync(
		fileURLToPath(new URL(`../../examples/${name}.bcc.json`, import.meta.url)),
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
		expect(digest).toContain('### Checkout\n\n→ this context: customer-supplier');
		expect(digest).toContain('event Payment Confirmed — Triggers fulfillment.');
		expect(digest).toContain('command Place Order');
	});

	it('speaks a kind and a two-ended relationship the way the sheet does', () => {
		// The committed examples carry neither yet — they are migration output
		// until examples-v2-content hand-authors them — so the new fields are
		// pinned against a built lane rather than a fixture.
		const file = toCanvasFile(blankCanvas());
		file.inboundCommunication.push({
			collaborator: { name: 'Payments', kind: 'bounded-context' },
			relationship: { theirs: 'open-host-service', ours: 'conformist' },
			messages: []
		});

		const digest = canvasDigest(file);

		expect(digest).toContain('### Payments — bounded-context');
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
