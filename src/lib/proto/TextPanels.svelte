<script lang="ts">
	/**
	 * PROTOTYPE — throwaway (ticket 042). The JSON and Markdown panel bodies,
	 * shared by all four variants on purpose: the panel is not the question,
	 * the strip above it is. Apply is a stub — the buffer's real state model is
	 * ticket 043's job; here it only exists so the unapplied marker has
	 * something to be driven by.
	 */
	import { jsonBytes, markdownBytes, type ViewKey } from './views';

	let {
		view,
		unapplied = $bindable(false)
	}: { view: ViewKey; unapplied: boolean } = $props();

	let buffer = $state(jsonBytes());
</script>

{#if view === 'json'}
	<div class="pane">
		<textarea
			class="buffer"
			spellcheck="false"
			aria-label="Canvas file JSON"
			bind:value={buffer}
			oninput={() => (unapplied = buffer !== jsonBytes())}
		></textarea>
		<div class="pane__foot">
			<span class="hint">
				{#if unapplied}Unapplied changes{:else}This is the exported file, byte for byte.{/if}
			</span>
			<button type="button" class="ghost" onclick={() => navigator.clipboard?.writeText(buffer)}>
				Copy
			</button>
			<button
				type="button"
				class="apply"
				disabled={!unapplied}
				onclick={() => {
					buffer = jsonBytes();
					unapplied = false;
				}}
			>
				Apply
			</button>
		</div>
	</div>
{:else}
	<div class="pane">
		<pre class="buffer buffer--read">{markdownBytes()}</pre>
		<div class="pane__foot">
			<span class="hint">Markdown is a one-way rendering — read and copy only.</span>
			<button
				type="button"
				class="ghost"
				onclick={() => navigator.clipboard?.writeText(markdownBytes())}
			>
				Copy
			</button>
		</div>
	</div>
{/if}

<style>
	.pane {
		display: flex;
		flex-direction: column;
		min-height: 60vh;
		border: 1px solid var(--color-line);
		border-radius: 5px;
		background: var(--color-sheet);
		box-shadow: 0 1px 2px rgb(26 30 32 / 0.04);
	}
	.buffer {
		flex: 1 1 auto;
		margin: 0;
		padding: 1.4rem 1.6rem;
		border: 0;
		background: transparent;
		color: var(--color-ink);
		font-family: var(--font-mono);
		font-size: 0.8rem;
		line-height: 1.65;
		resize: none;
		white-space: pre;
		overflow: auto;
	}
	.buffer:focus {
		outline: none;
	}
	.buffer--read {
		white-space: pre-wrap;
	}
	.pane__foot {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.7rem 1rem;
		border-top: 1px solid var(--color-line);
	}
	.hint {
		flex: 1 1 auto;
		font-family: var(--font-sans);
		font-size: 0.75rem;
		color: var(--color-ink-soft);
	}
	.ghost,
	.apply {
		border-radius: 4px;
		padding: 0.35rem 0.8rem;
		font-family: var(--font-sans);
		font-size: 0.8rem;
		font-weight: 500;
	}
	.ghost {
		border: 1px solid var(--color-line);
		background: var(--color-sheet);
	}
	.apply {
		border: 1px solid var(--color-ink);
		background: var(--color-ink);
		color: var(--color-sheet);
	}
	.apply:disabled {
		opacity: 0.35;
	}
</style>
