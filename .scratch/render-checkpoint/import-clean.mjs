// Leg 6, the "opens unchanged" half: importing a CLI-written (fmt-canonical)
// canvas must leave the editor clean — no Unexported changes, no undo history.
import { join } from 'node:path';
import { webkit } from 'playwright-core';

const SPECIMENS = new URL('./specimens/', import.meta.url).pathname;
const APP = 'http://localhost:4173/';

const browser = await webkit.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
await page.goto(APP, { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('h1');

for (const stem of ['edge-canvas', 'order-fulfillment']) {
	await page.setInputFiles('input[type="file"]', join(SPECIMENS, `${stem}.bcc.json`));
	await page.waitForTimeout(300);
	const state = await page.evaluate(() => ({
		heading: document.querySelector('h1')?.textContent?.trim(),
		dirty: document.body.textContent.includes('Unexported changes'),
		undoEnabled: !document.querySelector('button[title^="Undo"]').disabled
	}));
	console.log(stem, JSON.stringify(state));
	if (state.dirty || state.undoEnabled) {
		console.log('RED: import left the editor dirty or with history');
		process.exit(1);
	}
}
console.log('clean imports: no Unexported changes, no undo history');
await browser.close();
