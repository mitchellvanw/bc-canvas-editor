<script lang="ts">
	/**
	 * The pick-one popover (SPEC §6, §8.3): a listbox of curated values with ✓
	 * on the current one, the clear entry, and custom… last. Arrows move,
	 * type-ahead jumps, Enter picks-and-closes, Esc closes unchanged; Enter on
	 * custom… moves into its input, where Enter commits the typed string and
	 * Esc backs out to the list. The popover only reports picks — the editor
	 * owns the commit and the open/close state.
	 */
	import { listNavigation } from './list-nav';
	import type { PickOption } from './vocab';

	let {
		label,
		options,
		value,
		clearLabel,
		custom = true,
		onPick,
		onCancel
	}: {
		/** The location's identity — names the listbox and the custom input. */
		label: string;
		options: PickOption[];
		value: string | undefined;
		/** The clear entry's wording: '— none —' / '— no relationship —' (SPEC §10). */
		clearLabel: string;
		/** False for a closed vocabulary (collaborator kind): no custom… entry. */
		custom?: boolean;
		/** A pick: a curated value, a custom string, or undefined for clear. */
		onPick: (value: string | undefined) => void;
		/** Esc: close without changing. */
		onCancel: () => void;
	} = $props();

	// The entries after the curated options: clear, then — open vocabularies
	// only — custom… last (§8.3). A closed set has no custom index to reach.
	const clearIndex = $derived(options.length);
	const customIndex = $derived(custom ? options.length + 1 : -1);

	let active = $state(0);
	let customOpen = $state(false);
	let listEl = $state<HTMLUListElement>();
	let inputEl = $state<HTMLInputElement>();

	// Open on the current value — the ✓'d entry is where the arrows start.
	$effect.pre(() => {
		const current = options.findIndex((option) => option.value === value);
		active = current >= 0 ? current : value === undefined ? clearIndex : 0;
	});

	// Roving focus: the active option holds real focus; custom… hands it to
	// its input and takes it back when Esc backs out.
	$effect(() => {
		if (customOpen) inputEl?.focus();
		else listEl?.querySelectorAll<HTMLElement>('[role="option"]')[active]?.focus();
	});

	function activate(index: number) {
		active = index;
		if (index === customIndex) customOpen = true;
		else if (index === clearIndex) onPick(undefined);
		else onPick(options[index].value);
	}

	const onListKeydown = listNavigation({
		labels: () => [
			...options.map((option) => option.value),
			clearLabel,
			...(custom ? ['custom…'] : [])
		],
		active: () => active,
		setActive: (index) => (active = index),
		activate,
		cancel: () => onCancel()
	});

	function onInputKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			const custom = (inputEl?.value ?? '').trim();
			if (custom) onPick(custom);
		} else if (event.key === 'Escape') {
			// Back out to the list (§8.3) — the window backstop must not see this.
			event.preventDefault();
			event.stopPropagation();
			customOpen = false;
		}
	}
</script>

<div class="picker">
	{#if customOpen}
		<!-- The input replaces the listbox rather than sitting inside it — a
		     listbox may only contain options; Esc restores the list (§8.3).
		     Only the label's leading cap folds: a collaborator name keeps its. -->
		<input
			bind:this={inputEl}
			class="picker__input"
			type="text"
			aria-label="Custom {label.charAt(0).toLowerCase() + label.slice(1)}"
			onkeydown={onInputKeydown}
		/>
	{:else}
		<!-- The options ARE keyboard-operated: focus roves across them and their
		     keydowns bubble to the listbox's one handler above. -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<ul bind:this={listEl} role="listbox" aria-label={label} onkeydown={onListKeydown}>
			{#each options as option, index (option.value)}
				<li
					role="option"
					data-value={option.value}
					aria-selected={value === option.value}
					tabindex={active === index ? 0 : -1}
					onclick={() => activate(index)}
				>
					<span class="picker__check" aria-hidden="true">{value === option.value ? '✓' : ''}</span>
					<span class="picker__label">
						<span class="picker__value">{option.value}</span>
						{#if option.description}<span class="picker__desc">{option.description}</span>{/if}
					</span>
				</li>
			{/each}
			<li
				role="option"
				aria-selected={value === undefined}
				tabindex={active === clearIndex ? 0 : -1}
				onclick={() => activate(clearIndex)}
			>
				<span class="picker__check" aria-hidden="true">{value === undefined ? '✓' : ''}</span>
				<span class="picker__label">{clearLabel}</span>
			</li>
			{#if custom}
				<li
					role="option"
					aria-selected="false"
					tabindex={active === customIndex ? 0 : -1}
					onclick={() => activate(customIndex)}
				>
					<span class="picker__check" aria-hidden="true"></span>
					<span class="picker__label">custom…</span>
				</li>
			{/if}
		</ul>
	{/if}
</div>

<style>
	/* The popover panel hangs off the value's .pickwrap (position: relative). */
	.picker {
		position: absolute;
		z-index: 10;
		top: calc(100% + 4px);
		left: 0;
		min-width: 12rem;
		max-width: 19rem;
		padding: 0.3rem;
		background: var(--color-sheet);
		border: 1px solid var(--color-line);
		border-radius: 5px;
		box-shadow: 0 4px 14px rgb(26 30 32 / 0.14);
		color: var(--color-ink);
		font-family: var(--font-sans);
		font-weight: 400;
		letter-spacing: normal;
		white-space: normal;
		text-align: left;
	}

	ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	[role='option'] {
		display: flex;
		gap: 0.4rem;
		align-items: baseline;
		padding: 0.32rem 0.5rem 0.32rem 0.3rem;
		border-radius: 4px;
		cursor: pointer;
		outline: none;
	}
	[role='option']:hover {
		background: rgb(26 30 32 / 0.055);
	}
	[role='option']:focus {
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
		font-family: var(--font-mono);
		font-size: 0.74rem;
	}
	.picker__desc {
		display: block;
		margin-top: 0.08rem;
		font-size: 0.72rem;
		line-height: 1.4;
		color: var(--color-ink-soft);
	}

	.picker__input {
		width: 13rem;
		padding: 0.3rem 0.45rem;
		border: 1px solid var(--color-line);
		border-radius: 4px;
		background: var(--color-sheet);
		font-family: var(--font-mono);
		font-size: 0.74rem;
		color: var(--color-ink);
	}
	.picker__input:focus {
		outline: 1px solid var(--color-ink-faint);
	}
</style>
