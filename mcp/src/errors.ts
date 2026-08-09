/**
 * Refusals a model can act on.
 *
 * Every failure here is an `isError: true` result, never a JSON-RPC error —
 * the protocol keeps two channels apart for exactly this reason: a JSON-RPC
 * error is a fault in the call, and the model never sees it as something to
 * fix, while an error result comes back into the conversation where it can be
 * read and answered. So each refusal does three things: names what went wrong,
 * says what would have been legal, and names the tool that gets there.
 *
 * The wording is the app's register, one step more technical: the reader is a
 * model with a file to correct, not a person who has just clicked Import.
 */

import type { CallToolResult } from '@modelcontextprotocol/server';
import type { CanvasRead } from './read';

/** An error result: one sentence per line, no JSON envelope to unwrap. */
export function refuse(...lines: string[]): CallToolResult {
	const text = lines.filter((line) => line !== '').join(' ');
	return { content: [{ type: 'text', text }], isError: true };
}

/** What to say about a read that did not come back with a canvas. */
export function readRefusal(result: Extract<CanvasRead, { ok: false }>): CallToolResult {
	switch (result.reason) {
		case 'outside-root':
			return refuse(result.detail, 'Call bcc_list_canvases to see the canvases it does cover.');
		case 'unreadable':
			return refuse(
				`${result.path}: could not be read (${result.detail}).`,
				'Call bcc_list_canvases for the canvases that are there.'
			);
		case 'newer-version':
			return refuse(
				`${result.path}: written by a newer version of BC Canvas (format version ${result.version});`,
				'this server reads up to version 1. Nothing was read, and nothing was changed.'
			);
		case 'not-canvas':
			return refuse(
				`${result.path}: not a Canvas file.`,
				result.detail ?? '',
				'A Canvas file is the eleven-section document bcc_write_canvas takes;',
				'call bcc_explain for what belongs in each section.'
			);
	}
}
