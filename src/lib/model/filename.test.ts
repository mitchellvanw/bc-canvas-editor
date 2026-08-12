import { describe, expect, it } from 'vitest';
import { exportFileName } from '$lib/model/filename';

describe('exportFileName', () => {
	it('slugifies the context name into the stem', () => {
		expect(exportFileName('Order Fulfillment', 'json')).toBe('order-fulfillment.bcc.json');
	});

	it('builds the whole family of extensions', () => {
		expect(exportFileName('Order Fulfillment', 'html')).toBe('order-fulfillment.bcc.html');
		expect(exportFileName('Order Fulfillment', 'png')).toBe('order-fulfillment.bcc.png');
		expect(exportFileName('Order Fulfillment', 'md')).toBe('order-fulfillment.bcc.md');
	});

	it('collapses punctuation and runs of spaces into single hyphens', () => {
		expect(exportFileName('Billing & Payments  (v2)', 'json')).toBe('billing-payments-v2.bcc.json');
	});

	it('strips diacritics', () => {
		expect(exportFileName('Écoute Réseau', 'json')).toBe('ecoute-reseau.bcc.json');
	});

	it('never leaves leading or trailing hyphens', () => {
		expect(exportFileName('  — Shipping —  ', 'json')).toBe('shipping.bcc.json');
	});

	it.each([[''], ['   '], ['—?!—']])(
		'falls back to bounded-context-canvas for %j',
		(name) => {
			expect(exportFileName(name, 'json')).toBe('bounded-context-canvas.bcc.json');
		}
	);
});
