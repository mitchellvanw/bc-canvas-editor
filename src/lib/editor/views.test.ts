// @vitest-environment jsdom
/**
 * The three Views in the editor (SPEC §5, §6, §6.1, §10; wayfinder ticket 045,
 * drawing on 042/043/044). One canvas, three ways of looking at it: the Sheet,
 * the Canvas file's JSON with its buffer and explicit Apply, and the Markdown
 * rendering as source.
 *
 * What is pinned here, and why each one would be easy to get backwards:
 * - The strip is a real tablist with one tab stop, and the panel it names is
 *   the one on screen.
 * - The buffer is two states and one invariant: `text !== null` *is* the
 *   marker. Typing an edit back out drops it; a successful Apply drops it; the
 *   session boundary drops it; the document moving underneath does not.
 * - Apply's no-op test is on the parse result, not the raw text — a whitespace
 *   reformat must not land an undo step that undoes nothing.
 * - A refusal shows the parser's `detail` (the one place it reaches a human,
 *   §3.3) and announces its lead sentence in full (§8.5).
 * - Copy never clears Unexported changes: Markdown is lossy, and being wrong
 *   here costs a user their canvas.
 */
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { canvas } from '$lib/editor/document.svelte';
import { jsonBuffer } from '$lib/editor/json-buffer.svelte';
import { performUndo } from '$lib/editor/undo';
import { blankCanvas, stampIds } from '$lib/model/canvas';
import { canvasDigest } from '$lib/model/digest';
import { parseCanvasFile } from '$lib/model/parse';
import { REFERENCE_FILE } from '$lib/model/reference.fixture';
import { serializeCanvas, toCanvasFile } from '$lib/model/serialize';
import Page from '../../routes/+page.svelte';

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

// jsdom implements neither scrollIntoView nor matchMedia; undo's reveal needs both.
Element.prototype.scrollIntoView = vi.fn();
Object.defineProperty(window, 'matchMedia', {
	configurable: true,
	writable: true,
	value: (media: string) => ({ matches: false, media }) as MediaQueryList
});

const writeText = vi.fn(async () => {});
Object.defineProperty(navigator, 'clipboard', {
	configurable: true,
	value: { writeText }
});

/** A v1 export: `description` where v2 says `purpose`, and nothing else to say. */
const V1_CANVAS = `{
  "version": 1,
  "name": "From an older export",
  "description": "Written before the v2 format existed.",
  "strategicClassification": {},
  "domainRoles": [],
  "inboundCommunication": [],
  "ubiquitousLanguage": [],
  "businessDecisions": [],
  "outboundCommunication": [],
  "assumptions": [],
  "verificationMetrics": [],
  "openQuestions": []
}`;

function referenceDoc() {
	const result = parseCanvasFile(REFERENCE_FILE);
	if (!result.ok) throw new Error('reference fixture must parse');
	return stampIds(result.file);
}

let component: ReturnType<typeof mount>;

function el<T extends Element>(selector: string): T {
	const found = document.querySelector<T>(selector);
	if (!found) throw new Error(`no ${selector}`);
	return found;
}

function tab(key: string): HTMLButtonElement {
	return el<HTMLButtonElement>(`#tab-${key}`);
}

function show(key: string): void {
	tab(key).click();
	flushSync();
}

function box(): HTMLTextAreaElement {
	return el<HTMLTextAreaElement>('textarea[aria-label="Canvas file JSON"]');
}

/** Type (or paste) into the JSON box, the way a keystroke reaches the buffer. */
function put(text: string): void {
	const area = box();
	area.value = text;
	area.dispatchEvent(new InputEvent('input', { bubbles: true }));
	flushSync();
}

function apply(): void {
	buttonNamed('Apply').click();
	flushSync();
}

function buttonNamed(label: string): HTMLButtonElement {
	const found = [...document.querySelectorAll('button')].find(
		(button) => button.textContent?.trim() === label
	);
	if (!found) throw new Error(`no button labelled ${label}`);
	return found;
}

function announced(): string {
	return el('[role="status"]').textContent?.trim() ?? '';
}

function note(): HTMLElement | null {
	return document.querySelector('[role="note"]');
}

/** The notice as it reads on screen — markup indentation collapses in prose. */
function noteText(): string {
	return note()?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

/** Let a clipboard write and its announcement land. */
function settle(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
	localStorage.clear();
	canvas.replace(referenceDoc());
	component = mount(Page, { target: document.body });
	flushSync();
});

afterEach(() => {
	unmount(component);
	document.body.innerHTML = '';
	canvas.replace(blankCanvas());
	writeText.mockClear();
});

