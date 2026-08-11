// @vitest-environment jsdom
/**
 * Keyboard operability & assistive-tech semantics (SPEC §8, ticket 12):
 * Delete removes the focused item container but never fires inside text
 * editing or on add affordances; Alt+←/→ moves a chip within its lane and
 * Alt+↑/↓ a lane within its section, each press one commit with focus kept
 * on the moved item; the one polite live region speaks the SPEC §10 strings
 * — removals, trait toggles, moves, Undone:/Redone:, New canvas — and stays
 * silent on field-blur commits and ghost adds; keyboard-focused fields carry
 * the §8.4 ring class, pointer-focused ones don't.
 */
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { announce, setAnnouncer } from '$lib/a11y/announce';
import LiveRegion from '$lib/a11y/LiveRegion.svelte';
import { trackModality } from '$lib/a11y/modality';
import Chrome from '$lib/chrome/Chrome.svelte';
import { canvas } from '$lib/editor/document.svelte';
import EditableSheet from '$lib/editor/EditableSheet.svelte';
import { KEYBOARD_FOCUS_CLASS } from '$lib/editor/editable';
import { performRedo, performUndo } from '$lib/editor/undo';
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

// jsdom implements neither scrollIntoView nor matchMedia; the undo reveal needs both.
Element.prototype.scrollIntoView = vi.fn();
Object.defineProperty(window, 'matchMedia', {
	configurable: true,
	writable: true,
	value: (media: string) => ({ matches: false, media }) as MediaQueryList
});

/** The reference doc plus a second inbound lane, so lanes can reorder. */
function referenceDoc() {
	const result = parseCanvasFile(REFERENCE_FILE);
	if (!result.ok) throw new Error('reference fixture must parse');
	result.file.inboundCommunication.push({ collaborator: { name: 'Billing' }, messages: [] });
	return stampIds(result.file);
}

let component: ReturnType<typeof mount> | null = null;

function render(
	Component: typeof EditableSheet | typeof Chrome | typeof LiveRegion = EditableSheet
): HTMLElement {
	const target = document.createElement('div');
	document.body.append(target);
	component = mount(Component, { target });
	flushSync();
	return target;
}

function field(el: ParentNode, label: string, value: string): HTMLElement {
	const match = [...el.querySelectorAll<HTMLElement>(`[contenteditable][aria-label="${label}"]`)].find(
		(node) => node.textContent === value
	);
	if (!match) throw new Error(`no "${label}" field with value "${value}"`);
	return match;
}

function button(el: ParentNode, name: string): HTMLButtonElement {
	const matches = [...el.querySelectorAll<HTMLButtonElement>('button')].filter(
		(b) => (b.getAttribute('aria-label') ?? b.textContent?.trim()) === name
	);
	if (matches.length !== 1)
		throw new Error(`expected one "${name}" button, found ${matches.length}`);
	return matches[0];
}

function press(node: EventTarget, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
	const event = new KeyboardEvent('keydown', { key, cancelable: true, bubbles: true, ...init });
	node.dispatchEvent(event);
	flushSync();
	return event;
}

function click(target: HTMLElement) {
	target.click();
	flushSync();
}

function inboundMessages(): string[] {
	return canvas.doc.inboundCommunication[0].messages.map((message) => message.name);
}

function inboundLanes(): string[] {
	return canvas.doc.inboundCommunication.map((lane) => lane.collaborator.name);
}

const sink = vi.fn();

beforeEach(() => {
	localStorage.clear();
	canvas.replace(referenceDoc());
	sink.mockClear();
	setAnnouncer(sink);
});

afterEach(() => {
	setAnnouncer(null);
	if (component) unmount(component);
	component = null;
	document.body.innerHTML = '';
});

