// @vitest-environment jsdom
/**
 * Undo/redo wiring (SPEC §6.1): ⌘Z/⇧⌘Z intercepted globally on the live
 * sheet — reverting an in-progress field or popping app history — with the
 * affected region scrolled into view and flashed, focus never moving, instant
 * under reduced motion. Chrome offers Undo/Redo buttons with the exact SPEC
 * §10 tooltips, disabled at the ends of history.
 */
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Chrome from '$lib/chrome/Chrome.svelte';
import { renderKeys } from '$lib/chrome/reference';
import { canvas } from '$lib/editor/document.svelte';
import EditableSheet from '$lib/editor/EditableSheet.svelte';
import { FLASH_CLASS } from '$lib/editor/undo';
import { stampIds } from '$lib/model/canvas';
import { parseCanvasFile } from '$lib/model/parse';
import { REFERENCE_FILE } from '$lib/model/reference.fixture';

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

// jsdom implements neither scrollIntoView nor matchMedia; the reveal needs both.
const scrollIntoView = vi.fn();
Element.prototype.scrollIntoView = scrollIntoView;

let reducedMotion = false;
Object.defineProperty(window, 'matchMedia', {
	configurable: true,
	writable: true,
	value: (media: string) =>
		({ matches: reducedMotion && media.includes('prefers-reduced-motion'), media }) as MediaQueryList
});

function referenceDoc() {
	const result = parseCanvasFile(REFERENCE_FILE);
	if (!result.ok) throw new Error('reference fixture must parse');
	return stampIds(result.file);
}

let component: ReturnType<typeof mount> | null = null;

function render(Component: typeof EditableSheet | typeof Chrome): HTMLElement {
	const target = document.createElement('div');
	document.body.append(target);
	component = mount(Component, { target });
	flushSync();
	return target;
}

function field(el: HTMLElement, label: string): HTMLElement {
	const node = el.querySelector<HTMLElement>(`[contenteditable][aria-label="${label}"]`);
	if (!node) throw new Error(`no "${label}" field`);
	return node;
}

function editAndBlur(node: HTMLElement, text: string) {
	node.textContent = text;
	node.dispatchEvent(new FocusEvent('blur'));
	flushSync();
}

function press(target: EventTarget, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
	const event = new KeyboardEvent('keydown', { key, cancelable: true, bubbles: true, ...init });
	target.dispatchEvent(event);
	flushSync();
	return event;
}

/** The reveal awaits a Svelte tick before touching the DOM; let it land. */
async function settle() {
	await Promise.resolve();
	await Promise.resolve();
	flushSync();
}

beforeEach(() => {
	localStorage.clear();
	scrollIntoView.mockClear();
	reducedMotion = false;
	canvas.replace(referenceDoc());
});

afterEach(() => {
	if (component) unmount(component);
	component = null;
	document.body.innerHTML = '';
	vi.restoreAllMocks();
});

