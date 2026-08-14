/**
 * The keyboard grammar both popover lists share (SPEC §8.3): arrows move the
 * active row, Home/End jump, type-ahead accumulates a short-lived prefix and
 * jumps to the next matching row, Enter or Space activates, Esc cancels. What
 * activation means — pick-and-close for the listboxes, toggle-and-stay for the
 * trait checklist — and where focus lives stays with the caller; this module
 * only turns keydowns into active-row moves and callbacks.
 */

export interface ListNavConfig {
	/** The rows' labels in listed order — the type-ahead haystack. */
	labels(): string[];
	active(): number;
	setActive(index: number): void;
	/** Enter or Space on the active row. */
	activate(index: number): void;
	/** Esc with focus in the list. */
	cancel(): void;
}

/** One keydown handler per popover; each closes over its own type-ahead buffer. */
export function listNavigation(config: ListNavConfig): (event: KeyboardEvent) => void {
	let buffer = '';
	let bufferTimer: ReturnType<typeof setTimeout> | undefined;

	function typeAhead(char: string) {
		clearTimeout(bufferTimer);
		bufferTimer = setTimeout(() => (buffer = ''), 500);
		const fresh = buffer === '';
		buffer += char.toLowerCase();
		const labels = config.labels();
		for (let step = 0; step < labels.length; step++) {
			const index = (config.active() + (fresh ? 1 : 0) + step) % labels.length;
			if (labels[index].toLowerCase().startsWith(buffer)) {
				config.setActive(index);
				return;
			}
		}
	}

	return (event: KeyboardEvent) => {
		const last = config.labels().length - 1;
		if (event.key === 'ArrowDown') {
			config.setActive(Math.min(config.active() + 1, last));
		} else if (event.key === 'ArrowUp') {
			config.setActive(Math.max(config.active() - 1, 0));
		} else if (event.key === 'Home') {
			config.setActive(0);
		} else if (event.key === 'End') {
			config.setActive(last);
		} else if (event.key === 'Enter' || event.key === ' ') {
			config.activate(config.active());
		} else if (event.key === 'Escape') {
			config.cancel();
		} else if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
			typeAhead(event.key);
		} else {
			return;
		}
		event.preventDefault();
	};
}
