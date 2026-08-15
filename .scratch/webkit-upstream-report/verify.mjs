// Screenshot the standalone testcase in WebKit and Chrome to confirm the
// upstream repro still fires on current engines before Mitchell files it.
import { webkit, chromium } from 'playwright-core';
const DIR = new URL('./', import.meta.url).pathname;
for (const [name, engine, opts] of [['webkit', webkit, {}], ['chrome', chromium, { channel: 'chrome' }]]) {
	const browser = await engine.launch(opts);
	const page = await browser.newPage({ viewport: { width: 960, height: 900 } });
	await page.goto('file://' + DIR + 'testcase.html');
	await page.waitForTimeout(600);
	await page.screenshot({ path: `${DIR}verify-${name}.png`, fullPage: true });
	const v = browser.version();
	await browser.close();
	console.log(name, v);
}
