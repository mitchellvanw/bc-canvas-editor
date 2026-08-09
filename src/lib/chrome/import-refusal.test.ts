// @vitest-environment jsdom
/**
 * The first of the parser's two levels of disclosure (ticket 026): whatever
 * `ParseResult.detail` says about the offending field, the app shows the SPEC
 * §10 refusal notice and nothing else. The detail exists for non-human callers
 * — an MCP tool teaching a model to fix the file it wrote — and this pins that
 * adding it did not change what a person sees, including that no field path
 * leaks into the dialog.
 */
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setAnnouncer } from '$lib/a11y/announce';
import Chrome from '$lib/chrome/Chrome.svelte';
import { canvas } from '$lib/editor/document.svelte';
import { blankCanvas } from '$lib/model/canvas';
import { parseCanvasImport } from '$lib/model/parse';
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

// jsdom 30 ships <dialog> without showModal()/close(); the modal behaviors
// they back (focus trap, inert backdrop, native Esc) are WebKit-checkpoint
// territory — here the notice only needs to open.
HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
	this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
	this.removeAttribute('open');
	this.dispatchEvent(new Event('close'));
};

// A file whose every section is present but whose second inbound lane carries
// a message type outside the closed enum — the parser's most detailed refusal,
// so the most it could possibly leak.
const BAD_FILE = (() => {
	const raw = JSON.parse(REFERENCE_FILE) as Record<string, unknown>;
	(raw.inboundCommunication as Record<string, unknown>[]).push({
		collaborator: 'Support',
		messages: [{ type: 'notification', name: 'Refund asked' }]
	});
	return JSON.stringify(raw);
})();

const DETAIL =
	'inboundCommunication[1].messages[0].type: expected one of "command", "query", "event", got "notification"';

let component: ReturnType<typeof mount> | null = null;

function render(): HTMLElement {
	const target = document.createElement('div');
	document.body.append(target);
	component = mount(Chrome, { target });
	flushSync();
	return target;
}

/** Drives the real onchange path rather than reaching into the component. */
async function importText(el: ParentNode, text: string): Promise<void> {
	const input = el.querySelector<HTMLInputElement>('input[type="file"]');
	if (!input) throw new Error('no file input in the chrome');
	Object.defineProperty(input, 'files', {
		value: [
			new File([text], 'order-fulfillment.bcc.json', {
				type: 'application/json'
			})
		],
		configurable: true
	});
	// Svelte 5 delegates change at the root, so the event has to bubble.
	input.dispatchEvent(new Event('change', { bubbles: true }));
	await new Promise((resolve) => setTimeout(resolve, 0));
	flushSync();
}

function openDialog(): HTMLDialogElement {
	const open = [...document.querySelectorAll<HTMLDialogElement>('dialog')].find((d) => d.open);
	if (!open) throw new Error('no open dialog');
	return open;
}

describe('a refused import says one thing to the user (SPEC §10)', () => {
	beforeEach(() => {
		localStorage.clear();
		canvas.replace(blankCanvas());
		setAnnouncer(() => {});
	});

	afterEach(() => {
		setAnnouncer(null);
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	it('the fixture is refused with the field-level detail the model would read', () => {
		const result = parseCanvasImport(BAD_FILE);
		expect(result).toMatchObject({
			ok: false,
			reason: 'not-canvas',
			detail: DETAIL
		});
	});

	it('shows the two SPEC §10 sentences, unchanged', async () => {
		const el = render();
		await importText(el, BAD_FILE);

		const dialog = openDialog();
		expect(dialog.querySelector('h2')?.textContent?.trim()).toBe(
			"This file couldn't be read as a Canvas file."
		);
		expect(dialog.querySelector('p')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
			"It isn't a Canvas file export, or it's been modified. Nothing was imported."
		);
	});

	it('leaks no part of the detail into the dialog — no field path, no expectation', async () => {
		const el = render();
		await importText(el, BAD_FILE);

		const shown = openDialog().textContent ?? '';
		expect(shown).not.toContain(DETAIL);
		for (const fragment of [
			'inboundCommunication',
			'messages[0]',
			'expected one of',
			'notification'
		])
			expect(shown).not.toContain(fragment);
	});

	it('leaves the canvas untouched, as before', async () => {
		const el = render();
		await importText(el, BAD_FILE);
		expect(canvas.doc.name).toBe('');
	});
});
