<script lang="ts">
	/**
	 * App chrome (SPEC §10): Undo/Redo, Import…, the Export menu, New canvas,
	 * the quiet Unexported-changes indicator, and the Reference control at the
	 * far end. File verbs are Import/Export, never Open/Save. Owns the
	 * confirmation dialogs, file-refusal notices, and the Reference dialog
	 * with its global ⌘/ shortcut (SPEC §12). Import… takes both importable
	 * forms — `.bcc.json` and `.bcc.html` — through the one parseCanvasImport
	 * path (SPEC §9.1).
	 */
	import { announce } from '$lib/a11y/announce';
	import { downloadBlob } from '$lib/artifact/download';
	import { exportHtmlArtifact } from '$lib/artifact/html';
	import { exportPngArtifact } from '$lib/artifact/png';
	import { REFERENCE_CLUSTERS, REFERENCE_URL, renderKeys } from '$lib/chrome/reference';
	import { canvas } from '$lib/editor/document.svelte';
	import { PICKER_SURFACES } from '$lib/editor/keyboard';
	import { MULTI_TAB_NOTICE, multiTab } from '$lib/editor/multi-tab.svelte';
	import { performRedo, performUndo } from '$lib/editor/undo';
	import { blankCanvas, stampIds, CANVAS_VERSION, type CanvasFile } from '$lib/model/canvas';
	import { exportFileName } from '$lib/model/filename';
	import { parseCanvasImport } from '$lib/model/parse';

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
	let referenceOpen = $state(false);
	let referenceEl = $state<HTMLDialogElement>();
	let referenceInvoker: HTMLElement | null = null;

	// Unnamed canvas substitutes "this canvas" for the name (SPEC §10).
	const canvasName = $derived(canvas.doc.name.trim());

	// One string owns the SPEC §10 copy; the banner bolds its lead sentence.
	const noticeLead = MULTI_TAB_NOTICE.slice(0, MULTI_TAB_NOTICE.indexOf('.') + 1);
	const noticeRest = MULTI_TAB_NOTICE.slice(noticeLead.length + 1);

	const chromeButton =
		'rounded-[4px] border border-line bg-sheet px-3 py-1.5 text-sm font-medium hover:bg-paper disabled:opacity-40 disabled:hover:bg-sheet';
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

	// Esc closes natively (dialog cancel); both paths land here, and focus
	// goes back to the invoking control — the chrome button or whatever held
	// focus when ⌘/ was pressed (SPEC §12).
	function openReference(invoker: HTMLElement | null) {
		referenceInvoker = invoker;
		referenceOpen = true;
	}

	function referenceClosed() {
		referenceOpen = false;
		if (referenceInvoker?.isConnected) referenceInvoker.focus();
		referenceInvoker = null;
	}

	/**
	 * The global ⌘/ (Ctrl+/) interception — always available, text editing
	 * included, because the shortcut has no native meaning there. Open
	 * dialogs and pickers keep their keyboard to themselves; shift stays
	 * legal for layouts that reach / through it.
	 */
	function handleReferenceShortcut(event: KeyboardEvent) {
		if (!(event.metaKey || event.ctrlKey) || event.altKey || event.key !== '/') return;
		const target = event.target instanceof Element ? event.target : null;
		if (referenceOpen || target?.closest(`dialog, ${PICKER_SURFACES}`)) return;
		event.preventDefault();
		openReference(document.activeElement instanceof HTMLElement ? document.activeElement : null);
	}

	async function fileChosen() {
		const file = fileInput.files?.[0];
		fileInput.value = '';
		if (!file) return;

		const result = parseCanvasImport(await file.text());
		if (!result.ok) {
			dialog =
				result.reason === 'newer-version'
					? { kind: 'newer-version', version: result.version }
					: { kind: 'not-canvas' };
		} else if (canvas.unexported) {
			dialog = { kind: 'confirm-replace', file: result.file };
		} else {
			canvas.replace(stampIds(result.file));
			announce('Canvas imported');
		}
	}

	function exportCanvasFile() {
		exportMenuOpen = false;
		const blob = new Blob([canvas.exportCanvasFile()], { type: 'application/json' });
		downloadBlob(blob, exportFileName(canvas.doc.name, 'json'));
	}

	// The HTML artifact carries the Canvas file within it, so exporting one
	// clears Unexported changes — only once the build has succeeded (SPEC §9.1).
	async function exportHtml() {
		exportMenuOpen = false;
		try {
			await exportHtmlArtifact(canvas.doc);
			canvas.markExported();
		} catch (error) {
			// SPEC §10 defines no export-failure notice; don't let it vanish silently.
			console.error('HTML export failed', error);
		}
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
			announce('New canvas');
		}
	}

	function proceed() {
		if (dialog?.kind === 'confirm-replace') {
			canvas.replace(stampIds(dialog.file));
			announce('Canvas imported');
		}
		if (dialog?.kind === 'confirm-new') {
			canvas.replace(blankCanvas());
			announce('New canvas');
		}
		dialogEl?.close();
	}

	function closeExportMenu(event: FocusEvent | MouseEvent) {
		const next = 'relatedTarget' in event && event.relatedTarget ? event.relatedTarget : event.target;
		if (!(next instanceof Node) || !exportButton.parentElement?.contains(next)) {
			exportMenuOpen = false;
		}
	}
