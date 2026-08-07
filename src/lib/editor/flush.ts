/**
 * Unload flush (SPEC §6.1): closing or backgrounding the tab mid-edit never
 * loses the field being typed. Every editable field registers its commit
 * here; the beforeunload/visibilitychange wiring flushes them all before the
 * page goes away, and each commit feeds the ordinary pipeline — so the
 * autosave slot is current the moment the tab dies. Committing a pristine
 * field is a no-op, so a flush only ever produces the one mid-edit commit.
 */

const pending = new Set<() => void>();

/** Register a field's commit for the unload flush; returns its unregister. */
export function registerFlushable(commit: () => void): () => void {
	pending.add(commit);
	return () => pending.delete(commit);
}

/** Commit every mid-edit field, without moving focus or blurring anything. */
export function flushPendingEdits(): void {
	// A commit can re-render and swap fields under us; iterate a copy.
	for (const commit of [...pending]) commit();
}

/**
 * Flush on `beforeunload` and on backgrounding (`visibilitychange` → hidden),
 * per SPEC §6.1. Returning to the tab flushes nothing — the caret and any
 * still-uncommitted text are exactly where the user left them.
 */
export function wireUnloadFlush(): () => void {
	const onBeforeUnload = () => flushPendingEdits();
	const onVisibilityChange = () => {
		if (document.visibilityState === 'hidden') flushPendingEdits();
	};
	window.addEventListener('beforeunload', onBeforeUnload);
	document.addEventListener('visibilitychange', onVisibilityChange);
	return () => {
		window.removeEventListener('beforeunload', onBeforeUnload);
		document.removeEventListener('visibilitychange', onVisibilityChange);
	};
}
