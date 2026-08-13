/**
 * The offscreen artifact mount (SPEC §9): a live client mount of the read-only
 * CanvasSheet in a hidden container at the fixed desktop layout width on its
 * cream paper ground — never the live editor DOM, so affordances and
 * placeholders can't leak into an artifact.
 *
 * PNG is now its only caller. The HTML artifact serialized this mount until
 * wayfinder ticket 050 moved it to the headless renderer; snapdom rasterizes a
 * live subtree, so the mount survives for the one export that needs a browser
 * anyway. Two compiles of the sheet, and only one of them emits bytes anyone
 * could diff.
 */

import { flushSync, mount, unmount } from 'svelte';
import type { CanvasDoc } from '$lib/model/canvas';
import { SHEET_MARGIN, SHEET_WIDTH } from '$lib/render/metrics';
import CanvasSheet from '$lib/sheet/CanvasSheet.svelte';

export interface ArtifactMount {
	/** The capture region: paper ground, margin, and the sheet from title block through footer. */
	element: HTMLElement;
	dispose(): void;
}

export function mountArtifactSheet(doc: CanvasDoc): ArtifactMount {
	const element = document.createElement('div');
	// Laid out but out of view — display:none would give capture nothing to rasterize.
	element.style.position = 'fixed';
	element.style.left = `-${2 * SHEET_WIDTH}px`;
	element.style.top = '0';
	element.style.width = `${SHEET_WIDTH}px`;
	element.style.padding = `${SHEET_MARGIN}px`;
	element.classList.add('paper-ground');
	element.setAttribute('aria-hidden', 'true');
	element.setAttribute('inert', '');
	document.body.append(element);

	const sheet = mount(CanvasSheet, { target: element, props: { doc } });
	flushSync();

	return {
		element,
		dispose() {
			unmount(sheet);
			element.remove();
		}
	};
}
