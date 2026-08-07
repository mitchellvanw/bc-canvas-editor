/**
 * The offscreen artifact mount (SPEC §9): the one render source both artifacts
 * capture. Mounts the read-only CanvasSheet in a hidden container at the fixed
 * desktop layout width on its cream paper ground — never the live editor DOM,
 * so affordances and placeholders can't leak into an artifact. Ticket 04 uses
 * it for PNG capture; ticket 09 reuses it for the HTML artifact.
 */

import { flushSync, mount, unmount } from 'svelte';
import type { CanvasDoc } from '$lib/model/canvas';
import CanvasSheet from '$lib/sheet/CanvasSheet.svelte';

/** The fixed desktop layout width artifacts render at, window size be damned (SPEC §9.2). */
export const ARTIFACT_WIDTH = 1440;
/** The fixed cream margin around the sheet, matching the editor's px-10 gutter. */
export const ARTIFACT_MARGIN = 40;

export interface ArtifactMount {
	/** The capture region: paper ground, margin, and the sheet from title block through footer. */
	element: HTMLElement;
	dispose(): void;
}

export function mountArtifactSheet(doc: CanvasDoc): ArtifactMount {
	const element = document.createElement('div');
	// Laid out but out of view — display:none would give capture nothing to rasterize.
	element.style.position = 'fixed';
	element.style.left = `-${2 * ARTIFACT_WIDTH}px`;
	element.style.top = '0';
	element.style.width = `${ARTIFACT_WIDTH}px`;
	element.style.padding = `${ARTIFACT_MARGIN}px`;
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
