/**
 * PROTOTYPE (wayfinder ticket 043) — the throwaway half.
 *
 * Enough of the editor for the buffer to be driven against something that
 * behaves like the real one: one document, a snapshot undo stack, an export
 * baseline, an autosave slot, the multi-tab notice. Modelled on
 * `src/lib/editor/document.svelte.ts` and `multi-tab.svelte.ts` — same commit
 * pipeline, same last-write-wins, deliberately not the same code, because the
 * point is to *see* the interaction and not to test the real class.
 *
 * The real parse/serialize are the real ones (bundled in by build.mjs), so
 * migrations, refusals and byte comparisons here are the app's own.
 */

import { canvasDigest } from '$lib/model/digest';
import { parseCanvasImport } from '$lib/model/parse';
import { serializeCanvasFile } from '$lib/model/serialize';
import * as buffer from './json-buffer.js';

export const parse = parseCanvasImport;
export const serialize = serializeCanvasFile;
export const digest = canvasDigest;

export function initial(file) {
	return {
		doc: file,
		past: [],
		future: [],
		exported: serialize(file),
		slot: serialize(file), // the `bcc.autosave` slot, last write wins
		notice: false, // "open in another tab", persistent once seen
		json: buffer.TRACKING,
		view: 'sheet',
		log: []
	};
}

/** The commit pipeline: snapshot, mutate, autosave, re-measure. */
function commit(world, doc) {
	return {
		...world,
		doc,
		past: [...world.past, world.doc],
		future: [],
		slot: serialize(doc)
	};
}

function swap(world, doc, past, future) {
	return { ...world, doc, past, future, slot: serialize(doc) };
}

/** The session boundary: a different canvas, no history, buffer discarded. */
function boundary(world, doc) {
	return {
		...world,
		doc,
		past: [],
		future: [],
		exported: serialize(doc),
		slot: serialize(doc),
		json: buffer.boundary()
	};
}

const say = (world, line) => ({ ...world, log: [...world.log, line] });

export const docBytes = (world) => serialize(world.doc);
export const unexported = (world) => serialize(world.doc) !== world.exported;
export const boxText = (world) => buffer.shown(world.json, docBytes(world));
export const marker = (world) => buffer.unapplied(world.json);

export const ACTIONS = {
	/** Look at a View. Pure chrome — it never touches the buffer. */
	view: (world, name) => say({ ...world, view: name }, `Switched to the ${name} view.`),

	/** A keystroke in the JSON box. */
	type: (world, text) => {
		const json = buffer.edit(world.json, text, docBytes(world));
		return say(
			{ ...world, json },
			json.text === null
				? 'Typed the box back to exactly the canvas — the box is following the canvas again.'
				: 'Typed in the JSON box.'
		);
	},

	apply: (world) => {
		const outcome = buffer.apply(world.json, docBytes(world), parse, serialize);
		const next = { ...world, json: outcome.state };
		if (outcome.kind === 'refused') {
			return say(next, `Apply refused: ${outcome.reason.reason}.`);
		}
		if (outcome.kind === 'settled') {
			return say(next, 'Apply changed nothing — no undo step was added.');
		}
		return say(commit(next, outcome.file), 'Applied — one commit, one undo step.');
	},

	/** Any edit on the sheet: one commit, same pipeline. */
	sheet: (world, mutate) => {
		const doc = mutate(structuredClone(world.doc));
		return say(commit(world, doc), 'Edited the canvas on the sheet.');
	},

	undo: (world) => {
		const target = world.past.at(-1);
		if (!target) return say(world, 'Nothing to undo.');
		return say(
			swap(world, target, world.past.slice(0, -1), [...world.future, world.doc]),
			'Undid the last change to the canvas.'
		);
	},

	redo: (world) => {
		const target = world.future.at(-1);
		if (!target) return say(world, 'Nothing to redo.');
		return say(
			swap(world, target, [...world.past, world.doc], world.future.slice(0, -1)),
			'Redid the last change to the canvas.'
		);
	},

	/** Import / New / an example: a different canvas in the same session. */
	open: (world, file, what) => say(boundary(world, file), `Opened ${what}.`),

	export: (world) =>
		say({ ...world, exported: serialize(world.doc) }, 'Exported the Canvas file.'),

	/**
	 * Another tab writes. It reaches this tab as a `storage` event, which the
	 * real app answers with the notice and nothing else — the document is not
	 * reloaded. Last write wins is settled at the slot, not on screen.
	 */
	otherTab: (world, file) =>
		say(
			{ ...world, notice: true, slot: serialize(file) },
			'Another tab saved its canvas over the shared slot.'
		),

	/** beforeunload / backgrounding: mid-edit fields commit. The buffer is not one. */
	flush: (world) => say(world, 'Flushed mid-edit fields (the JSON box registers none).'),

	/** Reload: the slot is restored, everything else in memory is gone. */
	reload: (world) => {
		const result = parse(world.slot);
		const restored = initial(result.ok ? result.file : world.doc);
		return say({ ...restored, log: world.log }, 'Reloaded the page.');
	}
};
