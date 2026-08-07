// @vitest-environment jsdom
/**
 * Structural editing (SPEC §6, ticket 06): ghost adds populate every section
 * by pointer, the message ghost runs the type-popover flow, × removes chips,
 * rows, stickies and whole lanes, and drags reorder chips within their lane
 * and lanes within their section. Every structural action is exactly one
 * commit — one autosave write. All chrome enters through CanvasSheet's
 * structural seams, so the bare sheet stays affordance-free (covered by
 * CanvasSheet.test.ts).
 */
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { canvas } from '$lib/editor/document.svelte';
import EditableSheet from '$lib/editor/EditableSheet.svelte';
import { loadAutosave } from '$lib/model/autosave';
import { blankCanvas, stampIds, type CanvasFile } from '$lib/model/canvas';
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

/** Find the one button whose accessible name (aria-label or text) matches. */
function buttons(el: ParentNode, name: string): HTMLButtonElement[] {
	return [...el.querySelectorAll<HTMLButtonElement>('button')].filter(
		(b) => (b.getAttribute('aria-label') ?? b.textContent?.trim()) === name
	);
}

function button(el: ParentNode, name: string): HTMLButtonElement {
	const matches = buttons(el, name);
	if (matches.length !== 1)
		throw new Error(`expected one "${name}" button, found ${matches.length}`);
	return matches[0];
}

function click(target: HTMLElement) {
	target.click();
	flushSync();
}

async function expectFocusedField(label: string) {
	await vi.waitFor(() => {
		expect(document.activeElement?.getAttribute('aria-label')).toBe(label);
	});
}

function section(el: HTMLElement, area: string): HTMLElement {
	const found = el.querySelector<HTMLElement>(`.area-${area}`);
	if (!found) throw new Error(`no .area-${area} section`);
	return found;
}

function serialized(): CanvasFile {
	return JSON.parse(serializeCanvas(canvas.doc)) as CanvasFile;
}

function rect(partial: Partial<DOMRect>): DOMRect {
	return { top: 0, bottom: 0, left: 0, width: 0, height: 0, ...partial } as DOMRect;
}

function pointer(type: string, target: EventTarget, x: number, y: number) {
	target.dispatchEvent(
		new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 })
	);
	flushSync();
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

describe('ghost adds', () => {
	it('offers every section its ghost add, in both filled and empty states', () => {
		const el = render();
		expect(buttons(section(el, 'inbound'), '+ collaborator')).toHaveLength(1);
		expect(buttons(section(el, 'outbound'), '+ collaborator')).toHaveLength(1);
		expect(buttons(el, 'Add message')).toHaveLength(2);
		expect(buttons(el, '+ term')).toHaveLength(1);
		expect(buttons(el, '+ decision')).toHaveLength(1);
		expect(buttons(el, '+ assumption')).toHaveLength(1);
		expect(buttons(el, '+ metric')).toHaveLength(1);
		expect(buttons(el, '+ question')).toHaveLength(1);

		canvas.replace(stampIds(blankCanvas()));
		flushSync();
		expect(buttons(section(el, 'inbound'), '+ collaborator')).toHaveLength(1);
		expect(buttons(el, '+ term')).toHaveLength(1);
		expect(buttons(el, '+ question')).toHaveLength(1);
	});

	it('adds a collaborator lane in one commit and focuses its name', async () => {
		const el = render();
		const setItem = vi.spyOn(localStorage, 'setItem');
		click(button(section(el, 'inbound'), '+ collaborator'));
		expect(canvas.doc.inboundCommunication).toHaveLength(2);
		const lane = canvas.doc.inboundCommunication[1];
		expect(lane.collaborator).toBe('');
		expect(lane.messages).toEqual([]);
		expect(lane.id).toBeTruthy();
		expect(setItem).toHaveBeenCalledTimes(1);
		await expectFocusedField('Collaborator');
	});

	it.each([
		['+ term', 'Term', () => canvas.doc.ubiquitousLanguage],
		['+ decision', 'Decision', () => canvas.doc.businessDecisions],
		['+ assumption', 'Assumption', () => canvas.doc.assumptions],
		['+ metric', 'Verification metric', () => canvas.doc.verificationMetrics],
		['+ question', 'Open question', () => canvas.doc.openQuestions]
	])('adds via %s in one commit and focuses the new field', async (ghost, label, list) => {
		const el = render();
		const setItem = vi.spyOn(localStorage, 'setItem');
		click(button(el, ghost));
		expect(list()).toHaveLength(2);
		expect(setItem).toHaveBeenCalledTimes(1);
		await expectFocusedField(label);
	});
});

