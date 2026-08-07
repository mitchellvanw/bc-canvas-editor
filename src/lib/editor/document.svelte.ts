/**
 * The one runtime document every ticket edits (SPEC §6.1), plus the commit
 * pipeline: a commit mutates the document and immediately autosaves. Undo
 * history (ticket 08) will hook in here — one commit is one history entry.
 * The beforeunload/visibilitychange flush of a mid-edit field (SPEC §6.1)
 * belongs to ticket 11 (multi-tab & unload flush).
 */

import { loadAutosave, saveAutosave } from '$lib/model/autosave';
import { blankCanvas, type CanvasDoc } from '$lib/model/canvas';
import { serializeCanvas } from '$lib/model/serialize';

class CanvasEditor {
	doc: CanvasDoc = $state(blankCanvas());

	/**
	 * The canvas has changed since it last left the browser in a re-importable
	 * form (SPEC §6.1). Set by commit; cleared by Canvas-file export and by the
	 * session boundary (import/new). Ticket 09 extends clearing to the HTML
	 * artifact; PNG export never clears it.
	 */
	unexported = $state(false);

	/** Restore the autosave slot on app load; keeps the blank canvas if empty. */
	restore(): void {
		const saved = loadAutosave();
		if (saved) this.doc = saved;
	}

	/** One commit: apply a mutation, then autosave. The unit of undo and autosave. */
	commit(mutate: (doc: CanvasDoc) => void): void {
		mutate(this.doc);
		this.unexported = true;
		saveAutosave(this.doc);
	}

	/** Serialize for a re-importable export; exporting clears unexported changes. */
	exportCanvasFile(): string {
		this.unexported = false;
		return serializeCanvas(this.doc);
	}

	/**
	 * The session boundary (SPEC §6.1): import or new replaces the document and
	 * clears undo history — not an undoable edit. (History arrives in ticket 08;
	 * clearing it lands here.)
	 */
	replace(doc: CanvasDoc): void {
		this.doc = doc;
		this.unexported = false;
		saveAutosave(this.doc);
	}
}

export const canvas = new CanvasEditor();
