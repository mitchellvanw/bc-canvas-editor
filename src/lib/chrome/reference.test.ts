// @vitest-environment jsdom
/**
 * The Reference dialog (SPEC §12, ticket 13): the chrome control and ⌘/ both
 * open a modal dialog carrying the keyboard grammar in four clusters plus the
 * ddd-crew link line — contents verbatim from the SPEC tables, modifiers
 * rendered per platform; closing returns focus to the invoking control.
 */
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Chrome from '$lib/chrome/Chrome.svelte';
import { renderKeys } from '$lib/chrome/reference';

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
// territory — here they only need to open, close, and fire `close`.
HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
	this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
	this.removeAttribute('open');
	this.dispatchEvent(new Event('close'));
};

let component: ReturnType<typeof mount> | null = null;

function render(): HTMLElement {
	const target = document.createElement('div');
	document.body.append(target);
	component = mount(Chrome, { target });
	flushSync();
	return target;
}

function referenceButton(el: ParentNode): HTMLButtonElement {
	const match = [...el.querySelectorAll<HTMLButtonElement>('button')].find(
		(b) => b.textContent?.trim() === 'Reference'
	);
	if (!match) throw new Error('no Reference control in the chrome');
	return match;
}

function openDialog(): HTMLDialogElement {
	const dialog = [...document.querySelectorAll<HTMLDialogElement>('dialog')].find((d) => d.open);
	if (!dialog) throw new Error('no open dialog');
	return dialog;
}

beforeEach(() => {
	localStorage.clear();
});

afterEach(() => {
	if (component) unmount(component);
	component = null;
	document.body.innerHTML = '';
});

describe('renderKeys — modifiers render per platform (SPEC §12)', () => {
	it('keeps the SPEC ⌘ form on macOS', () => {
		expect(renderKeys('⌘/', true)).toBe('⌘/');
		expect(renderKeys('⌘Z / ⇧⌘Z', true)).toBe('⌘Z / ⇧⌘Z');
	});

	it('renders Ctrl forms on Windows/Linux', () => {
		expect(renderKeys('⌘/', false)).toBe('Ctrl+/');
		expect(renderKeys('⌘Z / ⇧⌘Z', false)).toBe('Ctrl+Z / Ctrl+Shift+Z');
	});

	it('leaves modifier-free keys alone on either platform', () => {
		expect(renderKeys('Alt+← / Alt+→', false)).toBe('Alt+← / Alt+→');
		expect(renderKeys('Enter / Space', false)).toBe('Enter / Space');
	});
});