describe('the message flow: ghost → type popover → focused name', () => {
	it('opens the type popover without committing, then creates the typed chip in one commit', async () => {
		const el = render();
		const setItem = vi.spyOn(localStorage, 'setItem');
		const inbound = section(el, 'inbound');

		click(button(inbound, 'Add message'));
		expect(setItem).not.toHaveBeenCalled();
		for (const type of ['command', 'query', 'event']) {
			expect(buttons(inbound, type)).toHaveLength(1);
		}

		click(button(inbound, 'query'));
		const messages = canvas.doc.inboundCommunication[0].messages;
		expect(messages).toHaveLength(3);
		expect(messages[2].type).toBe('query');
		expect(messages[2].name).toBe('');
		expect(setItem).toHaveBeenCalledTimes(1);
		await expectFocusedField('Message name');
		expect(buttons(inbound, 'command')).toHaveLength(0);
	});

	it('closes the popover on Escape without committing', () => {
		const el = render();
		const setItem = vi.spyOn(localStorage, 'setItem');
		const inbound = section(el, 'inbound');
		click(button(inbound, 'Add message'));
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
		flushSync();
		expect(buttons(inbound, 'command')).toHaveLength(0);
		expect(setItem).not.toHaveBeenCalled();
	});

	it('closes the popover on a pointerdown elsewhere', () => {
		const el = render();
		const inbound = section(el, 'inbound');
		click(button(inbound, 'Add message'));
		pointer('pointerdown', document.body, 0, 0);
		expect(buttons(inbound, 'command')).toHaveLength(0);
	});
});

describe('× removal', () => {
	it('removes a message chip in one commit', () => {
		const el = render();
		const setItem = vi.spyOn(localStorage, 'setItem');
		click(button(el, 'Remove command Place Order'));
		expect(canvas.doc.inboundCommunication[0].messages.map((m) => m.name)).toEqual([
			'Payment Confirmed'
		]);
		expect(setItem).toHaveBeenCalledTimes(1);
	});

	it('removes a whole lane with its messages in one commit', () => {
		const el = render();
		const setItem = vi.spyOn(localStorage, 'setItem');
		click(button(el, 'Remove collaborator Checkout'));
		expect(canvas.doc.inboundCommunication).toEqual([]);
		expect(serialized().inboundCommunication).toEqual([]);
		expect(setItem).toHaveBeenCalledTimes(1);
	});

	it('removes trait chips, term rows, decision rows and stickies', () => {
		const el = render();
		click(button(el, 'Remove trait execution context'));
		expect(canvas.doc.domainRoles).toEqual([]);
		click(button(el, 'Remove term Shipment'));
		expect(canvas.doc.ubiquitousLanguage).toEqual([]);
		click(button(el, 'Remove decision No partial shipments'));
		expect(canvas.doc.businessDecisions).toEqual([]);
		click(button(el, 'Remove assumption'));
		expect(canvas.doc.assumptions).toEqual([]);
		click(button(el, 'Remove verification metric'));
		expect(canvas.doc.verificationMetrics).toEqual([]);
		click(button(el, 'Remove open question'));
		expect(canvas.doc.openQuestions).toEqual([]);
	});
});

