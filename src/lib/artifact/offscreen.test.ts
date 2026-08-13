// @vitest-environment jsdom
/**
 * The offscreen artifact mount (SPEC §9): the PNG artifact rasterizes a hidden
 * mount of the read-only CanvasSheet at the fixed desktop layout width — never
 * the live editor DOM. Ticket 04 establishes the mechanism; wayfinder ticket
 * 050 moved the HTML artifact off it onto the headless renderer, leaving PNG
 * as the one export that needs a live subtree.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { stampIds } from '$lib/model/canvas';
import { parseCanvasFile } from '$lib/model/parse';
import { REFERENCE_FILE } from '$lib/model/reference.fixture';
import { SHEET_MARGIN, SHEET_WIDTH } from '$lib/render/metrics';
import { mountArtifactSheet } from './offscreen';

function referenceDoc() {
	const result = parseCanvasFile(REFERENCE_FILE);
	if (!result.ok) throw new Error('reference fixture must parse');
	return stampIds(result.file);
}

let active: { element: HTMLElement; dispose(): void } | null = null;

function mountReference() {
	active = mountArtifactSheet(referenceDoc());
	return active.element;
}

afterEach(() => {
	active?.dispose();
	active = null;
});

describe('mountArtifactSheet', () => {
	it('renders the full sheet, title block through footer', () => {
		const el = mountReference();
		expect(document.body.contains(el)).toBe(true);
		expect(el.querySelector('h1')?.textContent).toBe('Order Fulfillment');
		expect(el.querySelectorAll('h2')).toHaveLength(10);
		expect(el.querySelector('footer [data-legend]')).not.toBeNull();
		expect(el.querySelector('footer')?.textContent).toContain('CC BY 4.0');
	});

	it('is the fixed desktop layout width with the cream margin, independent of window size', () => {
		const el = mountReference();
		expect(el.style.width).toBe(`${SHEET_WIDTH}px`);
		expect(el.style.padding).toBe(`${SHEET_MARGIN}px`);
		expect(el.classList.contains('paper-ground')).toBe(true);
	});

	it('stays out of view, AT, and tab order without being display:none', () => {
		const el = mountReference();
		expect(el.style.position).toBe('fixed');
		expect(parseInt(el.style.left, 10)).toBeLessThan(0);
		expect(el.getAttribute('aria-hidden')).toBe('true');
		expect(el.hasAttribute('inert')).toBe(true);
		expect(el.style.display).not.toBe('none');
	});

	it('mounts the read-only sheet — no editor affordances can leak in', () => {
		const el = mountReference();
		expect(el.querySelector('[contenteditable], [data-placeholder], button, input')).toBeNull();
	});

	it('dispose removes the mount from the document', () => {
		const el = mountReference();
		active?.dispose();
		active = null;
		expect(document.body.contains(el)).toBe(false);
	});
});
