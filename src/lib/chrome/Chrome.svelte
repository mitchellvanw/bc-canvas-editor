<script lang="ts">
	/**
	 * App chrome (SPEC §10): Import…, the Export menu, New canvas, and the quiet
	 * Unexported-changes indicator. File verbs are Import/Export, never
	 * Open/Save. Owns the confirmation dialogs and file-refusal notices; the
	 * Export menu's HTML entry arrives with ticket 09.
	 */
	import { downloadBlob } from '$lib/artifact/download';
	import { exportPngArtifact } from '$lib/artifact/png';
	import { canvas } from '$lib/editor/document.svelte';
	import { blankCanvas, stampIds, CANVAS_VERSION, type CanvasFile } from '$lib/model/canvas';
	import { exportFileName } from '$lib/model/filename';
	import { parseCanvasFile } from '$lib/model/parse';

	type Dialog =
		| { kind: 'confirm-replace'; file: CanvasFile }
		| { kind: 'confirm-new' }
		| { kind: 'newer-version'; version: number }
		| { kind: 'not-canvas' };

	let dialog = $state<Dialog | null>(null);
	let dialogEl = $state<HTMLDialogElement>();
	let fileInput: HTMLInputElement;
	let exportButton: HTMLButtonElement;
	let exportMenuOpen = $state(false);

	// Unnamed canvas substitutes "this canvas" for the name (SPEC §10).
	const canvasName = $derived(canvas.doc.name.trim());

	const chromeButton =
		'rounded-[4px] border border-line bg-sheet px-3 py-1.5 text-sm font-medium hover:bg-paper';
	const menuItem =
		'block w-full px-4 py-1.5 text-left text-sm hover:bg-paper focus:bg-paper focus:outline-none';

	function closeMenuOnEscape(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			exportMenuOpen = false;
			exportButton.focus();
		}
	}

	function openAsModal(node: HTMLDialogElement) {
		node.showModal();
	}

	async function fileChosen() {
		const file = fileInput.files?.[0];
		fileInput.value = '';
		if (!file) return;

		const result = parseCanvasFile(await file.text());
		if (!result.ok) {
			dialog =
				result.reason === 'newer-version'
					? { kind: 'newer-version', version: result.version }
					: { kind: 'not-canvas' };
		} else if (canvas.unexported) {
			dialog = { kind: 'confirm-replace', file: result.file };
		} else {
			canvas.replace(stampIds(result.file));
		}
	}

	function exportCanvasFile() {
		exportMenuOpen = false;
		const blob = new Blob([canvas.exportCanvasFile()], { type: 'application/json' });
		downloadBlob(blob, exportFileName(canvas.doc.name, 'json'));
	}

	// PNG export is pixels-only: it never clears Unexported changes (SPEC §6.1).
	async function exportPng() {
		exportMenuOpen = false;
		try {
			await exportPngArtifact(canvas.doc);
		} catch (error) {
			// SPEC §10 defines no export-failure notice; don't let it vanish silently.
			console.error('PNG export failed', error);
		}
	}

	function newCanvas() {
		if (canvas.unexported) {
			dialog = { kind: 'confirm-new' };
		} else {
			canvas.replace(blankCanvas());
		}
	}

	function proceed() {
		if (dialog?.kind === 'confirm-replace') canvas.replace(stampIds(dialog.file));
		if (dialog?.kind === 'confirm-new') canvas.replace(blankCanvas());
		dialogEl?.close();
	}

	function closeExportMenu(event: FocusEvent | MouseEvent) {
		const next = 'relatedTarget' in event && event.relatedTarget ? event.relatedTarget : event.target;
		if (!(next instanceof Node) || !exportButton.parentElement?.contains(next)) {
			exportMenuOpen = false;
		}
	}
</script>

<svelte:window onclick={exportMenuOpen ? closeExportMenu : undefined} />