describe('drag reorder', () => {
	it('reorders chips within their lane in one commit, and the order survives reload', () => {
		const el = render();
		const chips = [...section(el, 'inbound').querySelectorAll<HTMLElement>('.msg')];
		expect(chips).toHaveLength(2);
		chips[0].getBoundingClientRect = () =>
			rect({ top: 0, bottom: 20, height: 20, left: 0, width: 100 });
		chips[1].getBoundingClientRect = () =>
			rect({ top: 0, bottom: 20, height: 20, left: 110, width: 100 });

		const setItem = vi.spyOn(localStorage, 'setItem');
		pointer('pointerdown', chips[0], 10, 10);
		pointer('pointermove', window, 250, 10);
		pointer('pointerup', window, 250, 10);

		expect(canvas.doc.inboundCommunication[0].messages.map((m) => m.name)).toEqual([
			'Payment Confirmed',
			'Place Order'
		]);
		expect(serialized().inboundCommunication[0].messages.map((m) => m.name)).toEqual([
			'Payment Confirmed',
			'Place Order'
		]);
		expect(setItem).toHaveBeenCalledTimes(1);

		// The reload half of the criterion: restoring the autosave slot — the
		// same path an app load takes — keeps the dropped order.
		const restored = loadAutosave();
		expect(restored?.inboundCommunication[0].messages.map((m) => m.name)).toEqual([
			'Payment Confirmed',
			'Place Order'
		]);
	});

	it('reorders lanes within their section by grip in one commit', () => {
		const doc = referenceDoc();
		doc.inboundCommunication.push({ id: 'lane-billing', collaborator: 'Billing', messages: [] });
		canvas.replace(doc);
		const el = render();

		const lanes = [...section(el, 'inbound').querySelectorAll<HTMLElement>('.lane')];
		expect(lanes).toHaveLength(2);
		lanes[0].getBoundingClientRect = () => rect({ top: 0, bottom: 100, height: 100 });
		lanes[1].getBoundingClientRect = () => rect({ top: 110, bottom: 210, height: 100 });
		const grip = lanes[0].querySelector<HTMLElement>('[data-grip]');
		expect(grip).not.toBeNull();

		const setItem = vi.spyOn(localStorage, 'setItem');
		pointer('pointerdown', grip!, 5, 10);
		pointer('pointermove', window, 5, 180);
		pointer('pointerup', window, 5, 180);

		expect(canvas.doc.inboundCommunication.map((l) => l.collaborator)).toEqual([
			'Billing',
			'Checkout'
		]);
		expect(setItem).toHaveBeenCalledTimes(1);
	});

	it('keeps the grip out of the tab order — the keyboard path is Alt+arrows (ticket 12)', () => {
		const el = render();
		for (const grip of el.querySelectorAll('[data-grip]')) {
			expect(grip.getAttribute('tabindex')).toBe('-1');
			expect(grip.getAttribute('aria-hidden')).toBe('true');
		}
	});
});

describe('every section goes empty → populated → empty by pointer alone', () => {
	it('builds up each structure from a blank canvas and tears it back down', async () => {
		canvas.replace(stampIds(blankCanvas()));
		const el = render();
		const inbound = section(el, 'inbound');

		click(button(inbound, '+ collaborator'));
		click(button(inbound, 'Add message'));
		click(button(inbound, 'command'));
		click(button(el, '+ term'));
		click(button(el, '+ decision'));
		click(button(el, '+ assumption'));

		expect(canvas.doc.inboundCommunication).toHaveLength(1);
		expect(canvas.doc.inboundCommunication[0].messages).toHaveLength(1);
		expect(canvas.doc.ubiquitousLanguage).toHaveLength(1);
		expect(canvas.doc.businessDecisions).toHaveLength(1);
		expect(canvas.doc.assumptions).toEqual(['']);

		click(button(inbound, 'Remove command'));
		expect(canvas.doc.inboundCommunication[0].messages).toEqual([]);
		click(button(inbound, 'Remove collaborator'));
		click(button(el, 'Remove term'));
		click(button(el, 'Remove decision'));
		click(button(el, 'Remove assumption'));

		expect(canvas.doc.inboundCommunication).toEqual([]);
		expect(canvas.doc.ubiquitousLanguage).toEqual([]);
		expect(canvas.doc.businessDecisions).toEqual([]);
		expect(canvas.doc.assumptions).toEqual([]);
	});
});
