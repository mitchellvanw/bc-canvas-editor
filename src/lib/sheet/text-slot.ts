/**
 * The seam between the shared read-only sheet and the editor: CanvasSheet
 * describes each free-text location as a TextSlot and offers it to an optional
 * `field` snippet. Without the snippet the sheet renders the plain value — the
 * artifact path (SPEC §9); with it the editor renders a contenteditable field
 * in place (SPEC §6). The sheet itself never carries editing chrome.
 */

export interface TextSlot {
	/** The committed value this location renders. */
	value: string;
	/** The field's identity, its accessible name — never its content (SPEC §8.5). */
	label: string;
	/** Prose fields commit on blur only; single-line fields also on Enter (SPEC §6). */
	multiline?: boolean;
	/** Teaching placeholder for the empty field — SPEC §10 copy, verbatim. */
	placeholder?: string;
	/** Set on fields inside the ink title block, where editing chrome inverts. */
	tone?: 'ink';
	/** Write a committed value back into the document. */
	set(value: string): void;
}
