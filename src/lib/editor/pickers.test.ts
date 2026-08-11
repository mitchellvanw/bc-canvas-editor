// @vitest-environment jsdom
/**
 * Pickers (SPEC §4, §6, §8.3, ticket 07): curated vocabularies open as
 * popovers on the value itself. Classification axes and lane relationships are
 * pick-one listboxes with — none — / — no relationship — and custom…; the
 * domain-role ghost opens the 15-trait multi-select checklist. One pick,
 * toggle or clear is exactly one commit — one autosave write — and custom
 * values render identically to curated ones and round-trip through the
 * serializer. The keyboard grammar of SPEC §8.3 is exercised per picker.
 */
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { canvas } from '$lib/editor/document.svelte';
import EditableSheet from '$lib/editor/EditableSheet.svelte';
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
	// The reference's outbound lane carries both relationship ends; these tests
	// also need a lane with none, so Notifications is cleared back to unset.
	delete result.file.outboundCommunication[0].relationship;
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

/** The picker trigger: the rendered value as a button (SPEC §8.3). */
function trigger(el: ParentNode, name: string): HTMLButtonElement {
	const matches = [...el.querySelectorAll<HTMLButtonElement>('button')].filter(
		(b) => (b.getAttribute('aria-label') ?? b.textContent?.trim()) === name
	);
	if (matches.length !== 1)
		throw new Error(`expected one "${name}" trigger, found ${matches.length}`);
	return matches[0];
}

/** All trait-checklist checkboxes, in listed order. */
function checkboxes(el: ParentNode): HTMLElement[] {
	return [...el.querySelectorAll<HTMLElement>('[role="checkbox"]')];
}

function checkbox(el: ParentNode, name: string): HTMLElement {
	const matches = checkboxes(el).filter((c) => c.getAttribute('data-value') === name);
	if (matches.length !== 1)
		throw new Error(`expected one "${name}" checkbox, found ${matches.length}`);
	return matches[0];
}

/** All open-listbox options, in listed order. */
function options(el: ParentNode): HTMLElement[] {
	return [...el.querySelectorAll<HTMLElement>('[role="option"]')];
}

/** An option's label: its value or entry wording, without the ✓ ornament. */
function optionLabel(o: HTMLElement): string | undefined {
	return o.getAttribute('data-value') ?? o.textContent?.replace('✓', '').trim();
}

/** The one option for a curated value / the — none — or custom… entry. */
function option(el: ParentNode, name: string): HTMLElement {
	const matches = options(el).filter((o) => optionLabel(o) === name);
	if (matches.length !== 1) throw new Error(`expected one "${name}" option, found ${matches.length}`);
	return matches[0];
}

function click(target: HTMLElement) {
	target.click();
	flushSync();
}

function press(node: EventTarget, key: string): KeyboardEvent {
	const event = new KeyboardEvent('keydown', { key, cancelable: true, bubbles: true });
	node.dispatchEvent(event);
	flushSync();
	return event;
}

function serialized(): CanvasFile {
	return JSON.parse(serializeCanvas(canvas.doc)) as CanvasFile;
}

