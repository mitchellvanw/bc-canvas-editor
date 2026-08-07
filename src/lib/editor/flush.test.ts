// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPendingEdits, registerFlushable, wireUnloadFlush } from '$lib/editor/flush';

function setVisibility(state: DocumentVisibilityState) {
	Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
}

afterEach(() => setVisibility('visible'));

describe('flushPendingEdits', () => {
	it('runs every registered commit', () => {
		const commit = vi.fn();
		const unregister = registerFlushable(commit);
		flushPendingEdits();
		expect(commit).toHaveBeenCalledOnce();
		unregister();
	});

	it('no longer runs a commit after it unregisters', () => {
		const commit = vi.fn();
		registerFlushable(commit)();
		flushPendingEdits();
		expect(commit).not.toHaveBeenCalled();
	});
});

describe('wireUnloadFlush', () => {
	it('flushes when the tab is about to unload', () => {
		const commit = vi.fn();
		const unregister = registerFlushable(commit);
		const teardown = wireUnloadFlush();
		window.dispatchEvent(new Event('beforeunload'));
		expect(commit).toHaveBeenCalledOnce();
		teardown();
		unregister();
	});

	it('flushes when the tab backgrounds, not when it returns', () => {
		const commit = vi.fn();
		const unregister = registerFlushable(commit);
		const teardown = wireUnloadFlush();

		setVisibility('hidden');
		document.dispatchEvent(new Event('visibilitychange'));
		expect(commit).toHaveBeenCalledOnce();

		setVisibility('visible');
		document.dispatchEvent(new Event('visibilitychange'));
		expect(commit).toHaveBeenCalledOnce();

		teardown();
		unregister();
	});

	it('stops flushing after teardown', () => {
		const commit = vi.fn();
		const unregister = registerFlushable(commit);
		wireUnloadFlush()();
		window.dispatchEvent(new Event('beforeunload'));
		setVisibility('hidden');
		document.dispatchEvent(new Event('visibilitychange'));
		expect(commit).not.toHaveBeenCalled();
		unregister();
	});
});
