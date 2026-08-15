/** PROTOTYPE — throwaway. Ticket 066. Delete with the branch. */
import { renderPlain, renderDirectives } from './pipeline';

// The repo-root glob the research never measured against `vite dev` (§10).
// `server.fs.allow` in web/vite.config.ts carries the matching allowance.
const sources = import.meta.glob('../../../../docs-proto/**/*.md', {
	query: '?raw',
	eager: true,
	import: 'default'
}) as Record<string, string>;

const at = (suffix: string) => {
	const key = Object.keys(sources).find((k) => k.endsWith(suffix));
	if (!key) throw new Error(`prototype: no source matching ${suffix}`);
	return sources[key];
};

/** Shape B's fragment order lives here, in the shell — not in the filenames. */
const B_ORDER = ['lede', 'astro', 'docusaurus', 'anywhere', 'closing'] as const;

export const load = () => {
	const aSrc = at('docs-proto/a/remark.md');
	const cSrc = at('docs-proto/c/remark.md');
	const bSrcs = Object.fromEntries(
		B_ORDER.map((n) => [n, at(`docs-proto/b/remark/${n}.md`)])
	) as Record<(typeof B_ORDER)[number], string>;

	return {
		a: { src: aSrc, html: renderPlain(aSrc) },
		b: {
			order: B_ORDER,
			srcs: bSrcs,
			html: Object.fromEntries(
				B_ORDER.map((n) => [n, renderPlain(bSrcs[n])])
			) as Record<(typeof B_ORDER)[number], string>
		},
		c: { src: cSrc, html: renderDirectives(cSrc) }
	};
};
