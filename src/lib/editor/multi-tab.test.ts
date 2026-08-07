// @vitest-environment jsdom
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setAnnouncer } from '$lib/a11y/announce';
import Chrome from '$lib/chrome/Chrome.svelte';
import { MULTI_TAB_NOTICE, multiTab, MultiTabMonitor, PRESENCE_KEY } from '$lib/editor/multi-tab.svelte';
import { AUTOSAVE_KEY } from '$lib/model/autosave';

function fakeStorage(): Storage {
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

/** Simulate another tab's localStorage write reaching this tab. */
function otherTabWrites(key: string, newValue: string) {
	window.dispatchEvent(new StorageEvent('storage', { key, newValue }));
}

function hello() {
	return JSON.stringify({ type: 'hello', nonce: 'other-tab' });
}

let storage: Storage;
let teardown: () => void;
let monitor: MultiTabMonitor;

beforeEach(() => {
	storage = fakeStorage();
	monitor = new MultiTabMonitor();
	teardown = monitor.watch(storage);
});

afterEach(() => {
	teardown();
	setAnnouncer(null);
});

describe('MultiTabMonitor', () => {
	it('starts with no other tab detected and says hello on the presence key', () => {
		expect(monitor.detected).toBe(false);
		const presence = storage.getItem(PRESENCE_KEY);
		expect(presence).not.toBeNull();
		expect(JSON.parse(presence!).type).toBe('hello');
	});

	it('detects another tab greeting us and replies so that tab hears us too', () => {
		otherTabWrites(PRESENCE_KEY, hello());
		expect(monitor.detected).toBe(true);
		expect(JSON.parse(storage.getItem(PRESENCE_KEY)!).type).toBe('reply');
	});

	it('detects a reply without replying again (no reply loop)', () => {
		const beforeReply = storage.getItem(PRESENCE_KEY);
		otherTabWrites(PRESENCE_KEY, JSON.stringify({ type: 'reply', nonce: 'other-tab' }));
		expect(monitor.detected).toBe(true);
		expect(storage.getItem(PRESENCE_KEY)).toBe(beforeReply);
	});

	it("detects another tab's autosave write", () => {
		otherTabWrites(AUTOSAVE_KEY, '{"name":"Order Fulfillment"}');
		expect(monitor.detected).toBe(true);
	});

	it('ignores storage traffic on unrelated keys and malformed presence values', () => {
		otherTabWrites('some-other-app', 'x');
		otherTabWrites(PRESENCE_KEY, 'not json');
		expect(monitor.detected).toBe(false);
	});

	it('announces the notice politely, once, when it first appears', () => {
		const sink = vi.fn();
		setAnnouncer(sink);
		otherTabWrites(PRESENCE_KEY, hello());
		otherTabWrites(AUTOSAVE_KEY, '{}');
		otherTabWrites(PRESENCE_KEY, hello());
		expect(sink).toHaveBeenCalledExactlyOnceWith(MULTI_TAB_NOTICE);
	});

	it('stays detected once seen — the notice is persistent, not a toast', () => {
		otherTabWrites(PRESENCE_KEY, hello());
		expect(monitor.detected).toBe(true);
		otherTabWrites(PRESENCE_KEY, hello());
		expect(monitor.detected).toBe(true);
	});

	it('stops listening after teardown', () => {
		teardown();
		otherTabWrites(PRESENCE_KEY, hello());
		expect(monitor.detected).toBe(false);
		teardown = () => {};
	});

	it('carries the SPEC §10 wording verbatim', () => {
		expect(MULTI_TAB_NOTICE).toBe(
			'This canvas is open in another tab. Whichever tab edits last overwrites the other — close one of them.'
		);
	});
});

describe('multi-tab notice banner', () => {
	it('rests hidden, then persists in the chrome with the SPEC wording once another tab is seen', () => {
		const target = document.createElement('div');
		document.body.append(target);
		const component = mount(Chrome, { target });
		expect(target.textContent).not.toContain('open in another tab');

		// The banner rides the app-wide singleton, fed through the same
		// storage-event path the unit tests above exercise per-instance.
		const stop = multiTab.watch(fakeStorage());
		otherTabWrites(PRESENCE_KEY, hello());
		flushSync();

		const note = target.querySelector('[role="note"]');
		expect(note?.textContent?.replace(/\s+/g, ' ').trim()).toBe(MULTI_TAB_NOTICE);

		stop();
		unmount(component);
		target.remove();
	});
});