describe('⌘Z / ⇧⌘Z on the live sheet', () => {
	it('undoes the last commit, consuming the event so native undo never fires', () => {
		const el = render(EditableSheet);
		editAndBlur(field(el, 'Description'), 'Edited description.');
		const event = press(window, 'z', { metaKey: true });
		expect(event.defaultPrevented).toBe(true);
		expect(canvas.doc.description).toBe(
			'Coordinates picking, packing and shipping once an order is paid.'
		);
		expect(field(el, 'Description').textContent).toBe(
			'Coordinates picking, packing and shipping once an order is paid.'
		);
	});

	it('redoes with ⇧⌘Z', () => {
		const el = render(EditableSheet);
		editAndBlur(field(el, 'Term'), 'Parcel');
		press(window, 'z', { metaKey: true });
		expect(canvas.doc.ubiquitousLanguage[0].term).toBe('Shipment');
		const event = press(window, 'Z', { metaKey: true, shiftKey: true });
		expect(event.defaultPrevented).toBe(true);
		expect(canvas.doc.ubiquitousLanguage[0].term).toBe('Parcel');
		expect(field(el, 'Term').textContent).toBe('Parcel');
	});

	it('supports Ctrl+Z off-Mac', () => {
		const el = render(EditableSheet);
		editAndBlur(field(el, 'Assumption'), 'Stock is live.');
		press(window, 'z', { ctrlKey: true });
		expect(canvas.doc.assumptions).toEqual(['Warehouse stock counts are accurate within the hour.']);
	});

	it('reverts the focused field instead when it has uncommitted edits', () => {
		const el = render(EditableSheet);
		const term = field(el, 'Term');
		editAndBlur(term, 'Parcel');
		expect(canvas.canUndo).toBe(true);

		term.focus();
		term.textContent = 'Pallet';
		press(term, 'z', { metaKey: true });
		expect(term.textContent).toBe('Parcel');
		expect(canvas.doc.ubiquitousLanguage[0].term).toBe('Parcel');

		// The history step survived the field revert: the next ⌘Z pops it.
		press(window, 'z', { metaKey: true });
		expect(canvas.doc.ubiquitousLanguage[0].term).toBe('Shipment');
	});

	it('scrolls the affected region into view with a brief highlight, focus untouched', async () => {
		const el = render(EditableSheet);
		editAndBlur(field(el, 'Open question'), 'Who owns refunds?');
		const parked = field(el, 'Term');
		parked.focus();

		press(window, 'z', { metaKey: true });
		await settle();

		const region = el.querySelector('.area-questions');
		expect(region?.classList.contains(FLASH_CLASS)).toBe(true);
		expect(scrollIntoView).toHaveBeenCalledExactlyOnceWith({ block: 'nearest', behavior: 'smooth' });
		expect(document.activeElement).toBe(parked);
	});

	it('scrolls instantly under prefers-reduced-motion', async () => {
		reducedMotion = true;
		const el = render(EditableSheet);
		editAndBlur(field(el, 'Name'), 'Fulfillment');
		press(window, 'z', { metaKey: true });
		await settle();
		expect(scrollIntoView).toHaveBeenCalledExactlyOnceWith({ block: 'nearest', behavior: 'auto' });
		expect(el.querySelector('.tb')?.classList.contains(FLASH_CLASS)).toBe(true);
	});

	it('is a quiet no-op at the end of history', () => {
		render(EditableSheet);
		const event = press(window, 'z', { metaKey: true });
		expect(event.defaultPrevented).toBe(true);
		expect(scrollIntoView).not.toHaveBeenCalled();
	});

	it('leaves ⌘Z alone inside a real input — pickers keep native text undo', () => {
		const el = render(EditableSheet);
		editAndBlur(field(el, 'Term'), 'Parcel');
		const input = document.createElement('input');
		el.append(input);
		const event = press(input, 'z', { metaKey: true });
		expect(event.defaultPrevented).toBe(false);
		expect(canvas.doc.ubiquitousLanguage[0].term).toBe('Parcel');
	});
});

describe('chrome Undo/Redo buttons (SPEC §10)', () => {
	function buttons(el: HTMLElement) {
		// Tooltips carry the SPEC shortcut, modifier rendered per platform (§12).
		const undo = el.querySelector<HTMLButtonElement>(
			`button[title="Undo (${renderKeys('⌘Z')})"]`
		);
		const redo = el.querySelector<HTMLButtonElement>(
			`button[title="Redo (${renderKeys('⇧⌘Z')})"]`
		);
		if (!undo || !redo) throw new Error('missing Undo/Redo chrome buttons');
		return { undo, redo };
	}

	it('carries the exact shortcut tooltips and disables at history ends', () => {
		const el = render(Chrome);
		const { undo, redo } = buttons(el);
		expect(undo.disabled).toBe(true);
		expect(redo.disabled).toBe(true);

		canvas.commit((doc) => (doc.name = 'Edited'));
		flushSync();
		expect(undo.disabled).toBe(false);
		expect(redo.disabled).toBe(true);
	});

	it('undoes and redoes on click', () => {
		const el = render(Chrome);
		const { undo, redo } = buttons(el);
		canvas.commit((doc) => (doc.name = 'Edited'));
		flushSync();

		undo.click();
		flushSync();
		expect(canvas.doc.name).toBe('Order Fulfillment');
		expect(undo.disabled).toBe(true);
		expect(redo.disabled).toBe(false);

		redo.click();
		flushSync();
		expect(canvas.doc.name).toBe('Edited');
		expect(redo.disabled).toBe(true);
	});
});