async function expectFocused(el: Element | null | undefined) {
	await vi.waitFor(() => {
		expect(document.activeElement).toBe(el);
	});
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

describe('classification axis pickers (SPEC §4.1)', () => {
	it('renders each axis value as a button that opens its listbox with ✓ on the current value', () => {
		const el = render();
		const domain = trigger(el, 'Domain');
		expect(domain.textContent?.trim()).toBe('core');
		expect(domain.getAttribute('aria-haspopup')).toBe('listbox');
		expect(domain.getAttribute('aria-expanded')).toBe('false');

		click(domain);
		expect(domain.getAttribute('aria-expanded')).toBe('true');
		const listed = options(el).map(optionLabel);
		expect(listed).toEqual(['core', 'supporting', 'generic', '— none —', 'custom…']);
		expect(option(el, 'core').getAttribute('aria-selected')).toBe('true');
		expect(option(el, 'supporting').getAttribute('aria-selected')).toBe('false');
	});

	it.each([
		['Domain', 'supporting', () => canvas.doc.strategicClassification.domain],
		['Business model', 'engagement', () => canvas.doc.strategicClassification.businessModel],
		['Evolution', 'commodity', () => canvas.doc.strategicClassification.evolution]
	])('picks a curated %s value in one commit and closes', async (label, value, read) => {
		const el = render();
		const setItem = vi.spyOn(localStorage, 'setItem');
		const button = trigger(el, label);
		click(button);
		click(option(el, value));

		expect(read()).toBe(value);
		expect(setItem).toHaveBeenCalledTimes(1);
		expect(options(el)).toHaveLength(0);
		expect(button.textContent?.trim()).toBe(value);
		await expectFocused(button);
	});

	it('offers the full curated vocabulary per axis', () => {
		const el = render();
		click(trigger(el, 'Business model'));
		expect(options(el).map(optionLabel)).toEqual([
			'revenue',
			'engagement',
			'compliance',
			'cost-reduction',
			'— none —',
			'custom…'
		]);
		press(el.querySelector('[role="listbox"]')!, 'Escape');
		click(trigger(el, 'Evolution'));
		expect(options(el).map(optionLabel)).toEqual([
			'genesis',
			'custom-built',
			'product',
			'commodity',
			'— none —',
			'custom…'
		]);
	});

	it('clears an axis to — via — none — in one commit, omitting it from the file', () => {
		const el = render();
		const setItem = vi.spyOn(localStorage, 'setItem');
		click(trigger(el, 'Domain'));
		click(option(el, '— none —'));

		expect(canvas.doc.strategicClassification.domain).toBeUndefined();
		expect(setItem).toHaveBeenCalledTimes(1);
		expect(trigger(el, 'Domain').textContent?.trim()).toBe('—');
		expect('domain' in serialized().strategicClassification).toBe(false);
	});

	it('commits nothing when the pick would not change the value', () => {
		const el = render();
		const setItem = vi.spyOn(localStorage, 'setItem');
		click(trigger(el, 'Domain'));
		click(option(el, 'core'));
		expect(options(el)).toHaveLength(0);

		click(trigger(el, 'Relationship for Notifications'));
		click(option(el, '— no relationship —'));
		expect(options(el)).toHaveLength(0);
		expect(setItem).not.toHaveBeenCalled();
		expect(canvas.unexported).toBe(false);
	});

	it('closes on a pointerdown elsewhere without committing', () => {
		const el = render();
		const setItem = vi.spyOn(localStorage, 'setItem');
		click(trigger(el, 'Domain'));
		document.body.dispatchEvent(
			new MouseEvent('pointerdown', { bubbles: true, cancelable: true })
		);
		flushSync();
		expect(options(el)).toHaveLength(0);
		expect(setItem).not.toHaveBeenCalled();
		expect(canvas.doc.strategicClassification.domain).toBe('core');
	});

	it('accepts a custom value through custom…, rendering it like a curated one', () => {
		const el = render();
		const setItem = vi.spyOn(localStorage, 'setItem');
		click(trigger(el, 'Evolution'));
		click(option(el, 'custom…'));

		const input = el.querySelector<HTMLInputElement>('.picker input');
		expect(input).not.toBeNull();
		expect(setItem).not.toHaveBeenCalled();
		input!.value = 'outsourced';
		press(input!, 'Enter');

		expect(canvas.doc.strategicClassification.evolution).toBe('outsourced');
		expect(setItem).toHaveBeenCalledTimes(1);
		expect(options(el)).toHaveLength(0);
		expect(trigger(el, 'Evolution').textContent?.trim()).toBe('outsourced');
		expect(serialized().strategicClassification.evolution).toBe('outsourced');
	});
});

describe('relationship picker (SPEC §4.3)', () => {
	it('teaches the nine patterns via their one-liners, ✓ on the current value', () => {
		const el = render();
		const button = trigger(el, 'Relationship for Checkout');
		expect(button.textContent?.trim()).toBe('customer-supplier');
		click(button);

		expect(options(el).map(optionLabel)).toEqual([
			'partnership',
			'shared-kernel',
			'customer-supplier',
			'conformist',
			'anticorruption-layer',
			'open-host-service',
			'published-language',
			'separate-ways',
			'big-ball-of-mud',
			'— no relationship —',
			'custom…'
		]);
		expect(option(el, 'customer-supplier').getAttribute('aria-selected')).toBe('true');
		expect(option(el, 'partnership').textContent).toContain(
			'The two contexts succeed or fail together; teams coordinate as equals.'
		);
		expect(option(el, 'big-ball-of-mud').textContent).toContain(
			"The other side is entangled legacy; defend this context's boundary."
		);
	});

	it('picks a pattern in one commit and renders it as the quiet lane text', () => {
		const el = render();
		const setItem = vi.spyOn(localStorage, 'setItem');
		click(trigger(el, 'Relationship for Checkout'));
		click(option(el, 'conformist'));

		expect(canvas.doc.inboundCommunication[0].relationship).toEqual({ ours: 'conformist' });
		expect(setItem).toHaveBeenCalledTimes(1);
		expect(serialized().inboundCommunication[0].relationship).toEqual({ ours: 'conformist' });
		expect(trigger(el, 'Relationship for Checkout').textContent?.trim()).toBe('conformist');
	});

	it('clears via — no relationship —, omitting the field from the file', () => {
		const el = render();
		const setItem = vi.spyOn(localStorage, 'setItem');
		click(trigger(el, 'Relationship for Checkout'));
		click(option(el, '— no relationship —'));

		expect(canvas.doc.inboundCommunication[0].relationship).toBeUndefined();
		expect(setItem).toHaveBeenCalledTimes(1);
		expect('relationship' in serialized().inboundCommunication[0]).toBe(false);
		expect(trigger(el, 'Relationship for Checkout').textContent?.trim()).toBe('—');
	});

	it('offers a lane without a relationship its picker on a — placeholder', () => {
		const el = render();
		const button = trigger(el, 'Relationship for Notifications');
		expect(button.textContent?.trim()).toBe('—');
		click(button);
		click(option(el, 'open-host-service'));
		expect(canvas.doc.outboundCommunication[0].relationship).toEqual({ ours: 'open-host-service' });
	});

	it('accepts a custom relationship through custom…', () => {
		const el = render();
		const setItem = vi.spyOn(localStorage, 'setItem');
		click(trigger(el, 'Relationship for Checkout'));
		click(option(el, 'custom…'));
		const input = el.querySelector<HTMLInputElement>('.picker input');
		expect(input?.getAttribute('aria-label')).toBe('Custom relationship for Checkout');
		input!.value = 'api-consumer';
		press(input!, 'Enter');

		expect(canvas.doc.inboundCommunication[0].relationship).toEqual({ ours: 'api-consumer' });
		expect(setItem).toHaveBeenCalledTimes(1);
		expect(serialized().inboundCommunication[0].relationship).toEqual({ ours: 'api-consumer' });
		expect(trigger(el, 'Relationship for Checkout').textContent?.trim()).toBe('api-consumer');
	});
});

describe('the domain-role trait checklist (SPEC §4.2)', () => {
	const roleNames = () => canvas.doc.domainRoles.map((role) => role.name);

	it('opens the 15 traits as a checkbox group with descriptions, current traits checked', () => {
		const el = render();
		click(trigger(el, '+ trait'));

		const listed = checkboxes(el).map((c) => c.getAttribute('data-value'));
		expect(listed).toEqual([
			'specification model',
			'execution context',
			'audit model',
			'approver',
			'enforcer',
			'octopus coordinator',
			'interchange context',
			'gateway context',
			'service context',
			'analysis context',
			'engagement context',
			'funnel context',
			'draft context',
			'brain context',
			'autonomous bubble'
		]);
		expect(checkbox(el, 'execution context').getAttribute('aria-checked')).toBe('true');
		expect(checkbox(el, 'audit model').getAttribute('aria-checked')).toBe('false');
		expect(checkbox(el, 'execution context').textContent).toContain(
			'Carries out a business workflow from trigger to outcome.'
		);
		expect(checkbox(el, 'autonomous bubble').textContent).toContain(
			'Deliberately isolated from legacy models so it can evolve freely.'
		);
	});

	it('toggles a trait on and off — one commit each — while the checklist stays open', () => {
		const el = render();
		const setItem = vi.spyOn(localStorage, 'setItem');
		click(trigger(el, '+ trait'));

		click(checkbox(el, 'audit model'));
		expect(roleNames()).toEqual(['execution context', 'audit model']);
		expect(setItem).toHaveBeenCalledTimes(1);
		expect(checkbox(el, 'audit model').getAttribute('aria-checked')).toBe('true');

		click(checkbox(el, 'execution context'));
		expect(roleNames()).toEqual(['audit model']);
		expect(setItem).toHaveBeenCalledTimes(2);
		expect(checkboxes(el)).toHaveLength(15);
	});

	it('closes on Escape without a commit, and on a pointerdown elsewhere', () => {
		const el = render();
		const setItem = vi.spyOn(localStorage, 'setItem');
		const ghost = trigger(el, '+ trait');
		click(ghost);
		press(checkbox(el, 'approver'), 'Escape');
		expect(checkboxes(el)).toHaveLength(0);
		expect(setItem).not.toHaveBeenCalled();

		click(ghost);
		document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true }));
		flushSync();
		expect(checkboxes(el)).toHaveLength(0);
	});

	it('adds a custom trait through the input in one commit, keeping the checklist open', () => {
		const el = render();
		const setItem = vi.spyOn(localStorage, 'setItem');
		click(trigger(el, '+ trait'));
		click(trigger(el, 'custom…'));

		const input = el.querySelector<HTMLInputElement>('.picker input');
		expect(input).not.toBeNull();
		input!.value = 'metrics hub';
		press(input!, 'Enter');

		expect(roleNames()).toEqual(['execution context', 'metrics hub']);
		expect(setItem).toHaveBeenCalledTimes(1);
		expect(checkboxes(el)).toHaveLength(15);
		expect(input!.value).toBe('');
	});

	it('does not duplicate an already-present trait through the custom input', () => {
		const el = render();
		const setItem = vi.spyOn(localStorage, 'setItem');
		click(trigger(el, '+ trait'));
		click(trigger(el, 'custom…'));
		const input = el.querySelector<HTMLInputElement>('.picker input')!;
		input.value = 'execution context';
		press(input, 'Enter');

		expect(roleNames()).toEqual(['execution context']);
		expect(setItem).not.toHaveBeenCalled();
	});

	it('renders a custom trait as an ordinary chip, removable via its ×', () => {
		const el = render();
		click(trigger(el, '+ trait'));
		click(trigger(el, 'custom…'));
		const input = el.querySelector<HTMLInputElement>('.picker input')!;
		input.value = 'metrics hub';
		press(input, 'Enter');
		press(input, 'Escape');
		press(checkbox(el, 'approver'), 'Escape');

		const chips = [...el.querySelectorAll('.role')].map((r) => r.textContent?.replace('×', '').trim());
		expect(chips).toEqual(['execution context', 'metrics hub']);
		click(trigger(el, 'Remove trait metrics hub'));
		expect(roleNames()).toEqual(['execution context']);
	});
});

