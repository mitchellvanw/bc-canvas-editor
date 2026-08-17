/**
 * The docs body stylesheet (SPEC §2.1, ticket 071 decision 5).
 *
 * The fifth guard, and the only one that inspects a stylesheet rather than
 * generated HTML or a register. Svelte's compiler used to guarantee these
 * rules could not leak; `{@html}` output is never stamped, so the guarantee
 * is gone and `.docs` is a namespace held by convention — this test is the
 * convention's enforcement.
 *
 * The failure it catches is real rather than theoretical: `.underline-command`
 * and `.underline-event` exist on the homepage too, with different bodies, one
 * file away. A body rule written without its `.docs` prefix would put a second
 * stroke under the homepage's headline.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'web/src/lib/docs/prose.css'), 'utf8').replace(
	/\/\*[\s\S]*?\*\//g,
	''
);

/** Every selector in the file, at-rules unwrapped rather than skipped. */
const selectors = [...css.matchAll(/([^{}]+)\{/g)]
	.map((match) => match[1].trim())
	.filter((head) => head && !head.startsWith('@'))
	.flatMap((list) => list.split(',').map((one) => one.trim()));

describe('prose.css', () => {
	it('writes every selector under .docs', () => {
		expect(selectors.length).toBeGreaterThan(20);
		for (const selector of selectors) expect(selector.startsWith('.docs'), selector).toBe(true);
	});

	it('stays unlayered', () => {
		// Svelte emits scoped blocks unlayered and Tailwind 4 emits everything
		// inside `@layer`, so these rules outrank every utility on the page.
		// Moving them into a layer would switch dead utility declarations on and
		// re-base live ones, across the whole page at once.
		expect(css).not.toContain('@layer');
	});
});
