/**
 * The docs page's data (SPEC §2.1): the register joined to the eight rendered
 * bodies, in page order.
 *
 * A *server* load, and the site's only one. It runs at prerender and never at
 * runtime — `adapter-static` emits files, not a server — and it is the only
 * placement that keeps the Markdown sources and the unified parser out of the
 * client graph entirely. Measured: 412 bytes fetched on a hover over the
 * homepage's Docs link, against 138 KB for the same pipeline at module init.
 *
 * The shell gets one merged, ordered array rather than a bag of bodies to look
 * ids up in — a lookup that misses would put `undefined` into `{@html}`.
 */
import { sections, type DocsSection } from '$lib/docs/sections';
import { renderBodies } from '$lib/server/docs/bodies';

export function load(): { sections: DocsSection[] } {
	const bodies = renderBodies();
	return { sections: sections.map((section) => ({ ...section, html: bodies[section.id] })) };
}
