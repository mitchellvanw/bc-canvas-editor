<script lang="ts">
	/**
	 * The JSON View (SPEC §6, §6.1): the Canvas file's exact export bytes in a
	 * plain textarea, and **Apply** — which parses that text and replaces the
	 * whole document as one commit, one undo step. Not live-on-keystroke (half
	 * typed JSON is invalid for most keystrokes, and every valid intermediate
	 * would pollute undo) and not commit-on-blur (that hides a whole-document
	 * replacement behind an accidental click).
	 *
	 * Apply knocks on `parseCanvasFile` — the same version check, the same
	 * ordered migrations, the same strict validation the importer runs, minus
	 * only `parseCanvasImport`'s HTML-embed wrapper, which throws the JSON
	 * engine's message away (`wayfinder/tickets/044-json-refusal-copy.md`). What
	 * is given up is pasting a whole `.bcc.html` in here, which is a file
	 * picker's affordance rather than a JSON box's.
	 *
	 * This is the one place the parser's `detail` reaches a human (§3.3): the
	 * offending path names a location in the buffer they are looking at. The
	 * engine message passes through untouched — WebKit's `JSON.parse` reports no
	 * position at all, so the app computes no line and points at nothing.
	 *
	 * A plain textarea, deliberately: the View exists to inspect and hand-fix,
	 * not to author. ⌘Z in here is the browser's own text undo by construction
	 * (`undo.ts` skips `textarea`), and Esc does nothing — its sheet meaning is
	 * "revert this field to its last committed value", and the buffer has none.
	 */
	import { tick } from 'svelte';
	import { announce } from '$lib/a11y/announce';
	import { CANVAS_VERSION, stampIds } from '$lib/model/canvas';
	import { serializeCanvas } from '$lib/model/serialize';
	import { canvas } from './document.svelte';
	import { jsonBuffer, type Refusal } from './json-buffer.svelte';

	/** SPEC §10, verbatim. The failed-Apply announcement is the lead sentence. */
	const NOT_CANVAS = "This text couldn't be read as a Canvas file.";
	const NEWER_VERSION = 'This text is from a newer version of BC Canvas.';

	const docBytes = $derived(serializeCanvas(canvas.doc));
	const shown = $derived(jsonBuffer.shown(docBytes));
	const moved = $derived(jsonBuffer.moved(docBytes));
	const refusal = $derived(jsonBuffer.refusal);

	let boxEl: HTMLTextAreaElement | undefined = $state();

	/**
	 * While the box follows the canvas the document can still move under it —
	 * the chrome's Undo/Redo is the one path that reaches here — and rewriting
	 * the value scrolls it back to the top, losing the reader's place in a long
	 * file. Hold it: this is a mirror, not something they are typing in. While
	 * proposing, the value never changes under them, so this never fights the
	 * caret's own scrolling.
	 */
	$effect.pre(() => {
		shown;
		const el = boxEl;
		if (!el || jsonBuffer.unapplied) return;
		const top = el.scrollTop;
		void tick().then(() => (el.scrollTop = top));
	});

	function lead(reason: Refusal): string {
		return reason.reason === 'newer-version' ? NEWER_VERSION : NOT_CANVAS;
	}

	function apply() {
		const outcome = jsonBuffer.apply(docBytes);
		if (outcome.kind === 'refused') {
			// The one announcement that isn't confirming something visible, so it
			// carries its whole sentence (SPEC §8.5). The path is never read out.
			announce(lead(outcome.refusal));
			return;
		}
		// A no-op Apply commits nothing and says nothing.
		if (outcome.kind === 'settled') return;
		canvas.commitReplace(stampIds(outcome.file));
		announce(
			outcome.migratedFrom === undefined
				? 'Canvas replaced'
				: `Canvas replaced, migrated from format version ${outcome.migratedFrom}`
		);
	}

	async function copy() {
		try {
			await navigator.clipboard.writeText(shown);
			announce('JSON copied');
		} catch (error) {
			// SPEC §10 defines no copy-failure notice; don't let it vanish silently.
			console.error('Copy failed', error);
		}
	}
</script>

<div class="pane">
	<textarea
		bind:this={boxEl}
		class="box"
		spellcheck="false"
		aria-label="Canvas file JSON"
		value={shown}
		oninput={(event) => jsonBuffer.edit(event.currentTarget.value, docBytes)}
	></textarea>

	{#if refusal}
		<!-- The import dialog's refusal one surface further in, in the multi-tab
		     notice's box: a standing statement, not a toast. Held on the buffer,
		     so it survives a view switch and goes on the next keystroke. -->
		<div role="note" class="notewrap">
			<p class="note">
				<strong>{lead(refusal)}</strong>
				{#if refusal.reason === 'newer-version'}
					It was exported with format version {refusal.version}; this app reads up to version
					{CANVAS_VERSION}. Copy this text, reload the page to pick up the latest app, then paste it
					back.
				{:else if refusal.detail}
					<span class="detail">{refusal.detail}</span>
				{/if}
			</p>
		</div>
	{/if}

	<div class="foot">
		{#if moved}
			<!-- Apply is a whole-document replacement, so a proposal written before
			     a sheet edit silently replaces that edit. It blocks nothing. -->
			<p class="moved">
				The canvas has changed since you started editing this text. Applying replaces it.
			</p>
		{/if}
		<div class="controls">
			<span class="hint">This is the Canvas file, exactly as Export writes it.</span>
			<button type="button" class="btn" onclick={copy}>Copy</button>
			<button type="button" class="btn btn--primary" onclick={apply}>Apply</button>
		</div>
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
	.box {
		flex: 1 1 auto;
		min-height: 0;
		padding: 1.35rem 1.5rem;
		border: 0;
		background: transparent;
		color: var(--color-ink);
		font-family: var(--font-mono);
		font-size: 0.8rem;
		line-height: 1.65;
		white-space: pre;
		resize: none;
		overflow: auto;
	}
	.box:focus {
		outline: none;
	}

	.notewrap {
		padding: 0.75rem 1rem;
	}
	.note {
		padding: 0.6rem 1rem;
		border: 1px solid var(--color-line);
		border-radius: 6px;
		font-size: 0.875rem;
		color: rgb(26 30 32 / 0.75);
	}
	.note strong {
		font-weight: 700;
		color: var(--color-ink);
	}
	/* The parser's clause, verbatim and monospaced: it names a location in the
	   text above, so it is read as text and not as prose. */
	.detail {
		display: block;
		margin-top: 0.3rem;
		font-family: var(--font-mono);
		font-size: 0.78rem;
		overflow-wrap: anywhere;
	}

	.foot {
		padding: 0.7rem 1rem;
		border-top: 1px solid var(--color-line);
	}
	.moved {
		margin-bottom: 0.5rem;
		font-size: 0.8rem;
		color: rgb(26 30 32 / 0.75);
	}
	.controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
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
	.btn--primary {
		border-color: var(--color-ink);
		background: var(--color-ink);
		color: var(--color-sheet);
	}
	.btn--primary:hover {
		background: rgb(26 30 32 / 0.85);
	}
</style>
