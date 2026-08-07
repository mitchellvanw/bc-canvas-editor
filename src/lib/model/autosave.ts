/**
 * localStorage autosave safety net (SPEC §6.1): the serialized Canvas file is
 * written to a single fixed key on every commit; on load the slot is restored
 * if present, else the caller falls back to a blank canvas. Full import
 * validation and migrations belong to the Canvas-file importer, not here —
 * this slot only ever holds what the serializer wrote.
 */

import { blankCanvas, stampIds, type CanvasDoc, type CanvasFile } from '$lib/model/canvas';
import { serializeCanvas, toCanvasFile } from '$lib/model/serialize';

export const AUTOSAVE_KEY = 'bcc.autosave';

export function saveAutosave(doc: CanvasDoc, storage: Storage = localStorage): void {
	storage.setItem(AUTOSAVE_KEY, serializeCanvas(doc));
}

export function loadAutosave(storage: Storage = localStorage): CanvasDoc | null {
	const slot = storage.getItem(AUTOSAVE_KEY);
	if (slot === null) return null;

	let parsed: unknown;
	try {
		parsed = JSON.parse(slot);
	} catch {
		return null;
	}
	if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;

	// A slot this serializer didn't write (hand-edited, another app's key) can
	// hold sections of the wrong shape; restoring must fall back, never crash.
	try {
		const file = { ...toCanvasFile(blankCanvas()), ...(parsed as Partial<CanvasFile>) };
		return stampIds(file);
	} catch {
		return null;
	}
}
