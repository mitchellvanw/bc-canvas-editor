// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { announce, setAnnouncer } from '$lib/a11y/announce';

afterEach(() => setAnnouncer(null));

describe('announce', () => {
	it('is a silent no-op while no live region is registered', () => {
		expect(() => announce('Collaborator removed')).not.toThrow();
	});

	it('delivers the message to the registered live region', () => {
		const sink = vi.fn();
		setAnnouncer(sink);
		announce('Trait added');
		expect(sink).toHaveBeenCalledExactlyOnceWith('Trait added');
	});

	it('goes silent again once the live region unregisters', () => {
		const sink = vi.fn();
		setAnnouncer(sink);
		setAnnouncer(null);
		announce('Moved up');
		expect(sink).not.toHaveBeenCalled();
	});
});
