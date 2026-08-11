// @vitest-environment jsdom
/**
 * The live sheet (SPEC §6): every free-text value of the SPEC §3.1 reference
 * example is contenteditable in place, each field carries its identity as its
 * accessible name (SPEC §8.5), and the commit grammar feeds the document +
 * autosave pipeline — one blur, one commit, one write. Serialized output after
 * edits still follows the §3.2 shape rules.
 */
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { canvas } from '$lib/editor/document.svelte';
import EditableSheet from '$lib/editor/EditableSheet.svelte';
import { AUTOSAVE_KEY } from '$lib/model/autosave';
import { stampIds, type CanvasFile } from '$lib/model/canvas';
import { parseCanvasFile } from '$lib/model/parse';
import { REFERENCE_FILE } from '$lib/model/reference.fixture';
import { serializeCanvas } from '$lib/model/serialize';

// Neither jsdom 30 nor Node's experimental stub provides a working
// localStorage; the autosave pipeline needs a real Storage global under test.
function memoryStorage(): Storage {
	const map = new Map<string, string>();
	return {
		get length() {
			return map.size;
		},
		clear: () => map.clear(),
		getItem: (key: string) => map.get(key) ?? null,
		key: (i: number) => [...map.keys()][i] ?? null,
		removeItem: (key: string) => void map.delete(key),
		setItem: (key: string, value: string) => void map.set(key, value)
	};
}
Object.defineProperty(globalThis, 'localStorage', {
	value: memoryStorage(),
	configurable: true,
	writable: true
});

function referenceDoc() {
	const result = parseCanvasFile(REFERENCE_FILE);
	if (!result.ok) throw new Error('reference fixture must parse');
	return stampIds(result.file);
}

let component: ReturnType<typeof mount> | null = null;

function render(): HTMLElement {
	const target = document.createElement('div');
	document.body.append(target);
	component = mount(EditableSheet, { target });
	flushSync();
	return target;
}

function fields(el: HTMLElement, label: string): HTMLElement[] {
	return [...el.querySelectorAll<HTMLElement>(`[contenteditable][aria-label="${label}"]`)];
}

function field(el: HTMLElement, label: string): HTMLElement {
	const matches = fields(el, label);
	if (matches.length !== 1) throw new Error(`expected one "${label}" field, found ${matches.length}`);
	return matches[0];
}

function editAndBlur(node: HTMLElement, text: string) {
	node.textContent = text;
	node.dispatchEvent(new FocusEvent('blur'));
	flushSync();
}

function press(node: HTMLElement, key: string): KeyboardEvent {
	const event = new KeyboardEvent('keydown', { key, cancelable: true, bubbles: true });
	node.dispatchEvent(event);
	flushSync();
	return event;
}

/** The serialized document as the parsed Canvas-file shape, for shape assertions. */
function serialized(): CanvasFile {
	return JSON.parse(serializeCanvas(canvas.doc)) as CanvasFile;
}

beforeEach(() => {
	localStorage.clear();
	canvas.replace(referenceDoc());
});

afterEach(() => {
	if (component) unmount(component);
	component = null;
	document.body.innerHTML = '';
	vi.restoreAllMocks();
});

describe('every §3.1 free-text value is editable in place', () => {
	it('renders each value as a contenteditable field named by its identity', () => {
		const el = render();
		const values = (label: string) => fields(el, label).map((f) => f.textContent);
		expect(values('Name')).toEqual(['Order Fulfillment']);
		expect(values('Description')).toEqual([
			'Coordinates picking, packing and shipping once an order is paid.'
		]);
		expect(values('Collaborator')).toEqual(['Checkout', 'Notifications']);
		expect(values('Message name')).toEqual(['Place Order', 'Payment Confirmed', 'Order Shipped']);
		expect(values('Term')).toEqual(['Shipment']);
		expect(values('Definition')).toEqual(['A physical parcel dispatched against an order.']);
		expect(values('Decision')).toEqual(['No partial shipments']);
		expect(values('Decision description')).toEqual(['An order ships complete or not at all.']);
		expect(values('Assumption')).toEqual(['Warehouse stock counts are accurate within the hour.']);
		expect(values('Verification metric')).toEqual(['Time from payment to dispatch under 4 hours.']);
		expect(values('Open question')).toEqual(['Who owns returns — this context or a new one?']);
	});

	it('offers an in-place field for absent optional descriptions, one per message', () => {
		const el = render();
		expect(fields(el, 'Message description').map((f) => f.textContent)).toEqual([
			'',
			'Triggers fulfillment.',
			''
		]);
	});

	it('marks prose fields multiline and single-line fields not (SPEC §6)', () => {
		const el = render();
		expect(field(el, 'Description').getAttribute('aria-multiline')).toBe('true');
		expect(field(el, 'Definition').getAttribute('aria-multiline')).toBe('true');
		expect(field(el, 'Decision description').getAttribute('aria-multiline')).toBe('true');
		for (const desc of fields(el, 'Message description')) {
			expect(desc.getAttribute('aria-multiline')).toBe('true');
		}
		expect(field(el, 'Term').getAttribute('aria-multiline')).toBeNull();
		expect(field(el, 'Assumption').getAttribute('aria-multiline')).toBeNull();
	});
});

