/**
 * The one place a browser enters this program.
 *
 * `sheetSvg` takes its height from the caller, and nothing headless can measure
 * one — laying the sheet out is exactly the work a headless renderer does not
 * do. So the two jobs split: **a browser measures, and Node reproduces**
 * (ticket 056 decision 9). Measuring happens once per content change, in the
 * editor for free and here through an already-installed Chrome; reproducing —
 * which is what `bcc check` does, on every canvas, in anyone's checkout —
 * happens in plain Node with none of this in reach.
 *
 * `playwright-core` is ~3 MB and downloads no browser: `channel: 'chrome'`
 * drives the Chrome already on the machine. It is a devDependency and a lazy
 * import, so a `npx --yes github:…` install carries neither it nor a browser,
 * and everything except `render --svg` works there untouched. `--height` is the
 * escape hatch when this refuses.
 *
 * The page measured is `sheetDocument` — the sheet in the page frame both file
 * containers draw it in (SPEC §9.2). The frame is the contract between the
 * measurement and the image, which is why it is one constant in the renderer
 * rather than a number written here.
 */

import type { CanvasDoc } from '$lib/model/canvas';
import { sheetDocument } from '$lib/render';
import { SHEET_WIDTH } from '$lib/render/metrics';

/** No Chrome to measure with — always paired with the `--height` way out. */
export class NoBrowser extends Error {}

export interface Measurer {
	height(doc: CanvasDoc): Promise<number>;
	close(): Promise<void>;
}

/**
 * As much of playwright's surface as this file uses. Typed here rather than
 * imported because the package is deliberately absent from an install, and a
 * type import would be the one thing that made the bundle depend on it.
 */
interface Page {
	setContent(html: string, options: { waitUntil: string }): Promise<void>;
	evaluate(expression: string): Promise<unknown>;
}

interface Browser {
	newPage(options: { viewport: { width: number; height: number } }): Promise<Page>;
	close(): Promise<void>;
}

interface Chromium {
	launch(options: { channel: string }): Promise<Browser>;
}

async function chromium(): Promise<Chromium> {
	let module: unknown;
	try {
		module = await import('playwright-core');
	} catch {
		throw new NoBrowser(
			'measuring a sheet needs playwright-core, which is not installed here. ' +
				'Install it beside a desktop Chrome (npm install playwright-core), ' +
				'or pass --height <pixels> and skip the measurement.'
		);
	}
	return (module as { chromium: Chromium }).chromium;
}

function firstLine(error: unknown): string {
	return error instanceof Error ? error.message.split('\n')[0] : String(error);
}

/**
 * One browser for the whole invocation. Launching is the expensive part, and
 * `bcc render --svg` over a directory of canvases is the case that matters.
 */
export async function openMeasurer(): Promise<Measurer> {
	const engine = await chromium();
	let browser: Browser;
	try {
		browser = await engine.launch({ channel: 'chrome' });
	} catch (error) {
		throw new NoBrowser(
			`no Chrome to measure with (${firstLine(error)}). ` +
				'bcc drives the Chrome already installed on this machine rather than downloading one; ' +
				'pass --height <pixels> to skip the measurement.'
		);
	}

	const page = await browser.newPage({ viewport: { width: SHEET_WIDTH, height: 900 } });

	return {
		async height(doc: CanvasDoc): Promise<number> {
			await page.setContent(sheetDocument(doc), { waitUntil: 'load' });
			// The fonts are inlined, so this resolves without a network — but the
			// sheet's height is a text-layout answer and the wrong faces give the
			// wrong one.
			await page.evaluate('document.fonts.ready');
			const measured = await page.evaluate('document.documentElement.scrollHeight');
			return Math.ceil(Number(measured));
		},
		async close(): Promise<void> {
			await browser.close();
		}
	};
}
