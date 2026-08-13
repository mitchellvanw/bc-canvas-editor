/**
 * Putting a file in place atomically.
 *
 * Atomic because git is the conflict guard here, not a lock: the write lands a
 * temp file beside the target and renames it over, so a canvas is either the
 * old bytes or the new ones and never a half-written document the app would
 * refuse to open. That matters more now than when the server was the only
 * writer — `bcc fmt` may rewrite every canvas under a root in one pass, and an
 * editor with the file open watches each one land.
 *
 * The bytes themselves are `canvasBytes` in `$lib/model/serialize`: the
 * serializer plus SPEC §3.5's trailing newline, which is a fact about the file
 * format rather than about the filesystem.
 */

import { renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

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
