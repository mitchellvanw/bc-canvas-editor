// @vitest-environment jsdom
/**
 * Markdown as the fourth export (SPEC §1, §3.4, §10; wayfinder ticket 046).
 *
 * Three things here would be easy to get backwards, and one of them costs a
 * user their canvas:
 * - It does **not** clear Unexported changes. §6.1 clears the dirty state only
 *   for forms that can be imported back, and Markdown can't be. Pattern-matching
 *   on "it's an export, so it exports" would let someone export Markdown, see a
 *   clean indicator, close the tab, and lose the canvas.
 * - It carries the one renderer's bytes, through the same normalization the
 *   Markdown View uses (`views.test.ts` pins the pane to that expression), so
 *   the file and the pane cannot say different things.
 * - It sits last in the menu, beside the two images rather than beside the
 *   Canvas file: the menu is the only place a user sees every export side by
 *   side, and the order is where "this one doesn't come back" is said.
 */
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadBlob } from '$lib/artifact/download';
import Chrome from '$lib/chrome/Chrome.svelte';
import { canvas } from '$lib/editor/document.svelte';
import { blankCanvas, stampIds } from '$lib/model/canvas';
import { canvasDigest } from '$lib/model/digest';
import { parseCanvasFile } from '$lib/model/parse';
import { REFERENCE_FILE } from '$lib/model/reference.fixture';
import { toCanvasFile } from '$lib/model/serialize';

vi.mock('$lib/artifact/download', () => ({ downloadBlob: vi.fn() }));

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

describe('the Markdown export (SPEC §10, ticket 046)', () => {
	let component: ReturnType<typeof mount> | null = null;

	function render(): HTMLElement {
		const target = document.createElement('div');
		document.body.append(target);
		component = mount(Chrome, { target });
		flushSync();
		return target;
	}

	function openExportMenu(el: ParentNode): HTMLButtonElement[] {
		const button = [...el.querySelectorAll<HTMLButtonElement>('header button')].find(
			(b) => b.textContent?.trim() === 'Export'
		);
		if (!button) throw new Error('no Export control in the chrome');
		button.click();
		flushSync();
		return [...el.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')];
	}

	function markdownItem(el: ParentNode): HTMLButtonElement {
		const item = openExportMenu(el).at(-1);
		if (!item) throw new Error('no export entries');
		return item;
	}

	async function downloadedText(): Promise<string> {
		const [blob] = vi.mocked(downloadBlob).mock.lastCall ?? [];
		if (!(blob instanceof Blob)) throw new Error('nothing was downloaded');
		return blob.text();
	}

	// A canvas with something in every section, so the digest is worth comparing.
	function reference() {
		const result = parseCanvasFile(REFERENCE_FILE);
		if (!result.ok) throw new Error('reference fixture must parse');
		return stampIds(result.file);
	}

	beforeEach(() => {
		localStorage.clear();
		canvas.replace(reference());
	});

	afterEach(() => {
		vi.clearAllMocks();
		if (component) unmount(component);
		component = null;
		canvas.replace(blankCanvas());
		document.body.innerHTML = '';
	});

	it('is the last entry, below the two images (ticket 062 put SVG fourth)', () => {
		const el = render();
		expect(openExportMenu(el).map((item) => item.textContent?.trim())).toEqual([
			'Canvas file (.bcc.json)',
			'HTML artifact (.bcc.html)',
			'PNG image (2x)',
			'SVG image',
			'Markdown (.bcc.md)'
		]);
	});

	it('downloads the one renderer bytes as <slug>.bcc.md, with the unnamed fallback', async () => {
		const el = render();
		markdownItem(el).click();
		flushSync();

		expect(await downloadedText()).toBe(canvasDigest(toCanvasFile(canvas.doc)));
		expect(vi.mocked(downloadBlob).mock.lastCall?.[0].type).toBe('text/markdown');
		expect(downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'order-fulfillment.bcc.md');

		canvas.commit((doc) => (doc.name = ''));
		flushSync();
		markdownItem(el).click();
		flushSync();
		expect(downloadBlob).toHaveBeenLastCalledWith(expect.any(Blob), 'bounded-context-canvas.bcc.md');
	});

	it('leaves Unexported changes standing — Markdown cannot be imported back (SPEC §6.1)', () => {
		const el = render();
		canvas.commit((doc) => (doc.name = 'Edited, not yet exported'));
		flushSync();
		expect(canvas.unexported).toBe(true);

		markdownItem(el).click();
		flushSync();

		expect(downloadBlob).toHaveBeenCalledOnce();
		expect(canvas.unexported).toBe(true);
		expect(el.textContent).toContain('Unexported changes');
	});

	it('closes the menu, like every other export', () => {
		const el = render();
		markdownItem(el).click();
		flushSync();
		expect(el.querySelectorAll('[role="menuitem"]')).toHaveLength(0);
	});
});
