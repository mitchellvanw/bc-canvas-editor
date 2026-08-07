/**
 * Export file naming (SPEC §3.4): slugified context name as stem, the
 * family-signaling `.bcc.<ext>` extensions, `bounded-context-canvas` fallback
 * when unnamed. No date stamps.
 */

export type ExportKind = 'json' | 'html' | 'png';

function slugify(name: string): string {
	return name
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

export function exportFileName(name: string, kind: ExportKind): string {
	const slug = slugify(name);
	return `${slug === '' ? 'bounded-context-canvas' : slug}.bcc.${kind}`;
}
