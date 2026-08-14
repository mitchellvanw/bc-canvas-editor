/**
 * Refusals a model can act on.
 *
 * Every failure here is an `isError: true` result, never a JSON-RPC error —
 * the protocol keeps two channels apart for exactly this reason: a JSON-RPC
 * error is a fault in the call, and the model never sees it as something to
 * fix, while an error result comes back into the conversation where it can be
 * read and answered. So each refusal names what went wrong, and where a tool
 * on this server gets the model out of the hole, names that too.
 *
 * The wording is the app's register, one step more technical: the reader is a
 * model with a file to correct, not a person who has just clicked Import.
 */

import type { CallToolResult } from '@modelcontextprotocol/server';
import { readProblem, type CanvasRead } from '$lib/fs/read';

/** An error result: one sentence per line, no JSON envelope to unwrap. */
export function refuse(...lines: string[]): CallToolResult {
	const text = lines.filter((line) => line !== '').join(' ');
	return { content: [{ type: 'text', text }], isError: true };
}

/**
 * What to say about a read that did not come back with a canvas.
 *
 * This used to write all four sentences out, because each one ended by naming
 * the tool that recovers from it. The diet took that ending away (ticket 059):
 * two of the four pointed at `bcc_list_canvases`, and listing is now `bcc ls` —
 * which this server cannot name, having no way to know whether `bcc` is
 * installed beside it, and a refusal naming a command that may not exist is
 * worse than a shorter one. Finding the canvases is the plugin's business now;
 * it is the layer that knows what is on the machine.
 *
 * What is left is `readProblem` — the sentence every surface that reads a
 * canvas off disk already shares — plus one addition on the one branch that
 * still has somewhere to send the model. `newer-version` also loses *"nothing
 * was changed"*, which [fs-seam](wayfinder/tickets/061-fs-seam.md) kept here on
 * the grounds that only a write surface can promise it. This is no longer a
 * write surface, so it can't, and it no longer needs to.
 */
export function readRefusal(result: Extract<CanvasRead, { ok: false }>): CallToolResult {
	return result.reason === 'not-canvas'
		? refuse(
				readProblem(result),
				'A Canvas file is the eleven-section document bcc_explain describes;',
				'call it for what belongs in each section.'
			)
		: refuse(readProblem(result));
}