describe('the Reference chrome control (SPEC §12)', () => {
	it('sits in the chrome with its shortcut tooltip and opens the modal dialog', () => {
		const el = render();
		const control = referenceButton(el);
		expect(control.title).toBe(`Reference (${renderKeys('⌘/')})`);

		control.click();
		flushSync();
		const dialog = openDialog();
		expect(dialog.querySelector('h2')?.textContent).toBe('Reference');
	});

	it('keeps the Undo/Redo tooltips on the same per-platform rendering', () => {
		const el = render();
		const titles = [...el.querySelectorAll<HTMLButtonElement>('button')].map((b) => b.title);
		expect(titles).toContain(`Undo (${renderKeys('⌘Z')})`);
		expect(titles).toContain(`Redo (${renderKeys('⇧⌘Z')})`);
	});

	// The SPEC §12 tables, hand-copied: title, four clusters, the link line.
	const SPEC_CONTENTS: [cluster: string, rows: [keys: string, action: string][]][] = [
		[
			'Editing',
			[
				['Enter', 'Commit a single-line field'],
				['Esc', 'Revert the field being edited'],
				['Tab / click away', 'Commit and move on']
			]
		],
		[
			'Structure',
			[
				['Delete', 'Remove the focused chip or lane'],
				['Alt+← / Alt+→', 'Move a chip within its lane'],
				['Alt+↑ / Alt+↓', 'Move a lane up or down']
			]
		],
		[
			'Pickers',
			[
				['Enter / Space', 'Open the picker on a value'],
				['↑ ↓', 'Move through options — or type to jump'],
				['Space', 'Toggle a trait'],
				['Enter', 'Pick and close'],
				['Esc', 'Close without changing']
			]
		],
		[
			'App',
			[
				['⌘Z / ⇧⌘Z', 'Undo / Redo'],
				['⌘/', 'Open this reference']
			]
		]
	];

	it('carries the four clusters verbatim, keys rendered per platform', () => {
		const el = render();
		referenceButton(el).click();
		flushSync();
		const dialog = openDialog();

		const clusters = [...dialog.querySelectorAll('section')].map((section) => [
			section.querySelector('h3')?.textContent,
			[...section.querySelectorAll('tr')].map((row) =>
				[...row.querySelectorAll('td')].map((cell) => cell.textContent)
			)
		]);
		expect(clusters).toEqual(
			SPEC_CONTENTS.map(([title, rows]) => [
				title,
				rows.map(([keys, action]) => [renderKeys(keys), action])
			])
		);
	});

	it('opens on ⌘/ and on Ctrl+/, consumed so the browser shortcut never fires', () => {
		render();
		const cmd = new KeyboardEvent('keydown', {
			key: '/',
			metaKey: true,
			bubbles: true,
			cancelable: true
		});
		document.body.dispatchEvent(cmd);
		flushSync();
		expect(openDialog().querySelector('h2')?.textContent).toBe('Reference');
		expect(cmd.defaultPrevented).toBe(true);

		openDialog().close();
		flushSync();
		const ctrl = new KeyboardEvent('keydown', {
			key: '/',
			ctrlKey: true,
			bubbles: true,
			cancelable: true
		});
		document.body.dispatchEvent(ctrl);
		flushSync();
		expect(openDialog().querySelector('h2')?.textContent).toBe('Reference');
	});

	it('leaves ⌘/ alone while a dialog is already up', () => {
		const el = render();
		referenceButton(el).click();
		flushSync();
		const dialog = openDialog();

		const event = new KeyboardEvent('keydown', {
			key: '/',
			metaKey: true,
			bubbles: true,
			cancelable: true
		});
		dialog.querySelector('button')?.dispatchEvent(event);
		flushSync();
		expect(event.defaultPrevented).toBe(false);
		expect(openDialog()).toBe(dialog);
	});

	it('returns focus to the chrome control that opened it', () => {
		const el = render();
		const control = referenceButton(el);
		control.focus();
		control.click();
		flushSync();

		const close = [...openDialog().querySelectorAll('button')].find(
			(b) => b.textContent?.trim() === 'Close'
		);
		close?.click();
		flushSync();
		expect(document.activeElement).toBe(control);
	});

	it('returns focus to wherever ⌘/ was pressed', () => {
		const el = render();
		const importButton = [...el.querySelectorAll<HTMLButtonElement>('button')].find(
			(b) => b.textContent?.trim() === 'Import…'
		);
		importButton?.focus();
		importButton?.dispatchEvent(
			new KeyboardEvent('keydown', { key: '/', metaKey: true, bubbles: true, cancelable: true })
		);
		flushSync();

		openDialog().close();
		flushSync();
		expect(document.activeElement).toBe(importButton);
	});

	it('ends on the link line, linked to the ddd-crew repo', () => {
		const el = render();
		referenceButton(el).click();
		flushSync();
		const dialog = openDialog();

		const line = [...dialog.querySelectorAll('p')].find((p) =>
			p.textContent?.includes('Learn the method')
		);
		expect(line?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
			"Learn the method: the ddd-crew's Bounded Context Canvas"
		);
		expect(line?.querySelector('a')?.href).toBe(
			'https://github.com/ddd-crew/bounded-context-canvas'
		);
	});
});
