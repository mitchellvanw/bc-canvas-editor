// Examples live checkpoint (wayfinder ticket 024) on Playwright WebKit,
// run against the production origin — drives the shipped UI, no /src imports.
// Gate lines: chooser opens + all four examples render; gate fires/dirty/clean
// semantics; all three exports off an opened example with the artifact-leak
// rider; the specced keyboard path.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { webkit } from 'playwright-core';

const APP = 'https://bc-canvas.pages.dev/';
const OUT = new URL('./evidence/', import.meta.url).pathname;
const EXAMPLES_DIR = new URL('../../examples/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

// Roster in menu order, with a render spot-check unique to each canvas.
const ROSTER = [
	{ name: 'Order Fulfillment', file: 'order-fulfillment.bcc.json', oneLiner: 'picking, packing', spot: ['Shipment', 'Checkout'] },
	{ name: 'Notifications', file: 'notifications.bcc.json', oneLiner: 'preferred channel', spot: ['Channel', 'Order Fulfillment'] },
	{ name: 'Appointment Scheduling', file: 'appointment-scheduling.bcc.json', oneLiner: 'no-shows', spot: ['Slot', 'Patient Portal'] },
	{ name: 'Royalty Distribution', file: 'royalty-distribution.bcc.json', oneLiner: 'Captured mid-workshop.', spot: ['Split Sheet', 'Consumption Reporting'] }
];
const committed = (f) => readFileSync(EXAMPLES_DIR + f, 'utf8');

const EMBED_OPEN = '<script type="application/json" data-canvas-file>';
const extractEmbedded = (text) => {
	const open = text.indexOf(EMBED_OPEN);
	if (open < 0) return null;
	const start = open + EMBED_OPEN.length;
	const close = text.indexOf('</scr' + 'ipt>', start);
	return close < 0 ? null : text.slice(start, close).trim();
};

const facts = { examples: {}, gate: {}, exports: {}, keyboard: {} };
const fail = (msg) => {
	throw new Error(msg);
};
const browser = await webkit.launch();
try {
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
	const requests = [];
	page.on('request', (r) => requests.push(r.url()));

	await page.goto(APP, { waitUntil: 'networkidle' });
	await page.waitForSelector('h1');

	const unexported = () =>
		page.evaluate(() => document.body.textContent.includes('Unexported changes'));
	const gateOpen = () => page.evaluate(() => !!document.querySelector('dialog[open]'));
	const h1 = async () => ((await page.locator('h1').first().textContent()) ?? '').trim();

	// ── pristine load is clean
	if (await unexported()) fail('pristine load shows Unexported changes');

	// ── chooser opens: four two-line entries, right copy, mid-workshop flag
	await page.getByRole('button', { name: 'Examples' }).click();
	const items = page.getByRole('menuitem');
	if ((await items.count()) !== 4) fail(`expected 4 menu items, got ${await items.count()}`);
	for (let i = 0; i < 4; i++) {
		const text = ((await items.nth(i).textContent()) ?? '').replace(/\s+/g, ' ');
		if (!text.includes(ROSTER[i].name) || !text.includes(ROSTER[i].oneLiner))
			fail(`entry ${i} wrong: ${text}`);
	}
	await page.screenshot({ path: OUT + 'menu-open.png' });
	facts.menu = 'four entries, names + one-liners + mid-workshop flag verified';

	// ── every roster canvas loads clean and renders; no gate over a clean canvas
	for (const [i, ex] of ROSTER.entries()) {
		if (i > 0) await page.getByRole('button', { name: 'Examples' }).click();
		await page.getByRole('menuitem').nth(i).click();
		await page.waitForFunction(
			(name) => document.querySelector('h1')?.textContent?.includes(name),
			ex.name
		);
		if (await gateOpen()) fail(`gate fired over a clean canvas opening ${ex.name}`);
		if (await unexported()) fail(`${ex.name} landed dirty`);
		for (const s of ex.spot) {
			if (!(await page.getByText(s, { exact: false }).first().isVisible().catch(() => false)))
				fail(`${ex.name}: expected "${s}" on the sheet`);
		}
		await page.screenshot({ path: OUT + `loaded-${ex.file.replace('.bcc.json', '')}.png`, fullPage: true });
		facts.examples[ex.name] = 'loads clean, gate silent, spot-checks render';
	}

	// ── first edit dirties; the gate fires over unexported changes
	await page.locator('h1').click();
	await page.keyboard.type(' Draft');
	await page.keyboard.press('Tab');
	await page.getByText('Unexported changes').waitFor();
	facts.gate.firstEditDirties = true;

	await page.getByRole('button', { name: 'Examples' }).click();
	await page.getByRole('menuitem').nth(0).click();
	const gate = page.locator('dialog[open]');
	await gate.waitFor();
	const gateText = ((await gate.textContent()) ?? '').replace(/\s+/g, ' ');
	if (!gateText.includes('Opening an example replaces the canvas and clears undo history.'))
		fail(`gate copy wrong: ${gateText}`);
	await page.screenshot({ path: OUT + 'gate.png' });

	// Cancel keeps the dirty canvas untouched
	await gate.getByRole('button', { name: 'Cancel' }).click();
	if (await gateOpen()) fail('Cancel left the gate open');
	if (!(await h1()).includes('Royalty Distribution Draft')) fail(`Cancel lost the canvas: ${await h1()}`);
	if (!(await unexported())) fail('Cancel cleared Unexported changes');
	facts.gate.cancelKeeps = true;

	// Replace proceeds and lands clean
	await page.getByRole('button', { name: 'Examples' }).click();
	await page.getByRole('menuitem').nth(0).click();
	await page.locator('dialog[open]').getByRole('button', { name: 'Replace' }).click();
	await page.waitForFunction(() =>
		document.querySelector('h1')?.textContent?.includes('Order Fulfillment')
	);
	if (await unexported()) fail('example after Replace landed dirty');
	facts.gate.replaceLandsClean = true;

	// ── exports off an opened example: Royalty Distribution (the leak-sharpest)
	await page.getByRole('button', { name: 'Examples' }).click();
	await page.getByRole('menuitem').nth(3).click();
	await page.waitForFunction(() =>
		document.querySelector('h1')?.textContent?.includes('Royalty Distribution')
	);
	if (await gateOpen()) fail('gate fired opening RD over a clean canvas');

	await page.evaluate(() => {
		window.__clicks = [];
		HTMLAnchorElement.prototype.click = function () {
			window.__clicks.push({ href: this.href, download: this.download });
		};
		URL.revokeObjectURL = () => {};
	});
	const exportVia = async (item) => {
		const before = await page.evaluate(() => window.__clicks.length);
		await page.click('button:has-text("Export")');
		await page.click(`[role="menuitem"]:has-text("${item}")`);
		await page.waitForFunction((n) => window.__clicks.length > n, before);
		const click = await page.evaluate(() => window.__clicks.at(-1));
		const body = await page.evaluate(async (href) => {
			const blob = await fetch(href).then((r) => r.blob());
			const fr = new FileReader();
			return new Promise((res, rej) => {
				fr.onload = () => res(fr.result);
				fr.onerror = () => rej(fr.error);
				fr.readAsDataURL(blob);
			});
		}, click.href);
		return { download: click.download, bytes: Buffer.from(body.split(',')[1], 'base64') };
	};

	const committedRD = committed('royalty-distribution.bcc.json');

	// Canvas file: a clean example exports its committed bytes
	const json = await exportVia('Canvas file');
	writeFileSync(OUT + json.download, json.bytes);
	const jsonText = json.bytes.toString('utf8');
	facts.exports.canvasFile = {
		download: json.download,
		byteIdentical: jsonText === committedRD,
		trimmedIdentical: jsonText.trimEnd() === committedRD.trimEnd()
	};
	if (!facts.exports.canvasFile.trimmedIdentical)
		fail('Canvas-file export diverges from committed example bytes');

	// HTML artifact: embeds the committed bytes; nothing chooser- or beacon-shaped
	const html = await exportVia('HTML artifact');
	writeFileSync(OUT + html.download, html.bytes);
	const text = html.bytes.toString('utf8');
	facts.exports.htmlArtifact = {
		download: html.download,
		bytes: html.bytes.length,
		embedsCommittedBytes: extractEmbedded(text) === committedRD.trimEnd(),
		leaks: {
			midWorkshopFlag: text.includes('Captured mid-workshop.'),
			examplesMenu: text.includes('role="menu"'),
			insights: text.includes('cloudflareinsights'),
			beaconAttr: text.includes('data-cf-beacon'),
			liveOrigin: text.includes('bc-canvas.pages.dev')
		},
		rendersContent: text.includes('Royalty Distribution') && text.includes('Split Sheet')
	};
	if (!facts.exports.htmlArtifact.embedsCommittedBytes) fail('artifact embed diverges from committed bytes');
	if (Object.values(facts.exports.htmlArtifact.leaks).some(Boolean))
		fail(`artifact leak: ${JSON.stringify(facts.exports.htmlArtifact.leaks)}`);

	// PNG image
	const png = await exportVia('PNG image');
	writeFileSync(OUT + png.download, png.bytes);
	facts.exports.png = {
		download: png.download,
		bytes: png.bytes.length,
		magicOk: png.bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
	};
	if (!facts.exports.png.magicOk) fail('PNG magic bytes wrong');

	// ── keyboard path (SPEC §10 menu grammar; WebKit tabs with Alt+Tab)
	await page.getByRole('button', { name: 'Examples' }).focus();
	await page.keyboard.press('Enter');
	if ((await page.getByRole('menuitem').count()) !== 4) fail('Enter did not open the menu');
	await page.keyboard.press('Alt+Tab');
	const onItem = await page.evaluate(() => document.activeElement?.getAttribute('role'));
	if (onItem !== 'menuitem') fail(`Tab landed on role=${onItem}, not menuitem`);
	await page.keyboard.press('Enter');
	await page.waitForFunction(() =>
		document.querySelector('h1')?.textContent?.includes('Order Fulfillment')
	);
	if (await unexported()) fail('keyboard-opened example landed dirty');
	facts.keyboard.enterTabEnterOpens = true;

	await page.getByRole('button', { name: 'Examples' }).focus();
	await page.keyboard.press('Enter');
	await page.keyboard.press('Alt+Tab');
	await page.keyboard.press('Escape');
	if ((await page.getByRole('menuitem').count()) !== 0) fail('Esc left the menu open');
	const focused = await page.evaluate(() => document.activeElement?.textContent?.trim());
	if (focused !== 'Examples') fail(`focus after Esc on: ${focused}`);
	facts.keyboard.escClosesAndRestoresFocus = true;

	// ── network audit ride-along
	const hosts = [...new Set(requests.map((u) => new URL(u).host))].sort();
	facts.hosts = hosts;
	facts.thirdPartyBeyondBeacon = hosts.filter(
		(h) => h !== 'bc-canvas.pages.dev' && !h.endsWith('cloudflareinsights.com')
	);

	console.log(JSON.stringify(facts, null, 2));
	console.log('EXAMPLES LIVE CHECKPOINT: all green');
} finally {
	await browser.close();
}