describe('Delete removes the focused item container (SPEC §8.2)', () => {
	it('removes a chip from its × and announces the type-led removal', () => {
		const el = render();
		const x = button(el, 'Remove command Place Order');
		x.focus();
		press(x, 'Delete');
		expect(inboundMessages()).toEqual(['Payment Confirmed']);
		expect(sink).toHaveBeenCalledExactlyOnceWith('Command removed');
	});

	it('accepts Backspace — the key macOS labels delete', () => {
		const el = render();
		const x = button(el, 'Remove term Shipment');
		x.focus();
		press(x, 'Backspace');
		expect(canvas.doc.ubiquitousLanguage).toEqual([]);
		expect(sink).toHaveBeenCalledExactlyOnceWith('Term removed');
	});

	it('removes the whole lane when focus sits on its relationship value', () => {
		const el = render();
		const pick = button(el, 'Our relationship for Checkout');
		pick.focus();
		press(pick, 'Delete');
		expect(inboundLanes()).toEqual(['Billing']);
		expect(sink).toHaveBeenCalledExactlyOnceWith('Collaborator removed');
	});

	it('never fires inside text editing', () => {
		const el = render();
		const name = field(el, 'Message name', 'Place Order');
		name.focus();
		const event = press(name, 'Delete');
		expect(event.defaultPrevented).toBe(false);
		expect(inboundMessages()).toEqual(['Place Order', 'Payment Confirmed']);
		expect(sink).not.toHaveBeenCalled();
	});

	it('never fires on a lane message ghost — adds must not remove their lane', () => {
		const el = render();
		const ghosts = [...el.querySelectorAll<HTMLElement>('[aria-label="Add message"]')];
		ghosts[0].focus();
		press(ghosts[0], 'Delete');
		expect(inboundLanes()).toEqual(['Checkout', 'Billing']);
		expect(sink).not.toHaveBeenCalled();
	});
});

describe('Alt+arrows reorder as stateless one-commit moves (SPEC §8.2)', () => {
	it('Alt+→ moves the chip right, keeps focus, announces Moved down', async () => {
		const el = render();
		const name = field(el, 'Message name', 'Place Order');
		name.focus();
		const event = press(name, 'ArrowRight', { altKey: true });
		expect(event.defaultPrevented).toBe(true);
		expect(inboundMessages()).toEqual(['Payment Confirmed', 'Place Order']);
		expect(sink).toHaveBeenCalledExactlyOnceWith('Moved down');
		await vi.waitFor(() => {
			expect(document.activeElement).toBe(field(el, 'Message name', 'Place Order'));
		});
	});

	it('is one undo step per press', () => {
		const el = render();
		const name = field(el, 'Message name', 'Place Order');
		name.focus();
		press(name, 'ArrowRight', { altKey: true });
		expect(canvas.canUndo).toBe(true);
		expect(canvas.undo()).toBe('inbound');
		expect(inboundMessages()).toEqual(['Place Order', 'Payment Confirmed']);
		expect(canvas.canUndo).toBe(false);
	});

	it('Alt+← at the left edge consumes the key but commits nothing', () => {
		const el = render();
		const name = field(el, 'Message name', 'Place Order');
		name.focus();
		const event = press(name, 'ArrowLeft', { altKey: true });
		expect(event.defaultPrevented).toBe(true);
		expect(inboundMessages()).toEqual(['Place Order', 'Payment Confirmed']);
		expect(canvas.canUndo).toBe(false);
		expect(sink).not.toHaveBeenCalled();
	});

	it('Alt+↓/↑ move the focused lane and announce the direction', () => {
		const el = render();
		const who = field(el, 'Collaborator', 'Checkout');
		who.focus();
		press(who, 'ArrowDown', { altKey: true });
		expect(inboundLanes()).toEqual(['Billing', 'Checkout']);
		expect(sink).toHaveBeenLastCalledWith('Moved down');
		flushSync();
		const back = field(el, 'Collaborator', 'Checkout');
		back.focus();
		press(back, 'ArrowUp', { altKey: true });
		expect(inboundLanes()).toEqual(['Checkout', 'Billing']);
		expect(sink).toHaveBeenLastCalledWith('Moved up');
	});

	it('leaves Alt+arrows native outside chips and lanes', () => {
		const el = render();
		const prose = el.querySelector<HTMLElement>('[contenteditable][aria-label="Purpose"]');
		prose!.focus();
		const event = press(prose!, 'ArrowRight', { altKey: true });
		expect(event.defaultPrevented).toBe(false);
		expect(canvas.canUndo).toBe(false);
	});
});

