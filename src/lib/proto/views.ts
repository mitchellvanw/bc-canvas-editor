/**
 * PROTOTYPE — throwaway (ticket 042, view-switcher-prototype).
 *
 * The bits every variant shares: the three View keys, the tablist keyboard
 * behaviour SPEC §8.3 implies, and the two text Views' real bytes. What the
 * variants must NOT share is the strip's layout — that is the question.
 */

import { canvas } from '$lib/editor/document.svelte';
import { canvasDigest } from '$lib/model/digest';
import { serializeCanvas, toCanvasFile } from '$lib/model/serialize';

export type ViewKey = 'sheet' | 'json' | 'markdown';

export const VIEWS: { key: ViewKey; label: string }[] = [
	{ key: 'sheet', label: 'Sheet' },
	{ key: 'json', label: 'JSON' },
	{ key: 'markdown', label: 'Markdown' }
];

/** Real export bytes — exactly what `.bcc.json` carries. */
export function jsonBytes(): string {
	return serializeCanvas(canvas.doc);
}

/** Real digest bytes — exactly what `bcc_read_canvas` returns. */
export function markdownBytes(): string {
	return canvasDigest(toCanvasFile(canvas.doc));
}

/**
 * One tab stop for the set, arrows move and select (§8.3's listbox grammar,
 * applied to tabs). Home/End included because a three-tab strip costs nothing.
 */
export function tablistKeydown(
	event: KeyboardEvent,
	current: ViewKey,
	select: (key: ViewKey) => void
): void {
	const index = VIEWS.findIndex((view) => view.key === current);
	let next = -1;
	if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % VIEWS.length;
	if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
		next = (index - 1 + VIEWS.length) % VIEWS.length;
	if (event.key === 'Home') next = 0;
	if (event.key === 'End') next = VIEWS.length - 1;
	if (next < 0) return;
	event.preventDefault();
	select(VIEWS[next].key);
	// Roving tabindex: focus follows selection, one tab stop for the strip.
	// The handler rides each tab (the APG pattern) rather than the tablist,
	// which would want a tabindex of its own.
	const strip = (event.target as HTMLElement)?.closest('[role="tablist"]') ?? null;
	queueMicrotask(() => strip?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus());
}
