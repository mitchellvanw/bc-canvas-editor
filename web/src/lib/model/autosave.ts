/**
 * localStorage autosave safety net (SPEC §6.1): the serialized Canvas file is
 * written to a single fixed key on every commit; on load the slot is restored
 * if present, else the caller falls back to a blank canvas. The slot normally
 * holds what this serializer wrote — but across a deploy it holds what the
 * *previous* version's serializer wrote, so restore reads through the one
 * Canvas-file parser first, migrations included, before falling back to a
 * lenient merge for slots the parser refuses.
 */

import { blankCanvas, stampIds, type CanvasDoc, type CanvasFile } from '$lib/model/canvas';
import { parseCanvasFile } from '$lib/model/parse';
import { serializeCanvas, toCanvasFile } from '$lib/model/serialize';

export const AUTOSAVE_KEY = 'bcc.autosave';

export function saveAutosave(doc: CanvasDoc, storage: Storage = localStorage): void {
	const bytes = serializeCanvas(doc);
	try {
		storage.setItem(AUTOSAVE_KEY, bytes);
	} catch {
		// Quota exhaustion or blocked storage must not fail the commit this save
		// rides on: the slot is only the safety net, the Canvas file is what
		// counts as durable (SPEC §6.1).
	}
}

export function loadAutosave(storage: Storage = localStorage): CanvasDoc | null {
	const slot = storage.getItem(AUTOSAVE_KEY);
	if (slot === null) return null;

	// The common case, including a slot written before a version bump: the
	// parser validates the shape and runs the ordered migrations.
	const parsed = parseCanvasFile(slot);
	if (parsed.ok) return stampIds(parsed.file);

	let raw: unknown;
	try {
		raw = JSON.parse(slot);
	} catch {
		return null;
	}
	if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;

	// A slot this serializer didn't write (hand-edited, another app's key) can
	// be partial or hold sections of the wrong shape; missing keys fill from
	// the blank shape, and restoring must fall back, never crash.
	try {
		const file = { ...toCanvasFile(blankCanvas()), ...(raw as Partial<CanvasFile>) };
		return stampIds(file);
	} catch {
		return null;
	}
}
