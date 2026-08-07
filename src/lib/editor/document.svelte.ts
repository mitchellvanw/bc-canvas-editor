/**
 * The one runtime document every ticket edits (SPEC §6.1), plus the commit
 * pipeline: a commit mutates the document and immediately autosaves. Undo
 * history (ticket 08) will hook in here — one commit is one history entry.
 * The beforeunload/visibilitychange flush of a mid-edit field (SPEC §6.1)
 * belongs to ticket 11 (multi-tab & unload flush).
 */

import { loadAutosave, saveAutosave } from '$lib/model/autosave';
import { blankCanvas, type CanvasDoc } from '$lib/model/canvas';

class CanvasEditor {
	doc: CanvasDoc = $state(blankCanvas());

	/** Restore the autosave slot on app load; keeps the blank canvas if empty. */
	restore(): void {
		const saved = loadAutosave();
		if (saved) this.doc = saved;
	}

	/** One commit: apply a mutation, then autosave. The unit of undo and autosave. */
	commit(mutate: (doc: CanvasDoc) => void): void {
		mutate(this.doc);
		saveAutosave(this.doc);
	}
}

export const canvas = new CanvasEditor();