describe('the commit grammar feeds the document and autosave', () => {
	it('commits a prose edit on blur and the change survives reload via autosave', () => {
		const el = render();
		editAndBlur(field(el, 'Description'), 'Ships whatever was paid for.');
		expect(canvas.doc.purpose).toBe('Ships whatever was paid for.');
		expect(canvas.unexported).toBe(true);
		expect(localStorage.getItem(AUTOSAVE_KEY)).toContain('Ships whatever was paid for.');
	});

	it('writes autosave exactly once per field blur', () => {
		const el = render();
		const setItem = vi.spyOn(localStorage, 'setItem');
		editAndBlur(fields(el, 'Collaborator')[0], 'Storefront');
		expect(setItem).toHaveBeenCalledTimes(1);
	});

	it('commits nothing when a field blurs unchanged', () => {
		const el = render();
		const setItem = vi.spyOn(localStorage, 'setItem');
		editAndBlur(field(el, 'Term'), 'Shipment');
		expect(setItem).not.toHaveBeenCalled();
		expect(canvas.unexported).toBe(false);
	});

	it('commits single-line fields on Enter', () => {
		const el = render();
		const who = fields(el, 'Collaborator')[0];
		who.textContent = 'Storefront';
		const event = press(who, 'Enter');
		expect(event.defaultPrevented).toBe(true);
		expect(canvas.doc.inboundCommunication[0].collaborator.name).toBe('Storefront');
	});

	it('lets Enter insert newlines in prose fields without committing', () => {
		const el = render();
		const event = press(field(el, 'Description'), 'Enter');
		expect(event.defaultPrevented).toBe(false);
		expect(canvas.unexported).toBe(false);
	});

	it('reverts a field on Esc without committing', () => {
		const el = render();
		const term = field(el, 'Term');
		term.textContent = 'Parcel';
		press(term, 'Escape');
		expect(term.textContent).toBe('Shipment');
		expect(canvas.doc.ubiquitousLanguage[0].term).toBe('Shipment');
		expect(canvas.unexported).toBe(false);
	});

	it('edits sticky one-liners in place', () => {
		const el = render();
		editAndBlur(field(el, 'Open question'), 'Do returns belong here?');
		expect(canvas.doc.openQuestions).toEqual(['Do returns belong here?']);
	});

	it('edits message names and descriptions in place', () => {
		const el = render();
		editAndBlur(fields(el, 'Message name')[0], 'Submit Order');
		editAndBlur(fields(el, 'Message description')[0], 'Starts the fulfillment clock.');
		const [first] = canvas.doc.inboundCommunication[0].messages;
		expect(first.name).toBe('Submit Order');
		expect(first.description).toBe('Starts the fulfillment clock.');
	});
});

describe('serialized shape after edits (SPEC §3.2)', () => {
	it('omits optional fields entirely when emptied — never empty-string noise', () => {
		const el = render();
		editAndBlur(fields(el, 'Message description')[1], '');
		editAndBlur(field(el, 'Definition'), '');
		editAndBlur(field(el, 'Decision description'), '');
		const file = serialized();
		expect(file.inboundCommunication[0].messages[1]).toEqual({
			type: 'event',
			name: 'Payment Confirmed'
		});
		expect(file.ubiquitousLanguage[0]).toEqual({ term: 'Shipment' });
		expect(file.businessDecisions[0]).toEqual({ name: 'No partial shipments' });
	});

	it('keeps a filled-in optional description in the file', () => {
		const el = render();
		editAndBlur(fields(el, 'Message description')[2], 'Fans out to email and SMS.');
		expect(serialized().outboundCommunication[0].messages[0]).toEqual({
			type: 'event',
			name: 'Order Shipped',
			description: 'Fans out to email and SMS.'
		});
	});
});
