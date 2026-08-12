/**
 * `review-canvas`: the one prompt that ships day one.
 *
 * A prompt is user-initiated — somebody picks it from a menu and names a
 * canvas — which is the whole reason it embeds the digest instead of telling
 * the model to go and call `bcc_read_canvas`. The canvas has already been
 * chosen; making "review this" cost a round trip would be asking the model to
 * re-discover something the user just said.
 *
 * `path` is wrapped in `completable()` so the host can offer the canvases that
 * are actually there. Prompt arguments and resource-template variables are the
 * only places `completion/complete` applies at all, so this and the resource
 * template are the two spots in the design where a picker is possible.
 *
 * A path that names no canvas comes back as JSON-RPC `-32602` rather than as a
 * readable refusal in the conversation. Blunter than a tool's teaching error,
 * and accepted: the path came from the server's own completion list, and
 * `prompts/get` has no error channel a model can answer.
 */

import {
	completable,
	INVALID_PARAMS,
	ProtocolError,
	type McpServer
} from '@modelcontextprotocol/server';
import { z } from 'zod';
import { canvasDigest } from '$lib/model/digest';
import { canvasUri, catalog } from './catalog';
import { readProblem } from './errors';
import { readCanvas } from './read';
import type { CanvasRoot } from './root';

/**
 * The facilitation body.
 *
 * The method's value is in the asking, so this says what to ask and says not
 * to answer. "Identify gaps and suggest improvements" is the phrasing that
 * produces a model filling eleven sections with plausible strings, which is
 * worse than the blank canvas it started from — a wrong collaborator gets
 * argued with, a missing one gets noticed.
 */
function body(path: string): string {
	return [
		'Review the canvas above the way a facilitator would: by asking, not by filling in.',
		'',
		'Say back:',
		'',
		'- What this context is responsible for, in one sentence drawn only from what the canvas says. If that sentence will not come out, say so — the canvas has not yet settled what the context is for.',
		'- Which sections are empty, and which of those matter for a context like this one. An empty section is a question nobody has answered yet.',
		'- Where the canvas disagrees with itself: a business decision nothing inbound triggers, an outbound event no collaborator consumes, a word the description leans on that the ubiquitous language never defines.',
		'- The questions the canvas raises, alongside the ones already under Open questions.',
		'',
		'Leave the questions open. Do not answer them and do not draft the rows that are missing: the answers belong to the people who own this context, and an invented collaborator is harder to get out of a canvas than a blank line is to fill.',
		'',
		`Call bcc_read_canvas with view: 'json' if you need the exact file, and bcc_write_canvas back to ${path} once those questions have been answered.`
	].join('\n');
}

export function registerReviewPrompt(server: McpServer, root: CanvasRoot): void {
	server.registerPrompt(
		'review-canvas',
		{
			title: 'Review a canvas',
			description:
				'Read a Bounded Context Canvas and ask back what it leaves open, rather than filling it in.',
			argsSchema: z.object({
				path: completable(
					z
						.string()
						.describe('The canvas to review — root-relative, as bcc_list_canvases reports it.'),
					(value) =>
						catalog(root)
							.canvases.map((summary) => summary.path)
							.filter((candidate) => candidate.startsWith(value))
				)
			})
		},
		({ path }) => {
			const result = readCanvas(root, path);
			if (!result.ok) throw new ProtocolError(INVALID_PARAMS, readProblem(result));

			return {
				description: `Review ${result.file.name === '' ? result.path : result.file.name}`,
				messages: [
					{
						role: 'user' as const,
						content: {
							type: 'resource' as const,
							resource: {
								uri: canvasUri(result.path),
								mimeType: 'text/markdown',
								text: canvasDigest(result.file)
							}
						}
					},
					{
						role: 'user' as const,
						content: { type: 'text' as const, text: body(result.path) }
					}
				]
			};
		}
	);
}