describe('the keyboard grammar (SPEC §8.3)', () => {
	const focused = () => document.activeElement as HTMLElement;

	it('opens on the ✓ value, arrows move, Enter picks-and-closes, focus returns', async () => {
		const el = render();
		const button = trigger(el, 'Domain');
		click(button);
		await expectFocused(option(el, 'core'));

		press(focused(), 'ArrowDown');
		await expectFocused(option(el, 'supporting'));
		press(focused(), 'Enter');

		expect(canvas.doc.strategicClassification.domain).toBe('supporting');
		expect(options(el)).toHaveLength(0);
		await expectFocused(button);
	});

	it('jumps by type-ahead', async () => {
		const el = render();
		click(trigger(el, 'Evolution'));
		await expectFocused(option(el, 'custom-built'));

		press(focused(), 'g');
		await expectFocused(option(el, 'genesis'));
		// Quick successive keys accumulate into one prefix — 'ge' still matches.
		press(focused(), 'e');
		await expectFocused(option(el, 'genesis'));
		press(focused(), 'Enter');
		expect(canvas.doc.strategicClassification.evolution).toBe('genesis');
	});

	it('closes unchanged on Esc, returning focus to the value button', async () => {
		const el = render();
		const setItem = vi.spyOn(localStorage, 'setItem');
		const button = trigger(el, 'Relationship for Checkout');
		click(button);
		await expectFocused(option(el, 'customer-supplier'));

		press(focused(), 'ArrowDown');
		press(focused(), 'Escape');

		expect(canvas.doc.inboundCommunication[0].relationship).toEqual({ ours: 'customer-supplier' });
		expect(setItem).not.toHaveBeenCalled();
		expect(options(el)).toHaveLength(0);
		await expectFocused(button);
	});

	it('enters custom… on Enter, backs out on Esc, and Esc again closes unchanged', async () => {
		const el = render();
		const setItem = vi.spyOn(localStorage, 'setItem');
		click(trigger(el, 'Domain'));
		await expectFocused(option(el, 'core'));

		press(focused(), 'End');
		await expectFocused(option(el, 'custom…'));
		press(focused(), 'Enter');
		const input = el.querySelector<HTMLInputElement>('.picker input');
		expect(input).not.toBeNull();
		await expectFocused(input);

		input!.value = 'discarded';
		press(input!, 'Escape');
		await expectFocused(option(el, 'custom…'));
		press(focused(), 'Escape');

		expect(options(el)).toHaveLength(0);
		expect(canvas.doc.strategicClassification.domain).toBe('core');
		expect(setItem).not.toHaveBeenCalled();
	});

	it('runs the trait checklist as a checkbox group: arrows move, Space toggles, Esc closes', async () => {
		const el = render();
		const setItem = vi.spyOn(localStorage, 'setItem');
		const ghost = trigger(el, '+ trait');
		click(ghost);
		await expectFocused(checkbox(el, 'specification model'));

		press(focused(), 'ArrowDown');
		await expectFocused(checkbox(el, 'execution context'));
		press(focused(), ' ');
		expect(canvas.doc.domainRoles).toEqual([]);
		expect(setItem).toHaveBeenCalledTimes(1);
		expect(checkboxes(el)).toHaveLength(15);

		press(focused(), ' ');
		expect(canvas.doc.domainRoles.map((role) => role.name)).toEqual(['execution context']);
		expect(setItem).toHaveBeenCalledTimes(2);

		press(focused(), 'Escape');
		expect(checkboxes(el)).toHaveLength(0);
		await expectFocused(ghost);
	});

	it('closes an open popover when focus leaves it', () => {
		const el = render();
		click(trigger(el, 'Domain'));
		const core = option(el, 'core');
		core.dispatchEvent(
			new FocusEvent('focusout', { bubbles: true, relatedTarget: document.body })
		);
		flushSync();
		expect(options(el)).toHaveLength(0);

		click(trigger(el, '+ trait'));
		checkbox(el, 'approver').dispatchEvent(
			new FocusEvent('focusout', { bubbles: true, relatedTarget: document.body })
		);
		flushSync();
		expect(checkboxes(el)).toHaveLength(0);
	});
});

