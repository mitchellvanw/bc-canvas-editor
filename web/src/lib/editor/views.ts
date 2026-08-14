/**
 * The three Views (SPEC §5, §6): the Sheet as it is, the Canvas file's JSON,
 * and the Markdown rendering. One canvas, three ways of looking at it — the
 * app's word is **View**; `digest` is MCP-internal jargon for the Markdown and
 * never reaches a label here (CONTEXT.md).
 *
 * The labels are the three peers as a reader names them, and the middle one is
 * `JSON` rather than `Canvas file`: the Export menu's "Canvas file (.bcc.json)"
 * names a download, and a tab that names a file would promise one. A tab names
 * what you are looking at.
 */

export type ViewKey = 'sheet' | 'json' | 'markdown';

export const VIEWS: { key: ViewKey; label: string }[] = [
	{ key: 'sheet', label: 'Sheet' },
	{ key: 'json', label: 'JSON' },
	{ key: 'markdown', label: 'Markdown' }
];

/**
 * One tab stop for the strip, arrows move and select (§8.3's listbox grammar
 * applied to tabs); Home/End cost nothing on three tabs. The handler rides
 * each tab rather than the tablist — on the container the tablist would want a
 * `tabindex` of its own, which is not the APG pattern.
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
	// Roving tabindex: focus follows selection, so the strip keeps one tab stop.
	const strip = (event.target as HTMLElement)?.closest('[role="tablist"]') ?? null;
	queueMicrotask(() => strip?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus());
}
