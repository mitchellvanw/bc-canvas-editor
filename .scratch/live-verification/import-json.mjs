// Addendum: Canvas-file (.bcc.json) import round-trip on the live origin.
import { webkit } from 'playwright-core';

const APP = 'https://bc-canvas.pages.dev/';
const FILE = new URL('./live-checkpoint/live-checkpoint.bcc.json', import.meta.url).pathname;

const browser = await webkit.launch();
try {
	const page = await browser.newPage();
	await page.goto(APP, { waitUntil: 'networkidle' });
	await page.waitForSelector('h1');
	await page.setInputFiles('input[type="file"]', FILE);
	await page.waitForTimeout(500);
	console.log(
		JSON.stringify({
			dialogShown: await page.evaluate(() => !!document.querySelector('dialog[open]')),
			nameAfter: (await page.textContent('h1')).trim(),
			autosaveCarriesImport: await page.evaluate(() =>
				(localStorage.getItem('bcc.autosave') || '').includes('Live Checkpoint')
			)
		})
	);
} finally {
	await browser.close();
}
