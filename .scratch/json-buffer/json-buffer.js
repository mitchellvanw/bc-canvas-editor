/**
 * PROTOTYPE (wayfinder ticket 043) — the liftable half.
 *
 * The JSON View's buffer: the one piece of mutable state in this app that is
 * allowed to disagree with the document. Everything here is pure — no DOM, no
 * document, no editor. The page around it is throwaway; this module is the
 * thing that lifts into `src/lib/editor/` if it survives being driven.
 *
 * The model is two states and one invariant:
 *
 *   Tracking  (text === null)  the box shows the document's export bytes
 *   Proposing (text !== null)  the box shows the user's text, which — by the
 *                              invariant — is not the document's bytes
 *
 * The invariant is what makes the unapplied marker free: it is not a flag
 * anyone has to maintain, it is `text !== null`. Editing back to the
 * document's own bytes drops the buffer rather than holding a buffer that
 * agrees with the document.
 *
 * There is deliberately no *basis* — no memory of which document the text was
 * drafted against, no staleness. Apply replaces the whole document, so a
 * buffer is never a patch that can rot; it is always exactly "what the canvas
 * becomes if you press Apply", whatever the canvas is right now.
 */

/** Tracking: nothing proposed, no refusal on screen. */
export const TRACKING = { text: null, error: null };

/** What the box renders. */
export function shown(state, docBytes) {
	return state.text ?? docBytes;
}

/** The marker on the JSON segment, and the whole of what it means. */
export function unapplied(state) {
	return state.text !== null;
}

/**
 * A keystroke in the box. Text identical to the document's bytes is not a
 * proposal — typing an edit and typing it back out again returns to Tracking,
 * and the box resumes following the document.
 *
 * A refusal is about text that no longer exists the moment that text changes,
 * so editing clears it.
 */
export function edit(state, next, docBytes) {
	return { text: next === docBytes ? null : next, error: null };
}

/**
 * Apply. Pure: it decides, the caller commits.
 *
 *   { kind: 'settled' }               nothing to do; buffer cleared
 *   { kind: 'replace', file }         commit this as one undo step
 *   { kind: 'refused', reason }       buffer kept, refusal shown
 *
 * `parse` is the app's full import path — version check, ordered migrations,
 * strict validation — and `serialize` its export bytes. Both are passed in so
 * this module stays pure and the prototype runs the real ones.
 *
 * The no-op test compares the *parsed* result's bytes, not the raw text: text
 * that differs only in whitespace or key order parses to the document we
 * already have, and landing that in history would be an undo step that undoes
 * nothing. This is the pickers' rule (a pick that changes nothing does not
 * enter history) applied to a whole document.
 */
export function apply(state, docBytes, parse, serialize) {
	if (state.text === null) return { kind: 'settled', state: TRACKING };

	const result = parse(state.text);
	if (!result.ok) return { kind: 'refused', reason: result, state: { ...state, error: result } };

	// Success always returns to Tracking, whether or not it commits: the box
	// re-renders from the document, which is how a migration shows itself
	// (v1 text in, v2 bytes back) and how normalization shows itself.
	if (serialize(result.file) === docBytes) return { kind: 'settled', state: TRACKING };
	return { kind: 'replace', file: result.file, state: TRACKING };
}

/**
 * The session boundary — import, new, load example. The buffer is a proposal
 * against *this* session's canvas; a different canvas is not a document change
 * to hold text against, and the app already discards the whole undo history
 * here. Nothing else discards the buffer.
 */
export function boundary() {
	return TRACKING;
}