describe('the live region speaks only the SPEC §10 strings', () => {
	it('announces trait toggles from the checklist', () => {
		const el = render();
		click(button(el, '+ trait'));
		const boxes = [...el.querySelectorAll<HTMLElement>('[role="checkbox"]')];
		const unchecked = boxes.find((box) => box.getAttribute('aria-checked') === 'false');
		click(unchecked!);
		expect(sink).toHaveBeenLastCalledWith('Trait added');
		const checked = [...el.querySelectorAll<HTMLElement>('[role="checkbox"]')].find(
			(box) => box.getAttribute('aria-checked') === 'true'
		);
		click(checked!);
		expect(sink).toHaveBeenLastCalledWith('Trait removed');
	});

	it('says nothing on a ghost add — the caret landing there is the evidence', () => {
		const el = render();
		click(button(el, '+ assumption'));
		expect(canvas.doc.assumptions).toHaveLength(2);
		expect(sink).not.toHaveBeenCalled();
	});

	it('says nothing on a field-blur commit', () => {
		const el = render();
		const name = field(el, 'Message name', 'Place Order');
		name.focus();
		name.textContent = 'Place Order v2';
		name.dispatchEvent(new FocusEvent('blur'));
		flushSync();
		expect(canvas.doc.inboundCommunication[0].messages[0].name).toBe('Place Order v2');
		expect(sink).not.toHaveBeenCalled();
	});

	it('announces Undone:/Redone: with the section name', async () => {
		render();
		canvas.commit((doc) => doc.assumptions.push('New assumption'));
		await performUndo();
		expect(sink).toHaveBeenLastCalledWith('Undone: Assumptions');
		await performRedo();
		expect(sink).toHaveBeenLastCalledWith('Redone: Assumptions');
	});

	it('announces New canvas from the chrome', () => {
		const el = render(Chrome);
		expect(canvas.unexported).toBe(false);
		click(button(el, 'New canvas'));
		expect(canvas.doc.name).toBe('');
		expect(sink).toHaveBeenCalledExactlyOnceWith('New canvas');
	});

	it('announces Canvas imported from the chrome', async () => {
		const el = render(Chrome);
		canvas.replace(referenceDoc()); // clean: import proceeds without ceremony
		const input = el.querySelector<HTMLInputElement>('input[type="file"]')!;
		// jsdom's File lacks Blob.text(); the import path only calls text().
		const file = { text: async () => REFERENCE_FILE } as unknown as File;
		Object.defineProperty(input, 'files', { configurable: true, value: [file] });
		// Svelte 5 delegates change to the mount root — the event must bubble.
		input.dispatchEvent(new Event('change', { bubbles: true }));
		await vi.waitFor(() => {
			expect(sink).toHaveBeenCalledExactlyOnceWith('Canvas imported');
		});
		expect(canvas.doc.name).toBe('Order Fulfillment');
	});
});

describe('LiveRegion', () => {
	it('is one polite status surface that re-speaks repeated messages', () => {
		setAnnouncer(null);
		const el = render(LiveRegion);
		const region = el.querySelector<HTMLElement>('[role="status"]');
		expect(region).not.toBeNull();
		expect(region!.classList.contains('sr-only')).toBe(true);
		announce('Moved up');
		expect(region!.textContent).toBe('Moved up');
		const before = region!.textContent;
		announce('Moved up');
		expect(region!.textContent).not.toBe(before);
		expect(region!.textContent!.startsWith('Moved up')).toBe(true);
	});
});

describe('keyboard focus ring (SPEC §8.4)', () => {
	it('marks a field focused after a keydown, not after a pointerdown', () => {
		const untrack = trackModality();
		const el = render();
		const name = field(el, 'Message name', 'Place Order');

		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
		name.focus();
		expect(name.classList.contains(KEYBOARD_FOCUS_CLASS)).toBe(true);
		name.blur();
		expect(name.classList.contains(KEYBOARD_FOCUS_CLASS)).toBe(false);

		window.dispatchEvent(new Event('pointerdown'));
		name.focus();
		expect(name.classList.contains(KEYBOARD_FOCUS_CLASS)).toBe(false);
		untrack();
	});

	it('drops the ring when a click lands in the already-focused field', () => {
		const untrack = trackModality();
		const el = render();
		const name = field(el, 'Message name', 'Place Order');
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
		name.focus();
		expect(name.classList.contains(KEYBOARD_FOCUS_CLASS)).toBe(true);
		// Clicking into the focused field refires no focus event — the
		// pointerdown itself must return the field to hairline + caret.
		name.dispatchEvent(new Event('pointerdown', { bubbles: true }));
		expect(name.classList.contains(KEYBOARD_FOCUS_CLASS)).toBe(false);
		untrack();
	});
});
