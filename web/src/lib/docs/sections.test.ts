/**
 * The docs register against the committed source set (SPEC §2.1, ticket 068).
 *
 * Three of the page's five guards fire here, at `npm test`. The other two fire
 * earlier and cannot be tested from inside the suite: a renamed `.md` is a
 * Vite module-resolution error, because the eight `?raw` imports are named
 * rather than globbed; and a homepage href pointing at an id nobody has is a
 * `DocsId` type error at `npm run check`. They deliberately do not consolidate
 * — collapsing them would move three of them later.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { sections } from './sections';

// vitest runs from the project root; the committed prose resolves from cwd,
// the `examples.test.ts` precedent.
const SITE = join(process.cwd(), 'docs', 'site');

const files = readdirSync(SITE).filter((name) => name.endsWith('.md'));
const source = (name: string) => readFileSync(join(SITE, name), 'utf8');

/**
 * The prose, with fenced blocks and inline code removed. Both legitimately
 * carry angle brackets — `<name>.bcc.json`, `--out <file>` — and neither can
 * corrupt anything, because the pipeline escapes them.
 */
function prose(markdown: string): string {
	const out: string[] = [];
	let fence: string | null = null;
	for (const line of markdown.split('\n')) {
		const open = /^ {0,3}(`{3,}|~{3,})/.exec(line);
		if (fence) {
			if (open && line.trim().startsWith(fence)) fence = null;
			continue;
		}
		if (open) {
			fence = open[1];
			continue;
		}
		out.push(line.replace(/(`+)[^`]*\1/g, ''));
	}
	return out.join('\n');
}

describe('the eight bodies (ticket 068 decision 8)', () => {
	it('has the register and docs/site/ in one-to-one correspondence', () => {
		// The basename *is* the id, enforced in both directions at once: this
		// is what catches the orphan — a `.md` nobody imports, edited forever
		// with no effect — which the named imports cannot see.
		expect(files.toSorted()).toEqual(sections.map((s) => `${s.id}.md`).toSorted());
	});

	it('carries no frontmatter — the filename is the only membership claim', () => {
		for (const name of files) expect(source(name).startsWith('---'), name).toBe(false);
	});
});

describe('what the pipeline would swallow silently', () => {
	it('has no raw HTML in the prose (ticket 069 decision 5)', () => {
		// There is no `rehype-raw`, so `remark-rehype` drops raw tags and keeps
		// the text between them: no script can ever execute, but an author who
		// types HTML gets silent content corruption. The build succeeds, the
		// page renders, and the words are quietly wrong.
		for (const name of files) {
			expect(prose(source(name)), `raw HTML in docs/site/${name}`).not.toMatch(/<[A-Za-z/]/);
		}
	});

	it('links to this repo by its own name (ticket 068 decision 10)', () => {
		// The four `{REPO}` interpolations became hardcoded URLs when the prose
		// left the template — Markdown has no interpolation, and a placeholder
		// word would have grown the vocabulary to save three strings. This is
		// what keeps them honest instead.
		const { repository } = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
		const repo = repository.url.replace(/^git\+/, '').replace(/\.git$/, '');
		expect(repo).toMatch(/^https:\/\/github\.com\//);

		const links = files.flatMap((name) =>
			[...source(name).matchAll(/https:\/\/github\.com\/[^\s)"']+/g)].map((m) => [name, m[0]])
		);
		expect(links.length).toBeGreaterThan(0);
		for (const [name, link] of links) {
			expect(link.startsWith(repo), `${link} in docs/site/${name}`).toBe(true);
		}
	});
});