describe('custom values round-trip (SPEC §3.2)', () => {
	it('survives export → import and renders identically to curated values', () => {
		const el = render();
		click(trigger(el, 'Domain'));
		click(option(el, 'custom…'));
		let input = el.querySelector<HTMLInputElement>('.picker input')!;
		input.value = 'vision';
		press(input, 'Enter');

		click(trigger(el, 'Relationship for Checkout'));
		click(option(el, 'custom…'));
		input = el.querySelector<HTMLInputElement>('.picker input')!;
		input.value = 'api-consumer';
		press(input, 'Enter');

		click(trigger(el, '+ trait'));
		click(trigger(el, 'custom…'));
		input = el.querySelector<HTMLInputElement>('.picker input')!;
		input.value = 'metrics hub';
		press(input, 'Enter');

		const exported = serializeCanvas(canvas.doc);
		const result = parseCanvasFile(exported);
		if (!result.ok) throw new Error('exported canvas must re-import');
		canvas.replace(stampIds(result.file));
		flushSync();

		expect(trigger(el, 'Domain').textContent?.trim()).toBe('vision');
		expect(trigger(el, 'Relationship for Checkout').textContent?.trim()).toBe('api-consumer');
		const chips = [...el.querySelectorAll('.role')].map((r) => r.textContent?.replace('×', '').trim());
		expect(chips).toEqual(['execution context', 'metrics hub']);

		// And the re-imported custom values are ✓'d as current in their pickers.
		click(trigger(el, 'Domain'));
		expect(options(el).every((o) => o.getAttribute('aria-selected') === 'false')).toBe(true);
	});
});
