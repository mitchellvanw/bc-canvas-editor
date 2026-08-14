/**
 * The JSON View's buffer (SPEC §6.1) — the one piece of state in this app
 * allowed to disagree with the document. Full decision record:
 * `wayfinder/tickets/043-json-buffer-prototype.md`.
 *
 * Two states and one invariant:
 *
 *   Following  (text === null)  the box shows the document's export bytes
 *   Proposing  (text !== null)  the box shows the user's text, which — by the
 *                               invariant — is not the document's bytes
 *
 * The invariant is what makes the unapplied marker free: it is not a flag
 * anyone maintains, it *is* `text !== null`. Typing an edit and typing it back
 * out returns to Following rather than holding a buffer that agrees with the
 * document.
 *
 * It lives out here rather than in the View because the View unmounts on every
 * tab switch and the buffer must not. It is never persisted: the `bcc.autosave`
 * slot is the Canvas file byte-for-byte and does not grow app-UI state, so a
 * reload discards a proposal — as does the session boundary (import, new, load
 * example), which is the only other thing that does. The unload flush cannot
 * reach it by construction: `registerFlushable` is opt-in per field and the box
 * is a plain `<textarea>` using no `editableText` action.
 *
 * The document is not imported here — the boundary calls in from
 * `document.svelte.ts`, and the View passes the document's bytes to every
 * method that needs them.
 */

import type { CanvasFile } from '$lib/model/canvas';
import { parseCanvasFile, type ParseResult } from '$lib/model/parse';
import { serializeCanvasFile } from '$lib/model/serialize';

/** Why Apply refused: the parser's own two failure classes, unchanged. */
export type Refusal = Extract<ParseResult, { ok: false }>;

/**
 * What Apply decided. It decides; the caller commits — so the buffer never
 * touches the document, and the boundary can reach in without a cycle.
 */
export type ApplyOutcome =
	| { kind: 'settled' }
	| { kind: 'replace'; file: CanvasFile; migratedFrom?: number }
	| { kind: 'refused'; refusal: Refusal };

class JsonBuffer {
	/** The proposal, or null while the box follows the canvas. */
	#text: string | null = $state(null);

	/**
	 * The document's bytes when this proposal was born — fixed once, never
	 * refreshed, so "the canvas has changed since you started editing this text"
	 * stays literally true while you carry on typing. It is not a rebase point:
	 * there is no merging here and a proposal never goes stale, because the text
	 * is always exactly what the canvas becomes if you press Apply.
	 */
	#basis: string | null = null;

	/** The refusal on screen, held on the buffer so it survives a view switch. */
	#refusal: Refusal | null = $state(null);

	/** What the box renders. */
	shown(docBytes: string): string {
		return this.#text ?? docBytes;
	}

	/** The marker on the JSON segment, and the whole of what it means. */
	get unapplied(): boolean {
		return this.#text !== null;
	}

	get refusal(): Refusal | null {
		return this.#refusal;
	}

	/**
	 * A keystroke in the box. Text identical to the document's bytes is not a
	 * proposal. A refusal is about text that stops existing the moment that text
	 * changes, so editing clears it.
	 */
	edit(next: string, docBytes: string): void {
		this.#refusal = null;
		if (next === docBytes) {
			this.reset();
			return;
		}
		if (this.#text === null) this.#basis = docBytes;
		this.#text = next;
	}

	/**
	 * The canvas has changed since this proposal was written, so Apply will
	 * replace work that is not in the box. Not an error and not a block — the
	 * commit is one undo step either way; it is the thing the View says out loud
	 * before the button is pressed, because nothing else on screen would.
	 */
	moved(docBytes: string): boolean {
		return this.#text !== null && this.#basis !== docBytes;
	}

	/**
	 * Apply. The no-op test compares the *parsed* result's bytes, not the raw
	 * text: text differing only in whitespace or key order parses to the document
	 * we already have, and landing that in history would be an undo step that
	 * undoes nothing (the pickers' rule, applied to a whole document).
	 *
	 * Success always returns to Following, whether or not it commits — which is
	 * how a migration shows itself (v1 text in, v2 bytes back) and how
	 * normalization shows itself.
	 */
	apply(docBytes: string): ApplyOutcome {
		if (this.#text === null) {
			this.reset();
			return { kind: 'settled' };
		}

		const result = parseCanvasFile(this.#text);
		if (!result.ok) {
			this.#refusal = result;
			return { kind: 'refused', refusal: result };
		}

		this.reset();
		if (serializeCanvasFile(result.file) === docBytes) return { kind: 'settled' };
		return { kind: 'replace', file: result.file, migratedFrom: result.migratedFrom };
	}

	/**
	 * Back to Following. The session boundary (import, new, load example) calls
	 * this: a proposal against *this* session's canvas is not a document change
	 * to hold text against, and the boundary already discards the whole undo
	 * history.
	 */
	reset(): void {
		this.#text = null;
		this.#basis = null;
		this.#refusal = null;
	}
}

export const jsonBuffer = new JsonBuffer();