</script>

<svelte:window
	onclick={exportMenuOpen ? closeExportMenu : undefined}
	onkeydown={handleReferenceShortcut}
/>

<header class="mx-auto flex max-w-[1440px] items-center justify-end gap-2 px-10 pt-6">
	<button
		type="button"
		class="{chromeButton} mr-1"
		title="Undo ({renderKeys('⌘Z')})"
		disabled={!canvas.canUndo}
		onclick={() => performUndo()}
	>
		Undo
	</button>
	<button
		type="button"
		class="{chromeButton} mr-auto"
		title="Redo ({renderKeys('⇧⌘Z')})"
		disabled={!canvas.canRedo}
		onclick={() => performRedo()}
	>
		Redo
	</button>

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
					onclick={exportHtml}
					onkeydown={closeMenuOnEscape}
				>
					HTML artifact (.bcc.html)
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

	<button
		type="button"
		class={chromeButton}
		title="Reference ({renderKeys('⌘/')})"
		onclick={(event) => openReference(event.currentTarget)}
	>
		Reference
	</button>

	<input
		type="file"
		accept=".json,.html,application/json,text/html"
		class="hidden"
		bind:this={fileInput}
		onchange={fileChosen}
	/>
</header>

{#if multiTab.detected}
	<!-- Persistent multi-tab notice (SPEC §6.1/§10) — not a toast, never retracts.
	     No live-region role here: the one polite live region announces it (§8.5). -->
	<div role="note" class="mx-auto max-w-[1440px] px-10 pt-4">
		<p class="rounded-[6px] border border-line bg-sheet px-4 py-2.5 text-sm text-ink/75">
			<strong class="font-bold text-ink">{noticeLead}</strong>
			{noticeRest}
		</p>
	</div>
{/if}

{#if referenceOpen}
	<dialog
		bind:this={referenceEl}
		use:openAsModal
		onclose={referenceClosed}
		aria-labelledby="reference-title"
		class="m-auto w-[30rem] rounded-[6px] border border-line bg-sheet p-6 text-ink shadow-lg backdrop:bg-ink/30"
	>
		<h2 id="reference-title" class="font-bold">Reference</h2>

		{#each REFERENCE_CLUSTERS as cluster (cluster.title)}
			<section class="mt-4">
				<h3 class="text-xs font-bold tracking-wide text-ink/55 uppercase">{cluster.title}</h3>
				<table class="mt-1 w-full text-sm">
					<tbody>
						{#each cluster.rows as [keys, action] (keys + action)}
							<tr>
								<td class="w-44 py-0.5 pr-4 font-mono text-[13px] whitespace-nowrap">
									{renderKeys(keys)}
								</td>
								<td class="py-0.5 text-ink/75">{action}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</section>
		{/each}

		<p class="mt-5 border-t border-line pt-4 text-sm">
			Learn the method:
			<a
				class="underline underline-offset-2 hover:text-ink/70"
				href={REFERENCE_URL}
				target="_blank"
				rel="noopener noreferrer"
			>
				the ddd-crew's Bounded Context Canvas
			</a>
		</p>

		<div class="mt-6 flex justify-end">
			<button type="button" class={chromeButton} onclick={() => referenceEl?.close()}>
				Close
			</button>
		</div>
	</dialog>
{/if}

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
