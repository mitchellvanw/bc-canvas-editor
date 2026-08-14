/**
 * The sheet's fixed desktop metrics (SPEC §9.2), in one place because two
 * renders have to agree on them: the headless renderer's page frame and the
 * offscreen client mount PNG rasterizes. A canvas is drawn at this width
 * whatever the window is doing.
 */

/** The fixed desktop layout width every artifact renders at. */
export const SHEET_WIDTH = 1440;

/** The cream margin around the sheet, matching the editor's px-10 gutter. */
export const SHEET_MARGIN = 40;
