/**
 * PROTOTYPE — throwaway. Ticket 066, "where the Markdown ends and the Svelte
 * furniture begins". Three pipelines for the three candidate seam shapes, run
 * over the real `#remark` section of /docs. Delete with the branch.
 */
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';

/** Shapes A and B: nothing but Markdown. The pipeline §9 of the research recommends,
 *  plus remark-gfm — without which the `css` options table is a paragraph of pipes. */
const plain = unified()
	.use(remarkParse)
	.use(remarkGfm)
	.use(remarkRehype, { allowDangerousHtml: true })
	.use(rehypeRaw)
	.use(rehypeSlug)
	.use(rehypeStringify, { allowDangerousHtml: true });

/**
 * Shape C's vocabulary. This function IS the cost of shape C: every piece of
 * furniture the page owns has to be taught to the Markdown here, by hand, and
 * every class name the stylesheet uses is now duplicated in two places — the
 * `<style>` block and this table.
 */
function bccFurniture() {
	return (tree: any) => {
		visit(tree, (node: any) => {
			if (node.type !== 'containerDirective') return;
			const attrs = node.attributes ?? {};
			const data = (node.data ??= {});

			switch (node.name) {
				case 'lede': {
					// A directive whose only job is to add a class to a paragraph. The
					// Markdown gains three lines of ceremony to say "this one is first".
					const p = node.children[0];
					if (p?.type === 'paragraph') {
						(p.data ??= {}).hProperties = { class: 'lede' };
						data.hName = 'div';
						data.hProperties = { class: 'contents' };
					}
					break;
				}
				case 'term': {
					// Today's DOM is `<pre class="term">` with the transcript directly
					// inside — no `<code>`. Reaching that from a fenced block means
					// rewriting the child, because a directive can only wrap.
					const code = node.children[0];
					if (code?.type === 'code') {
						node.type = 'html';
						node.value = `<pre class="term">${escapeHtml(code.value)}</pre>`;
					}
					break;
				}
				case 'filecard': {
					const code = node.children[0];
					const name = attrs.name ?? '';
					if (code?.type === 'code') {
						// figcaption + pre is two elements from one directive, so this
						// stops being a wrap and becomes HTML generation.
						node.type = 'html';
						node.value =
							`<figure class="filecard"><figcaption>${escapeHtml(name)}</figcaption>` +
							`<pre>${escapeHtml(code.value)}</pre></figure>`;
					}
					break;
				}
				case 'note': {
					const tilt = attrs.tilt ?? '1.2';
					const body = node.children[0];
					const text = body?.type === 'paragraph' ? stringify(body) : '';
					node.type = 'html';
					node.value =
						`<aside class="note ${tiltClass(tilt)}">` +
						`<p class="font-mono text-[11px] font-medium tracking-wide text-ink-faint">field note</p>` +
						`<p class="mt-1 text-sm leading-relaxed">${escapeHtml(text)}</p></aside>`;
					// Note what just happened: the field note's markup — four Tailwind
					// utility strings — now lives in a .ts file instead of a .svelte
					// snippet, and the Markdown can no longer put a link inside a note.
					break;
				}
				case 'scroller': {
					data.hName = 'div';
					data.hProperties = { class: 'overflow-x-auto' };
					break;
				}
				default:
					// An unknown directive renders as nothing and warns nowhere. The
					// DSL has no compiler; a typo is invisible until someone reads the page.
					data.hName = 'div';
					data.hProperties = { class: 'unknown-directive' };
			}
		});
	};
}

const directives = unified()
	.use(remarkParse)
	.use(remarkGfm)
	.use(remarkDirective)
	.use(bccFurniture)
	.use(remarkRehype, { allowDangerousHtml: true })
	.use(rehypeRaw)
	.use(rehypeSlug)
	.use(rehypeStringify, { allowDangerousHtml: true });

function escapeHtml(s: string) {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function stringify(node: any): string {
	if (node.type === 'text') return node.value;
	return (node.children ?? []).map(stringify).join('');
}

function tiltClass(tilt: string) {
	const n = Number(tilt);
	return n < 0 ? `-rotate-[${Math.abs(n)}deg]` : `rotate-[${n}deg]`;
}

export const renderPlain = (src: string) => String(plain.processSync(src));
export const renderDirectives = (src: string) => String(directives.processSync(src));