<header class="mx-auto flex max-w-[1440px] items-center justify-end gap-2 px-10 pt-6">
	<button type="button" class={chromeButton} onclick={() => fileInput.click()}>Import…</button>

	{#if canvas.unexported}
		<span class="mx-1 text-xs text-ink/55">Unexported changes</span>
	{/if}

	<div class="relative" onfocusout={closeExportMenu}>
		<button
			type="button"
			class={chromeButton}
			aria-haspopup="menu"
			aria-expanded={exportMenuOpen}
			bind:this={exportButton}
			onclick={(event) => {
				event.stopPropagation();
				exportMenuOpen = !exportMenuOpen;
			}}
			onkeydown={(event) => {
				if (event.key === 'Escape') exportMenuOpen = false;
			}}
		>
			Export
		</button>
		{#if exportMenuOpen}
			<div
				role="menu"
				class="absolute right-0 z-10 mt-1 min-w-max rounded-[6px] border border-line bg-sheet py-1 shadow-md"
			>
				<button
					type="button"
					role="menuitem"
					class={menuItem}
					onclick={exportCanvasFile}
					onkeydown={closeMenuOnEscape}
				>
					Canvas file (.bcc.json)
				</button>
				<button
					type="button"
					role="menuitem"
					class={menuItem}
					onclick={exportPng}
					onkeydown={closeMenuOnEscape}
				>
					PNG image (2x)
				</button>
			</div>
		{/if}
	</div>

	<button type="button" class={chromeButton} onclick={newCanvas}>New canvas</button>

	<input
		type="file"
		accept=".json,application/json"
		class="hidden"
		bind:this={fileInput}
		onchange={fileChosen}
	/>
</header>

{#if dialog}
	<dialog
		bind:this={dialogEl}
		use:openAsModal
		onclose={() => (dialog = null)}
		class="m-auto w-[26rem] rounded-[6px] border border-line bg-sheet p-6 text-ink shadow-lg backdrop:bg-ink/30"
	>
		{#if dialog.kind === 'confirm-replace'}
			<h2 class="font-bold">
				Replace {canvasName === '' ? 'this canvas' : `"${canvasName}"`}?
			</h2>
			<p class="mt-2 text-sm text-ink/75">
				Its latest changes haven't been exported. Importing replaces the canvas and clears undo
				history.
			</p>
		{:else if dialog.kind === 'confirm-new'}
			<h2 class="font-bold">Start a new canvas?</h2>
			<p class="mt-2 text-sm text-ink/75">
				{canvasName === '' ? 'This canvas' : `"${canvasName}"`} has changes that haven't been
				exported. Starting fresh discards them and clears undo history.
			</p>
		{:else if dialog.kind === 'newer-version'}
			<h2 class="font-bold">This file is from a newer version of BC Canvas.</h2>
			<p class="mt-2 text-sm text-ink/75">
				It was exported with format version {dialog.version}; this app reads up to version
				{CANVAS_VERSION}. The file hasn't been touched. Reload the page to pick up the latest app,
				then import again.
			</p>
		{:else}
			<h2 class="font-bold">This file couldn't be read as a Canvas file.</h2>
			<p class="mt-2 text-sm text-ink/75">
				It isn't a Canvas file export, or it's been modified. Nothing was imported.
			</p>
		{/if}

		<div class="mt-6 flex justify-end gap-2">
			{#if dialog.kind === 'confirm-replace' || dialog.kind === 'confirm-new'}
				<button type="button" class={chromeButton} onclick={() => dialogEl?.close()}>
					Cancel
				</button>
				<button
					type="button"
					class="rounded-[4px] bg-ink px-3 py-1.5 text-sm font-medium text-sheet hover:bg-ink/85"
					onclick={proceed}
				>
					{dialog.kind === 'confirm-replace' ? 'Replace' : 'Start new'}
				</button>
			{:else}
				<button type="button" class={chromeButton} onclick={() => dialogEl?.close()}>OK</button>
			{/if}
		</div>
	</dialog>
{/if}
