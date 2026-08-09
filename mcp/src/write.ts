/**
 * Writing a canvas file: canonical bytes, put in place atomically.
 *
 * The bytes are the serializer's output plus the trailing newline the
 * committed `examples/*.bcc.json` carry (SPEC §3.5) — these files are meant to
 * be read in a diff, and a file without a final newline is a file every tool
 * downstream complains about.
 *
 * Atomic because git is the conflict guard here, not a lock: the server writes
 * a temp file beside the target and renames it over, so a canvas is either the
 * old bytes or the new ones and never a half-written document the app would
 * refuse to open.
 */

import { renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { CanvasFile } from '$lib/model/canvas';
import { serializeCanvasFile } from '$lib/model/serialize';

/** What a `.bcc.json` looks like on disk, byte for byte. */
export function canvasBytes(file: CanvasFile): string {
	return `${serializeCanvasFile(file)}\n`;
}

let sequence = 0;

/**
 * Replace `path` with `text` in one step. The temp file is a sibling so the
 * rename stays within one filesystem, where it is atomic.
 */
export function writeAtomic(path: string, text: string): void {
	const temporary = join(dirname(path), `.${process.pid}-${sequence++}.bcc-tmp`);
	try {
		writeFileSync(temporary, text, 'utf8');
		renameSync(temporary, path);
	} catch (error) {
		rmSync(temporary, { force: true });
		throw error;
	}
}
