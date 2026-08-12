// PROTOTYPE capture (wayfinder ticket 042) on Playwright WebKit — safaridriver
// stays admin-gated, so WebKit via Playwright is the habit.
//
// Four variants of the View switcher × the three Views × the responsive tiers
// the sheet reflows through (SPEC §5). Widths are the *page* widths that put
// the sheet container into each tier: canonical, trim (≤1060), two-column
// (≤880), stack (≤620). Plus a focus-ring shot per variant, because §8.4's
// ring has to look deliberate rather than bolted on.
import { mkdirSync } from 'node:fs';
import { webkit } from 'playwright-core';

const OUT = new URL('./evidence/', import.meta.url).pathname;
const APP = 'http://localhost:5177/';
mkdirSync(OUT, { recursive: true });

const VARIANTS = ['A', 'B', 'C', 'D'];
// The gutters are px-10 (40px) each side at lg, so page width ≈ container + 80.
const TIERS = [
	{ name: '1-canonical', width: 1440, height: 1500 },
	{ name: '2-trim', width: 1080, height: 1500 },
	{ name: '3-two-col', width: 900, height: 1900 },
	{ name: '4-stack', width: 660, height: 2600 }
];

const browser = await webkit.launch();
const shots = [];

for (const variant of VARIANTS) {
	for (const tier of TIERS) {
		const page = await browser.newPage({
			viewport: { width: tier.width, height: tier.height },
			deviceScaleFactor: 2
		});
		await page.goto(`${APP}?switcher=${variant}`, { waitUntil: 'networkidle' });
		await page.evaluate(() => document.fonts.ready);

		// Sheet view, whole page: the switcher in situ with the real chrome.
		await page.screenshot({ path: `${OUT}${variant}-${tier.name}-sheet.png`, fullPage: false });
		shots.push(`${variant}-${tier.name}-sheet.png`);

		// Only the canonical tier needs the other two Views and the details —
		// the text panels do not reflow, the strip is what changes.
		if (tier.name === '1-canonical') {
			for (const view of ['json', 'markdown']) {
				await page.getByRole('tab', { name: new RegExp(view, 'i') }).click();
				await page.waitForTimeout(120);
				await page.screenshot({ path: `${OUT}${variant}-view-${view}.png` });
				shots.push(`${variant}-view-${view}.png`);
			}

			// The unapplied-buffer marker, on the JSON tab, from the proto bar.
			await page.getByLabel('unapplied').check();
			await page.waitForTimeout(120);
			await page
				.locator('[role="tablist"]')
				.screenshot({ path: `${OUT}${variant}-marker.png` });
			shots.push(`${variant}-marker.png`);
			await page.getByLabel('unapplied').uncheck();

			// The §8.4 focus ring on a keyboard-selected tab, strip-cropped.
			await page.getByRole('tab', { name: 'Sheet' }).click();
			await page.keyboard.press('Tab'); // into the strip from the proto bar? no —
			await page.evaluate(() => {
				const tab = document.querySelector('[role="tab"][aria-selected="true"]');
				tab?.focus();
			});
			await page.keyboard.press('ArrowRight');
			await page.waitForTimeout(120);
			await page.locator('[role="tablist"]').screenshot({ path: `${OUT}${variant}-focus.png` });
			shots.push(`${variant}-focus.png`);

			// Tablist semantics, asserted rather than eyeballed.
			const semantics = await page.evaluate(() => {
				const list = document.querySelector('[role="tablist"]');
				const tabs = [...document.querySelectorAll('[role="tab"]')];
				const selected = tabs.find((t) => t.getAttribute('aria-selected') === 'true');
				const panel = document.querySelector('[role="tabpanel"]');
				return {
					tablistLabel: list?.getAttribute('aria-label'),
					tabCount: tabs.length,
					tabStops: tabs.filter((t) => t.tabIndex === 0).length,
					selectedLabel: selected?.textContent?.trim(),
					controls: selected?.getAttribute('aria-controls'),
					panelId: panel?.id,
					panelLabelledBy: panel?.getAttribute('aria-labelledby')
				};
			});
			console.log(variant, JSON.stringify(semantics));
		}

		await page.close();
	}
}

await browser.close();
console.log(`\n${shots.length} shots in ${OUT}`);
