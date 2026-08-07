// @vitest-environment jsdom
/**
 * Empty state & teaching (SPEC §7, ticket 10): a brand-new canvas is the
 * ordinary quiet sheet where the form itself teaches — every empty free-text
 * field carries its ddd-crew helper question as a placeholder, every empty
 * section shows its ghost add with the question always visible. Typing
 * replaces a placeholder; the first item shortens the ghost to its terse
 * label; emptying brings the teaching back — state-driven, no stored flag.
 * All copy verbatim from the SPEC §10 table.
 */
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { canvas } from '$lib/editor/document.svelte';
import EditableSheet from '$lib/editor/EditableSheet.svelte';
import { blankCanvas, stampIds } from '$lib/model/canvas';
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

function section(el: HTMLElement, area: string): HTMLElement {
	const found = el.querySelector<HTMLElement>(`.area-${area}`);
	if (!found) throw new Error(`no .area-${area} section`);
	return found;
}

function placeholders(el: ParentNode, label: string): (string | null)[] {
	return [...el.querySelectorAll<HTMLElement>(`[contenteditable][aria-label="${label}"]`)].map(
		(f) => f.getAttribute('data-placeholder')
	);
}

beforeEach(() => {
	localStorage.clear();
	canvas.replace(stampIds(blankCanvas()));
});

afterEach(() => {
	if (component) unmount(component);
	component = null;
	document.body.innerHTML = '';
});

/** The SPEC §10 ghost questions, keyed by grid area. */
const QUESTIONS: [string, string][] = [
	['roles', '+ trait — how does this context behave?'],
	['inbound', '+ collaborator — who sends this context commands, queries or events?'],
	['outbound', '+ collaborator — who consumes what this context emits?'],
	['language', '+ term — which words mean something precise here?'],
	['decisions', '+ decision — which rules does this context enforce?'],
	['assumptions', '+ assumption — what are you taking to be true?'],
	['metrics', '+ metric — what would verify this design?'],
	['questions', "+ question — what's still unresolved?"]
];

describe('a new canvas teaches through the form itself (SPEC §7)', () => {
	it('shows every section ghost as its §10 question', () => {
		const el = render();
		for (const [area, question] of QUESTIONS) {
			expect(buttons(section(el, area), question)).toHaveLength(1);
		}
	});

	it('keeps empty-section ghosts always visible — no hover needed', () => {
		const el = render();
		for (const [area, question] of QUESTIONS) {
			expect(button(section(el, area), question).classList.contains('ghost--teach')).toBe(true);
		}
	});

	it('asks the name and description questions as placeholders', () => {
		const el = render();
		expect(placeholders(el, 'Name')).toEqual(['Name this context']);
		expect(placeholders(el, 'Description')).toEqual([
			'What does this context exist to do? A few sentences in business language.'
		]);
	});

	it('renders classification values as em dashes until picked', () => {
		const el = render();
		const values = [...el.querySelectorAll('header dl dd')].map((d) => d.textContent?.trim());
		expect(values).toEqual(['—', '—', '—']);
	});
});

describe('a filled section teaches tersely (SPEC §10)', () => {
	beforeEach(() => canvas.replace(referenceDoc()));

	it('collapses every ghost to its terse label', () => {
		const el = render();
		expect(buttons(section(el, 'roles'), '+ trait')).toHaveLength(1);
		expect(buttons(section(el, 'inbound'), '+ collaborator')).toHaveLength(1);
		expect(buttons(section(el, 'outbound'), '+ collaborator')).toHaveLength(1);
		expect(buttons(el, '+ term')).toHaveLength(1);
		expect(buttons(el, '+ decision')).toHaveLength(1);
		expect(buttons(el, '+ assumption')).toHaveLength(1);
		expect(buttons(el, '+ metric')).toHaveLength(1);
		expect(buttons(el, '+ question')).toHaveLength(1);
		for (const [, question] of QUESTIONS) {
			expect(buttons(el, question)).toHaveLength(0);
		}
	});

	it('keeps terse ghosts hover-materialized, not always visible', () => {
		const el = render();
		expect(button(el, '+ term').classList.contains('ghost--teach')).toBe(false);
		expect(button(section(el, 'roles'), '+ trait').classList.contains('ghost--teach')).toBe(false);
	});

	it('carries the §10 terse placeholder on every row field', () => {
		const el = render();
		expect(placeholders(el, 'Collaborator')).toEqual(['Collaborator', 'Collaborator']);
		expect(placeholders(el, 'Message name')).toEqual([
			'Message name',
			'Message name',
			'Message name'
		]);
		expect(placeholders(el, 'Term')).toEqual(['Term']);
		expect(placeholders(el, 'Definition')).toEqual(['What it means here']);
		expect(placeholders(el, 'Decision')).toEqual(['Rule']);
		expect(placeholders(el, 'Decision description')).toEqual(['detail']);
		expect(placeholders(el, 'Message description')).toEqual(['detail', 'detail', 'detail']);
		expect(placeholders(el, 'Assumption')).toEqual(['…']);
		expect(placeholders(el, 'Verification metric')).toEqual(['…']);
		expect(placeholders(el, 'Open question')).toEqual(['…']);
	});
});

describe('teaching disappears and returns state-driven — no stored flag (SPEC §7)', () => {
	it('shortens the ghost on the first item and restores the question when the last is removed', () => {
		const el = render();
		const inbound = section(el, 'inbound');
		const question = '+ collaborator — who sends this context commands, queries or events?';

		click(button(inbound, question));
		expect(buttons(inbound, question)).toHaveLength(0);
		expect(button(inbound, '+ collaborator').classList.contains('ghost--teach')).toBe(false);

		click(button(inbound, 'Remove collaborator'));
		expect(buttons(inbound, '+ collaborator')).toHaveLength(0);
		expect(button(inbound, question).classList.contains('ghost--teach')).toBe(true);
	});

	it('restores a sticky question the same way', () => {
		const el = render();
		const metrics = section(el, 'metrics');
		const question = '+ metric — what would verify this design?';

		click(button(metrics, question));
		expect(buttons(metrics, '+ metric')).toHaveLength(1);

		click(button(metrics, 'Remove verification metric'));
		expect(buttons(metrics, question)).toHaveLength(1);
	});
});

describe('teaching never reaches the document (ticket 10 guard)', () => {
	it('serializes a rendered new canvas byte-identical to a blank one', () => {
		render();
		expect(serializeCanvas(canvas.doc)).toBe(serializeCanvas(stampIds(blankCanvas())));
	});
});
