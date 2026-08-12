// PROTOTYPE capture, part two (ticket 042): the top band only — chrome and
// switcher together, which is the ticket's real test ("a control that looks
// right in isolation and reads as chrome in situ has failed"). Four variants ×
// three Views, cropped to the band, so they can be held against each other.
import { mkdirSync } from 'node:fs';
import { webkit } from 'playwright-core';

const OUT = new URL('./evidence/', import.meta.url).pathname;
const APP = 'http://localhost:5177/';
mkdirSync(OUT, { recursive: true });

const browser = await webkit.launch();
for (const variant of ['A', 'B', 'C', 'D']) {
	const page = await browser.newPage({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 2
	});
	await page.goto(`${APP}?switcher=${variant}`, { waitUntil: 'networkidle' });
	await page.evaluate(() => document.fonts.ready);
	for (const view of ['Sheet', 'JSON', 'Markdown']) {
		await page.getByRole('tab', { name: view, exact: true }).click();
		await page.waitForTimeout(150);
		await page.screenshot({
			path: `${OUT}band-${variant}-${view.toLowerCase()}.png`,
			clip: { x: 0, y: 0, width: 1440, height: 330 }
		});
	}
	await page.close();
}
await browser.close();
console.log('bands written');