describe('the View switcher (SPEC §5)', () => {
	it('is a tablist of three, opening on the Sheet with one tab stop', () => {
		const strip = el('[role="tablist"]');
		expect(strip.getAttribute('aria-label')).toBe('Views');
		const tabs = [...strip.querySelectorAll('[role="tab"]')];
		expect(tabs.map((t) => t.textContent?.trim())).toEqual(['Sheet', 'JSON', 'Markdown']);
		expect(tabs.map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
		expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
	});

	it('names the panel on screen, and the panel names it back', () => {
		show('json');
		const panel = el('[role="tabpanel"]');
		expect(panel.id).toBe('panel-json');
		expect(panel.getAttribute('aria-labelledby')).toBe('tab-json');
		expect(tab('json').getAttribute('aria-controls')).toBe('panel-json');
	});

	it('moves and selects on arrow keys, wrapping, with Home and End', () => {
		const press = (key: string) => {
			document
				.querySelector('[role="tab"][aria-selected="true"]')
				?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
			flushSync();
		};
		press('ArrowRight');
		expect(tab('json').getAttribute('aria-selected')).toBe('true');
		press('ArrowLeft');
		press('ArrowLeft');
		expect(tab('markdown').getAttribute('aria-selected')).toBe('true');
		press('Home');
		expect(tab('sheet').getAttribute('aria-selected')).toBe('true');
		press('End');
		expect(tab('markdown').getAttribute('aria-selected')).toBe('true');
	});

	it('switching Views replaces the title block along with the sheet', () => {
		expect(document.querySelector('.tb')).not.toBeNull();
		show('markdown');
		expect(document.querySelector('.tb')).toBeNull();
	});
});

describe('the JSON View (SPEC §6)', () => {
	it('shows the export bytes, and follows the canvas while it is left alone', () => {
		show('json');
		expect(box().value).toBe(serializeCanvas(canvas.doc));

		canvas.commit((doc) => (doc.name = 'Renamed on the sheet'));
		flushSync();
		expect(box().value).toBe(serializeCanvas(canvas.doc));
		expect(box().value).toContain('Renamed on the sheet');
	});

	it('marks the tab the instant the text disagrees, and unmarks it on the way back', () => {
		show('json');
		const bytes = box().value;
		put(bytes.replace('Order Fulfillment', 'Order Fulfilment'));
		expect(jsonBuffer.unapplied).toBe(true);
		expect(tab('json').textContent).toContain('•');
		expect(tab('json').textContent).toContain('unapplied changes');

		put(bytes);
		expect(jsonBuffer.unapplied).toBe(false);
		expect(tab('json').textContent).not.toContain('•');
	});

	it('keeps an unapplied proposal across a view switch and a sheet edit', () => {
		show('json');
		put(box().value.replace('Order Fulfillment', 'Proposed name'));
		show('sheet');
		canvas.commit((doc) => (doc.purpose = 'Edited on the sheet.'));
		flushSync();
		show('json');
		expect(box().value).toContain('Proposed name');
		expect(box().value).not.toContain('Edited on the sheet.');
		expect(jsonBuffer.unapplied).toBe(true);
	});

	it('says so when the canvas has moved under the proposal, and stops when it moves back', () => {
		show('json');
		put(box().value.replace('Order Fulfillment', 'Proposed name'));
		expect(document.body.textContent).not.toContain('The canvas has changed');

		canvas.commit((doc) => (doc.purpose = 'Edited after the proposal.'));
		flushSync();
		expect(document.body.textContent).toContain(
			'The canvas has changed since you started editing this text. Applying replaces it.'
		);

		canvas.undo();
		flushSync();
		expect(document.body.textContent).not.toContain('The canvas has changed');
	});

	it('Apply replaces the whole document as one commit, undone in one step', () => {
		show('json');
		put(box().value.replace('Order Fulfillment', 'Applied name'));
		apply();

		expect(canvas.doc.name).toBe('Applied name');
		expect(jsonBuffer.unapplied).toBe(false);
		expect(box().value).toBe(serializeCanvas(canvas.doc));
		expect(announced()).toBe('Canvas replaced');

		canvas.undo();
		flushSync();
		expect(canvas.doc.name).toBe('Order Fulfillment');
		expect(canvas.canUndo).toBe(false);
	});

	it('Apply that changes nothing commits nothing, even reformatted', () => {
		show('json');
		const canonical = box().value;
		put(JSON.stringify(JSON.parse(canonical)));
		apply();

		expect(canvas.canUndo).toBe(false);
		expect(jsonBuffer.unapplied).toBe(false);
		expect(box().value).toBe(canonical);
		expect(announced()).toBe('');
	});

	it('a v1 paste comes back migrated in the box, and says which version it came from', () => {
		show('json');
		put(V1_CANVAS);
		apply();

		expect(box().value).toContain('"version": 2');
		expect(box().value).toContain('"purpose": "Written before the v2 format existed."');
		expect(box().value).not.toContain('"description"');
		expect(announced()).toBe('Canvas replaced, migrated from format version 1');
	});
});

describe('what the JSON View says when Apply fails (SPEC §10, ticket 044)', () => {
	it('gives malformed JSON one lead and the engine message as the detail', () => {
		show('json');
		put(box().value.replace('{', '{,'));
		apply();

		expect(noteText()).toContain("This text couldn't be read as a Canvas file.");
		expect(note()?.querySelector('span')?.textContent).toMatch(/expected valid JSON \(/);
		expect(canvas.canUndo).toBe(false);
		expect(jsonBuffer.unapplied).toBe(true);
	});

	it('gives a wrong shape the same lead, distinguished only by the detail', () => {
		show('json');
		put(box().value.replace('"command"', '"notification"'));
		apply();

		expect(noteText()).toContain("This text couldn't be read as a Canvas file.");
		expect(note()?.querySelector('span')?.textContent).toBe(
			'inboundCommunication[0].messages[0].type: expected one of "command", "query", "event", got "notification".'
		);
	});

	it('announces the lead sentence in full — the one announcement not confirming a visible thing', () => {
		show('json');
		put('not json at all');
		apply();
		expect(announced()).toBe(note()?.querySelector('strong')?.textContent);
		expect(announced()).toBe("This text couldn't be read as a Canvas file.");
	});

	it('leads a newer version with Copy this text, because reload discards the buffer', () => {
		show('json');
		put(box().value.replace('"version": 2', '"version": 3'));
		apply();

		expect(noteText()).toContain('This text is from a newer version of BC Canvas.');
		expect(noteText()).toContain(
			'It was exported with format version 3; this app reads up to version 2. Copy this text, reload the page to pick up the latest app, then paste it back.'
		);
		expect(announced()).toBe('This text is from a newer version of BC Canvas.');
	});

	it('holds the refusal across a view switch and clears it on the next keystroke', () => {
		show('json');
		put('not json at all');
		apply();
		show('markdown');
		show('json');
		expect(note()).not.toBeNull();

		put('still not json');
		expect(note()).toBeNull();
	});
});

describe('the buffer and the rest of the app (SPEC §6.1)', () => {
	it('the session boundary discards the proposal, with no dialog', () => {
		show('json');
		put(box().value.replace('Order Fulfillment', 'Proposed name'));
		expect(jsonBuffer.unapplied).toBe(true);

		// A clean canvas takes New canvas without ceremony (§6.1).
		canvas.markExported();
		flushSync();
		buttonNamed('New canvas').click();
		flushSync();

		expect(jsonBuffer.unapplied).toBe(false);
		expect(box().value).toBe(serializeCanvas(canvas.doc));
	});

	it('undo while a text View is showing announces and reveals nothing, keeping the View', async () => {
		canvas.commit((doc) => (doc.name = 'Committed on the sheet'));
		show('json');
		await performUndo();
		flushSync();

		expect(canvas.doc.name).toBe('Order Fulfillment');
		expect(tab('json').getAttribute('aria-selected')).toBe('true');
		expect(announced()).toMatch(/^Undone: /);
	});

	it('⌘Z inside the box is left to the browser, by construction', () => {
		show('json');
		put(box().value.replace('Order Fulfillment', 'Proposed name'));
		const event = new KeyboardEvent('keydown', { key: 'z', metaKey: true, bubbles: true });
		box().dispatchEvent(event);
		flushSync();

		expect(event.defaultPrevented).toBe(false);
		expect(jsonBuffer.unapplied).toBe(true);
	});
});

describe('the Markdown View (SPEC §6)', () => {
	it('is the one renderer output, as source', () => {
		show('markdown');
		const pre = el('pre');
		expect(pre.textContent).toBe(canvasDigest(toCanvasFile(canvas.doc)));
	});

	it('copies without clearing Unexported changes — Markdown is lossy', async () => {
		canvas.commit((doc) => (doc.name = 'Unexported edit'));
		show('markdown');
		expect(canvas.unexported).toBe(true);

		buttonNamed('Copy').click();
		await settle();
		flushSync();

		expect(writeText).toHaveBeenCalledWith(canvasDigest(toCanvasFile(canvas.doc)));
		expect(announced()).toBe('Markdown copied');
		expect(canvas.unexported).toBe(true);
	});

	it('the JSON View copies the export bytes, also without clearing', async () => {
		canvas.commit((doc) => (doc.name = 'Unexported edit'));
		show('json');
		buttonNamed('Copy').click();
		await settle();
		flushSync();

		expect(writeText).toHaveBeenCalledWith(serializeCanvas(canvas.doc));
		expect(announced()).toBe('JSON copied');
		expect(canvas.unexported).toBe(true);
	});
});
