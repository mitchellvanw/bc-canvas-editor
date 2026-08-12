/**
 * The one runtime document every ticket edits (SPEC §6.1), plus the commit
 * pipeline: a commit snapshots the document into undo history, mutates it,
 * and immediately autosaves — one commit is one history entry. Undo/redo
 * swaps the whole document and reports which sheet region changed so the
 * editor can reveal it. The beforeunload/visibilitychange flush of a
 * mid-edit field (SPEC §6.1) lives in flush.ts and feeds this same pipeline.
 */

import { loadAutosave, saveAutosave } from '$lib/model/autosave';
import { blankCanvas, type CanvasDoc } from '$lib/model/canvas';
import { serializeCanvas } from '$lib/model/serialize';
import { jsonBuffer } from './json-buffer.svelte';
import { changedRegion, type Region } from './regions';

class CanvasEditor {
	doc: CanvasDoc = $state(blankCanvas());

	/**
	 * Single linear history of full-document snapshots (SPEC §6.1), uncapped
	 * within the session. Snapshots are plain deep clones — never aliased by
	 * the live document — so ephemeral ids survive undo and keyed rendering
	 * stays stable. $state.raw: the stacks only ever swap wholesale.
	 */
	#past: CanvasDoc[] = $state.raw([]);
	#future: CanvasDoc[] = $state.raw([]);

	readonly canUndo = $derived(this.#past.length > 0);
	readonly canRedo = $derived(this.#future.length > 0);

	/**
	 * The canvas has changed since it last left the browser in a re-importable
	 * form (SPEC §6.1): its serialization differs from the export baseline.
	 * Measured byte-exactly on every change, so undoing back to the exported
	 * state runs clean again. Cleared by Canvas-file export, HTML-artifact
	 * export, and the session boundary (import/new); PNG export never clears it.
	 */
	unexported = $state(false);

	/**
	 * Serialization of the canvas as it last left (or entered) the browser in
	 * a re-importable form — what `unexported` measures against. A reload
	 * baselines on the restored autosave: the flag is session-scoped.
	 */
	#exported = serializeCanvas(this.doc);

	/** Restore the autosave slot on app load; keeps the blank canvas if empty. */
	restore(): void {
		const saved = loadAutosave();
		if (saved) this.doc = saved;
		this.#exported = serializeCanvas(this.doc);
	}

	/** One commit: snapshot, apply a mutation, autosave. The unit of undo and autosave. */
	commit(mutate: (doc: CanvasDoc) => void): void {
		this.#past = [...this.#past, this.#snapshot()];
		this.#future = [];
		mutate(this.doc);
		this.#settle();
	}

	/**
	 * Replace the whole document as one commit — the JSON View's Apply (SPEC
	 * §6). Unlike the session boundary this is an ordinary edit: one history
	 * entry, undone in one step, autosaved like any other.
	 */
	commitReplace(doc: CanvasDoc): void {
		this.#past = [...this.#past, this.#snapshot()];
		this.#future = [];
		this.doc = doc;
		this.#settle();
	}

	/** Undo the last commit; returns the sheet region that changed, if any. */
	undo(): Region | null {
		const target = this.#past.at(-1);
		if (!target) return null;
		this.#past = this.#past.slice(0, -1);
		this.#future = [...this.#future, this.#snapshot()];
		return this.#swap(target);
	}

	/** Redo the last undone commit; returns the sheet region that changed, if any. */
	redo(): Region | null {
		const target = this.#future.at(-1);
		if (!target) return null;
		this.#future = this.#future.slice(0, -1);
		this.#past = [...this.#past, this.#snapshot()];
		return this.#swap(target);
	}

	#snapshot(): CanvasDoc {
		return $state.snapshot(this.doc);
	}

	/** Swap a snapshot in as the live document, feeding the commit pipeline. */
	#swap(target: CanvasDoc): Region | null {
		const region = changedRegion(this.doc, target);
		this.doc = target;
		this.#settle();
		return region;
	}

	/** After any document change: autosave, re-measure against the export baseline. */
	#settle(): void {
		this.unexported = serializeCanvas(this.doc) !== this.#exported;
		saveAutosave(this.doc);
	}

	/**
	 * The canvas just left the browser in a re-importable form — the HTML
	 * artifact embeds exactly these bytes (the serializer is deterministic), so
	 * its export rebaselines here too, after the build has succeeded.
	 */
	markExported(): void {
		this.#exported = serializeCanvas(this.doc);
		this.unexported = false;
	}

	/** Serialize for a re-importable export; exporting clears unexported changes. */
	exportCanvasFile(): string {
		this.markExported();
		return this.#exported;
	}

	/**
	 * The session boundary (SPEC §6.1): import or new replaces the document and
	 * clears undo history — not an undoable edit. It is also the one thing that
	 * discards an unapplied JSON proposal: text written against a canvas that is
	 * no longer open goes the way of that canvas's history. The document moving
	 * *under* a proposal never touches it — only crossing the boundary does.
	 */
	replace(doc: CanvasDoc): void {
		jsonBuffer.reset();
		this.doc = doc;
		this.#past = [];
		this.#future = [];
		this.#exported = serializeCanvas(this.doc);
		this.unexported = false;
		saveAutosave(this.doc);
	}
}

export const canvas = new CanvasEditor();
