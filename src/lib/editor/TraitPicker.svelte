<script lang="ts">
	/**
	 * The domain-role trait checklist (SPEC §4.2, §8.3): a checkbox group of
	 * the 15 traits with their one-line descriptions, plus a custom-trait input
	 * behind custom… last. Space (or Enter) toggles — each toggle one commit —
	 * and the popover stays open until Esc or blur, so several traits go on in
	 * one visit. Arrows move, type-ahead jumps; Enter on custom… moves into the
	 * input, Enter there adds the typed trait and keeps the checklist open, Esc
	 * backs out to the list. File values are natural lowercase prose — the
	 * sentence-casing here is display only, like the chips'.
	 */
	import { listNavigation } from './list-nav';
	import { TRAITS } from './vocab';

	let {
		selected,
		onToggle,
		onCancel
	}: {
		/** The trait names currently on the canvas. */
		selected: string[];
		/** Toggle one trait — the editor wraps this in a commit. */
		onToggle: (name: string) => void;
		/** Esc: close without changing. */
		onCancel: () => void;
	} = $props();

	// The rows: the 15 traits, then custom… last (§8.3).
	const customIndex = TRAITS.length;

	let active = $state(0);
	let customOpen = $state(false);
	let listEl = $state<HTMLUListElement>();
	let inputEl = $state<HTMLInputElement>();

	// Roving focus, as in Picker: the active row holds real focus; custom…
	// hands it to its input and takes it back when Esc backs out.
	$effect(() => {
		if (customOpen) inputEl?.focus();
		else listEl?.querySelectorAll<HTMLElement>('button')[active]?.focus();
	});

	function activate(index: number) {
		active = index;
		if (index === customIndex) customOpen = true;
		else onToggle(TRAITS[index].value);
	}

	const onListKeydown = listNavigation({
		labels: () => [...TRAITS.map((trait) => trait.value), 'custom…'],
		active: () => active,
		setActive: (index) => (active = index),
		activate,
		cancel: () => onCancel()
	});

	function onInputKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			const custom = (inputEl?.value ?? '').trim();
			// A trait already on the canvas is not re-added: toggle() would remove
			// it — an *add* input silently deleting a chip would be a trap.
			if (custom && !selected.includes(custom)) {
				onToggle(custom);
				if (inputEl) inputEl.value = '';
			}
		} else if (event.key === 'Escape') {
			// Back out to the list (§8.3) — the window backstop must not see this.
			event.preventDefault();
			event.stopPropagation();
			customOpen = false;
		}
	}
</script>

<div class="picker" role="group" aria-label="Domain role traits">
	<!-- The list itself is not interactive: keydowns bubble up here from the
	     focused checkbox buttons, centralizing the roving-focus grammar. -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<ul bind:this={listEl} onkeydown={onListKeydown}>
		{#each TRAITS as trait, index (trait.value)}
			<li>
				<button
					type="button"
					role="checkbox"
					data-value={trait.value}
					aria-checked={selected.includes(trait.value)}
					tabindex={active === index ? 0 : -1}
					onclick={() => activate(index)}
				>
					<span class="picker__check" aria-hidden="true"
						>{selected.includes(trait.value) ? '✓' : ''}</span
					>
					<span class="picker__label">
						<span class="picker__value">{trait.value}</span>
						<span class="picker__desc">{trait.description}</span>
					</span>
				</button>
			</li>
		{/each}
		<li>
			{#if customOpen}
				<input
					bind:this={inputEl}
					class="picker__input"
					type="text"
					aria-label="Custom trait"
					onkeydown={onInputKeydown}
				/>
			{:else}
				<button
					type="button"
					class="picker__customopt"
					tabindex={active === customIndex ? 0 : -1}
					onclick={() => activate(customIndex)}
				>
					<span class="picker__check" aria-hidden="true"></span>
					<span class="picker__label">custom…</span>
				</button>
			{/if}
		</li>
	</ul>
</div>

<style>
	/* The popover panel hangs off the ghost's .pickwrap (position: relative). */
	.picker {
		position: absolute;
		z-index: 10;
		top: calc(100% + 4px);
		left: 0;
		width: 19rem;
		max-height: 21rem;
		overflow-y: auto;
		padding: 0.3rem;
		background: var(--color-sheet);
		border: 1px solid var(--color-line);
		border-radius: 5px;
		box-shadow: 0 4px 14px rgb(26 30 32 / 0.14);
		color: var(--color-ink);
		font-family: var(--font-sans);
		font-weight: 400;
		white-space: normal;
		text-align: left;
	}

	ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li > button {
		display: flex;
		gap: 0.4rem;
		align-items: baseline;
		width: 100%;
		padding: 0.32rem 0.5rem 0.32rem 0.3rem;
		border: 0;
		border-radius: 4px;
		background: none;
		font: inherit;
		color: inherit;
		text-align: left;
		cursor: pointer;
		outline: none;
	}
	li > button:hover {
		background: rgb(26 30 32 / 0.055);
	}
	li > button:focus {
		background: rgb(26 30 32 / 0.08);
	}

	.picker__check {
		flex: 0 0 0.9em;
		font-size: 0.72rem;
	}

	.picker__label {
		min-width: 0;
	}
	.picker__value {
		font-size: 0.76rem;
		font-weight: 600;
	}
	/* File values are lowercase prose; displayed sentence-case (SPEC §4.2). */
	.picker__value::first-letter {
		text-transform: uppercase;
	}
	.picker__desc {
		display: block;
		margin-top: 0.08rem;
		font-size: 0.72rem;
		line-height: 1.4;
		color: var(--color-ink-soft);
	}

	.picker__input {
		width: 100%;
		padding: 0.3rem 0.45rem;
		border: 1px solid var(--color-line);
		border-radius: 4px;
		background: var(--color-sheet);
		font-family: var(--font-sans);
		font-size: 0.76rem;
		color: var(--color-ink);
	}
	.picker__input:focus {
		outline: 1px solid var(--color-ink-faint);
	}
</style>
