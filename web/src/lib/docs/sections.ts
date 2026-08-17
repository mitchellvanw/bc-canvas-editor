/**
 * The docs register (SPEC §2.1): one row per section of `/docs`, in page
 * order. The eight ids are hand-chosen short nouns the homepage links into,
 * which makes them a contract — nothing generates them and nothing may.
 *
 * The register carries *membership*: order, chip, label and title. The eight
 * `docs/site/*.md` files carry bodies and never membership — the basename is
 * the id. Bodies deliberately do not ride on these rows: this module is
 * imported by the shell, so a body here would drag every section's Markdown
 * and the parser that reads it into the client bundle (ticket 069 decision 4).
 * They live behind `$lib/server/docs/bodies.ts` instead.
 */

export const sections = [
	{ id: 'editor', chip: 'bg-event border-event-ink text-event-ink', label: 'editor', title: 'The editor' },
	{ id: 'canvas-file', chip: 'bg-sheet border-ink text-ink-soft', label: 'file', title: 'The Canvas file' },
	{ id: 'exports', chip: 'bg-command border-command-ink text-command-ink', label: 'exports', title: 'Exports' },
	{ id: 'cli', chip: 'bg-ink border-ink text-paper', label: 'bcc', title: 'The command line' },
	{ id: 'fence', chip: 'bg-term border-term-ink text-term-ink', label: 'fence', title: 'The bcc fence' },
	{ id: 'remark', chip: 'bg-query border-query-ink text-query-ink', label: 'remark', title: 'The remark plugin' },
	{ id: 'vscode', chip: 'bg-policy border-policy-ink text-policy-ink', label: 'vscode', title: 'The VS Code extension' },
	{ id: 'mcp', chip: 'bg-collaborator border-collaborator-ink text-collaborator-ink', label: 'mcp', title: 'The MCP server & plugin' }
] as const;

/** A section of `/docs` — and the anchor the homepage is allowed to link into. */
export type DocsId = (typeof sections)[number]['id'];

/** A register row joined to its rendered body, in page order. */
export interface DocsSection {
	id: DocsId;
	chip: string;
	label: string;
	title: string;
	/** The section's Markdown body, rendered to HTML (`$lib/server/docs/bodies.ts`). */
	html: string;
}
