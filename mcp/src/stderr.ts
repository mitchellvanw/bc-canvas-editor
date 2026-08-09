/**
 * Diagnostics leave through stderr, and only stderr.
 *
 * The stdio transport's rule is absolute: the server MUST NOT write anything
 * to stdout that is not a valid MCP message, and one stray line corrupts the
 * stream for good. This repo's day-to-day is Vite and Svelte, where dropping a
 * `console.log` into a function is a normal debugging move — so rather than
 * trust a convention, the console itself is rebound to stderr. A stray log
 * then lands where the spec invites logs to land.
 *
 * `main.ts` imports this module before anything else, so the rebinding happens
 * ahead of every other module's evaluation.
 */

import { Console } from 'node:console';

globalThis.console = new Console(process.stderr) as typeof globalThis.console;

/** Report a failure the way a launched subprocess reports one, and stop. */
export function fail(message: string): never {
	process.stderr.write(`bc-canvas-mcp: ${message}\n`);
	process.exit(1);
}
