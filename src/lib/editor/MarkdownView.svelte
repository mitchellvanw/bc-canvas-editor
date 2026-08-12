<script lang="ts">
	/**
	 * The Markdown View (SPEC §6): the canvas as source, in a mono block — the
	 * exact bytes Copy and the `.bcc.md` export produce, and the exact bytes
	 * `bcc_read_canvas` returns, because there is one renderer
	 * (`src/lib/model/digest.ts`, `wayfinder/tickets/041-shared-digest-seam.md`).
	 *
	 * Not rendered Markdown: that would mean a Markdown-to-HTML renderer in the
	 * app *and* in every artifact, and would make the two text Views behave
	 * differently for no gain. Someone who wants to read the canvas has the
	 * Sheet, which is a far better rendering than Markdown could be.
	 *
	 * Copying does not clear Unexported changes — §6.1 clears the dirty state
	 * only for re-importable forms, and Markdown lands on the lossy side of that
	 * rule, beside PNG.
	 */
	import { announce } from '$lib/a11y/announce';
	import { canvasDigest } from '$lib/model/digest';
	import { toCanvasFile } from '$lib/model/serialize';
	import { canvas } from './document.svelte';

	const markdown = $derived(canvasDigest(toCanvasFile(canvas.doc)));

	async function copy() {
		try {
			await navigator.clipboard.writeText(markdown);
			announce('Markdown copied');
		} catch (error) {
			// SPEC §10 defines no copy-failure notice; don't let it vanish silently.
			console.error('Copy failed', error);
		}
	}
</script>

<div class="pane">
	<pre class="box">{markdown}</pre>
	<div class="foot">
		<span class="hint">
			Markdown is a one-way rendering — it can't be imported back. Export the Canvas file to keep
			your work.
		</span>
		<button type="button" class="btn" onclick={copy}>Copy</button>
	</div>
</div>

<style>
	/* The pane is one of the sheet's own panels, grown to hold text. */
	.pane {
		display: flex;
		/* One boxful, so Copy and Apply are where they were left and the two text
		   Views behave the same; the source scrolls inside it. */
		height: max(24rem, calc(100vh - 12rem));
		flex-direction: column;
		background: var(--color-sheet);
		border: 1px solid var(--color-line);
		border-radius: 5px;
		box-shadow: 0 1px 2px rgb(26 30 32 / 0.04);
	}
	/* Long lines wrap rather than scrolling sideways: prose in a fixed-width
	   column is the one thing Markdown source has that JSON does not. */
	.box {
		flex: 1 1 auto;
		min-height: 0;
		margin: 0;
		padding: 1.35rem 1.5rem;
		color: var(--color-ink);
		font-family: var(--font-mono);
		font-size: 0.8rem;
		line-height: 1.65;
		white-space: pre-wrap;
		overflow: auto;
	}
	.foot {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.7rem 1rem;
		border-top: 1px solid var(--color-line);
	}
	.hint {
		flex: 1 1 auto;
		font-size: 0.75rem;
		color: var(--color-ink-soft);
	}
	.btn {
		padding: 0.35rem 0.75rem;
		border: 1px solid var(--color-line);
		border-radius: 4px;
		background: var(--color-sheet);
		font-family: var(--font-sans);
		font-size: 0.875rem;
		font-weight: 500;
		white-space: nowrap;
		cursor: pointer;
	}
	.btn:hover {
		background: var(--color-paper);
	}
</style>
