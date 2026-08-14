import { describe, expect, it } from 'vitest';
import { windowTitle } from '$lib/model/title';

describe('windowTitle', () => {
	it('reads "<name> — BC Canvas" for a named canvas', () => {
		expect(windowTitle('Order Fulfillment')).toBe('Order Fulfillment — BC Canvas');
	});

	it('reads "Untitled — BC Canvas" when the name is empty', () => {
		expect(windowTitle('')).toBe('Untitled — BC Canvas');
	});

	it('treats a whitespace-only name as unnamed', () => {
		expect(windowTitle('   ')).toBe('Untitled — BC Canvas');
	});
});
