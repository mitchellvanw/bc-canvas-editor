// @vitest-environment jsdom
/**
 * Bundled examples & the Examples menu (SPEC §3.5/§10, ticket 023): the
 * committed examples/*.bcc.json files are serializer-canonical and pinned
 * byte-exactly through the real import path at the current schema version, so
 * a schema bump can't silently strand them; the chrome's Examples menu opens
 * them through the same gate/replacement as any import and lands clean; the
 * chooser's copy never reaches artifact bytes.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setAnnouncer } from '$lib/a11y/announce';
import { artifactDocument } from '$lib/artifact/html';
import Chrome from '$lib/chrome/Chrome.svelte';
import { EXAMPLES } from '$lib/chrome/examples';
import { canvas } from '$lib/editor/document.svelte';
import { blankCanvas, stampIds, CANVAS_VERSION } from '$lib/model/canvas';
import { extractEmbeddedCanvas } from '$lib/model/embed';
import { exportFileName } from '$lib/model/filename';
import { parseCanvasImport } from '$lib/model/parse';
import { serializeCanvas } from '$lib/model/serialize';

// Under the jsdom environment import.meta.url is not a file: URL; vitest runs
// from the project root, so the committed files resolve from cwd.
const EXAMPLES_DIR = join(process.cwd(), 'examples');

function committedBytes(name: string): string {
	return readFileSync(join(EXAMPLES_DIR, exportFileName(name, 'json')), 'utf8');
}

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

describe('the committed example files (SPEC §3.5)', () => {
	it('has the roster and examples/ in one-to-one correspondence', () => {
		const onDisk = readdirSync(EXAMPLES_DIR).filter((f) => f.endsWith('.bcc.json'));
		const fromRoster = EXAMPLES.map((entry) => exportFileName(entry.name, 'json'));
		expect(fromRoster.toSorted()).toEqual(onDisk.toSorted());
	});

	it('carries a committed image beside every canvas (ticket 062)', () => {
		// Whether an image is *current* is `bcc check`'s answer, and the suite
		// asks it in cli/src/bcc.test.ts. This asks the other half: a fifth
		// example arriving with no image beside it would render as a broken
		// picture in whatever markdown pointed at it, and a comparison that only
		// ever looks at files that exist would never notice.
		const images = readdirSync(EXAMPLES_DIR).filter((f) => f.endsWith('.bcc.svg'));
		expect(images.toSorted()).toEqual(
			EXAMPLES.map((entry) => exportFileName(entry.name, 'svg')).toSorted()
		);
	});

	it.each(EXAMPLES.map((entry) => [entry.name, entry] as const))(
		'pins %s byte-exactly through the real import path at version %d'.replace(
			'%d',
			String(CANVAS_VERSION)
		),
		(_name, entry) => {
			const raw = committedBytes(entry.name);
			expect(JSON.parse(raw).version).toBe(CANVAS_VERSION);

			const result = parseCanvasImport(raw);
			if (!result.ok) throw new Error(`example refused: ${result.reason}`);
			// The committed file is serializer-canonical: parse → stamp → serialize
			// reproduces its exact bytes (plus the file's trailing newline).
			expect(serializeCanvas(stampIds(result.file)) + '\n').toBe(raw);
			// And the bundled entry is those same bytes, not a drifted copy.
			expect(entry.file).toEqual(result.file);
		}
	);

	it('carries the ratified chooser one-liners, mid-workshop flag on Royalty Distribution', () => {
		expect(EXAMPLES.map((entry) => [entry.name, entry.description])).toEqual([
			['Order Fulfillment', 'Coordinates picking, packing and shipping once an order is paid.'],
			['Notifications', 'Delivers order updates to customers on their preferred channel.'],
			['Appointment Scheduling', 'Books patients into clinic slots and keeps no-shows down.'],
			[
				'Royalty Distribution',
				'Splits streaming revenue among rights holders. Captured mid-workshop.'
			]
		]);
	});
});

describe('the Examples menu (SPEC §10, ticket 023)', () => {
	let component: ReturnType<typeof mount> | null = null;
	let announced: string[] = [];

	function render(): HTMLElement {
		const target = document.createElement('div');
		document.body.append(target);
		component = mount(Chrome, { target });
		flushSync();
		return target;
	}

	function chromeButtonLabeled(el: ParentNode, label: string): HTMLButtonElement {
		const match = [...el.querySelectorAll<HTMLButtonElement>('button')].find(
			(b) => b.textContent?.trim() === label
		);
		if (!match) throw new Error(`no ${label} control in the chrome`);
		return match;
	}

	function menuItems(el: ParentNode): HTMLButtonElement[] {
		return [...el.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')];
	}

	function openDialog(): HTMLDialogElement {
		const open = [...document.querySelectorAll<HTMLDialogElement>('dialog')].find((d) => d.open);
		if (!open) throw new Error('no open dialog');
		return open;
	}

	beforeEach(() => {
		localStorage.clear();
		canvas.replace(blankCanvas());
		announced = [];
		setAnnouncer((message) => announced.push(message));
	});

	afterEach(() => {
		setAnnouncer(null);
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	it('sits right after Import… with menu semantics', () => {
		const el = render();
		const labels = [...el.querySelectorAll('header button')].map((b) => b.textContent?.trim());
		expect(labels.indexOf('Examples')).toBe(labels.indexOf('Import…') + 1);

		const button = chromeButtonLabeled(el, 'Examples');
		expect(button.getAttribute('aria-haspopup')).toBe('menu');
		expect(button.getAttribute('aria-expanded')).toBe('false');
	});

	it('lists the four canvases as two-line entries, name over one-liner', () => {
		const el = render();
		chromeButtonLabeled(el, 'Examples').click();
		flushSync();

		const items = menuItems(el);
		expect(items.map((item) => item.querySelector('span')?.textContent)).toEqual(
			EXAMPLES.map((entry) => entry.name)
		);
		for (const [i, entry] of EXAMPLES.entries()) {
			expect(items[i].textContent).toContain(entry.description);
		}
	});

	it('opens an example clean: replaced document, cleared history, "Example opened"', () => {
		const el = render();
		chromeButtonLabeled(el, 'Examples').click();
		flushSync();
		menuItems(el)[0].click();
		flushSync();

		expect(canvas.doc.name).toBe('Order Fulfillment');
		expect(canvas.unexported).toBe(false);
		expect(canvas.canUndo).toBe(false);
		expect(announced).toEqual(['Example opened']);
		expect(menuItems(el)).toHaveLength(0);
	});

	it('Esc closes the menu and returns focus to the Examples control', () => {
		const el = render();
		const button = chromeButtonLabeled(el, 'Examples');
		button.click();
		flushSync();

		menuItems(el)[0].dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
		);
		flushSync();

		expect(menuItems(el)).toHaveLength(0);
		expect(document.activeElement).toBe(button);
	});

	it('gates unexported changes with the Replace-family dialog; Cancel keeps the canvas', () => {
		const el = render();
		canvas.commit((doc) => {
			doc.name = 'Draft';
		});
		flushSync();

		chromeButtonLabeled(el, 'Examples').click();
		flushSync();
		menuItems(el)[1].click();
		flushSync();

		const gate = openDialog();
		expect(gate.querySelector('h2')?.textContent?.trim()).toBe('Replace "Draft"?');
		expect(gate.textContent?.replace(/\s+/g, ' ')).toContain(
			'Opening an example replaces the canvas and clears undo history.'
		);

		chromeButtonLabeled(gate, 'Cancel').click();
		flushSync();
		expect(canvas.doc.name).toBe('Draft');
		expect(canvas.unexported).toBe(true);
		expect(announced).toEqual([]);
	});

	it('proceeding through the gate replaces the canvas and lands clean', () => {
		const el = render();
		canvas.commit((doc) => {
			doc.name = 'Draft';
		});
		flushSync();

		chromeButtonLabeled(el, 'Examples').click();
		flushSync();
		menuItems(el)[1].click();
		flushSync();
		chromeButtonLabeled(openDialog(), 'Replace').click();
		flushSync();

		expect(canvas.doc.name).toBe('Notifications');
		expect(canvas.unexported).toBe(false);
		expect(canvas.canUndo).toBe(false);
		expect(announced).toEqual(['Example opened']);
	});
});

describe('the ticket-016 rider: chooser copy never reaches artifact bytes', () => {
	afterEach(() => {
		document.head.innerHTML = '';
		document.body.innerHTML = '';
	});

	it('an opened example embeds its committed bytes; the mid-workshop flag stays chrome-only', async () => {
		const royalty = EXAMPLES.find((entry) => entry.name === 'Royalty Distribution');
		if (!royalty) throw new Error('Royalty Distribution missing from the roster');

		const html = artifactDocument(stampIds(royalty.file));
		expect(extractEmbeddedCanvas(html)).toBe(committedBytes(royalty.name).trimEnd());
		expect(html).not.toContain('Captured mid-workshop.');
	});
});
