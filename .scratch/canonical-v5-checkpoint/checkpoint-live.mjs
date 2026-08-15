// Canonical-v5 checkpoint, LIVE-ORIGIN leg (wayfinder ticket 040's unre-run
// half) on Playwright WebKit against https://bc-canvas.pages.dev — the leg the
// 2026-08-11 gate could not run because origin still served v1 at the time.
//
// Derived from checkpoint.mjs with the two changes that landed since the gate:
// - the editor lives at /edit (homepage graduation, 2026-08-15 deploy)
// - Canvas-file exports carry the §3.5 trailing newline (ticket 064), so the
//   export is expected byte-identical to the committed file, newline included.
// The MCP leg is omitted: it exercises the local built server, not the origin,
// and stayed green through the 040 and 060 gates.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { webkit } from 'playwright-core';

const REPO = new URL('../../', import.meta.url).pathname.replace(/\/$/, '');
const OUT = new URL('./evidence-live/', import.meta.url).pathname;
const APP = 'https://bc-canvas.pages.dev/edit';
mkdirSync(OUT, { recursive: true });

const V1_SPECIMEN = join(REPO, '.scratch', 'mcp-hosts-checkpoint', 'host-drive', 'canvas-editing.bcc.json');

const ROSTER = [
	{ name: 'Order Fulfillment', file: 'order-fulfillment.bcc.json' },
	{ name: 'Notifications', file: 'notifications.bcc.json' },
	{ name: 'Appointment Scheduling', file: 'appointment-scheduling.bcc.json' },
	{ name: 'Royalty Distribution', file: 'royalty-distribution.bcc.json' }
];
const committed = (f) => readFileSync(join(REPO, 'examples', f), 'utf8');

const EMBED_OPEN = '<script type="application/json" data-canvas-file>';
const extractEmbedded = (text) => {
	const open = text.indexOf(EMBED_OPEN);
	if (open < 0) return null;
	const start = open + EMBED_OPEN.length;
	const close = text.indexOf('</scr' + 'ipt>', start);
	return close < 0 ? null : text.slice(start, close).trim();
};

const PANELS = [
	'Purpose',
	'Strategic classification',
	'Domain roles',
	'Inbound communication',
	'Ubiquitous language',
	'Business decisions',
	'Outbound communication',
	'Assumptions',
	'Verification metrics',
	'Open questions'
];

const facts = { origin: APP, one: { app: {} }, two: {}, three: {}, network: null };
const fail = (msg) => {
	throw new Error(msg);
};

const browser = await webkit.launch();
try {
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
	const hosts = new Set();
	page.on('request', (r) => hosts.add(new URL(r.url()).host));

	await page.goto(APP, { waitUntil: 'networkidle' });
	await page.waitForSelector('h1');

	const armExports = () =>
		page.evaluate(() => {
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

	// ── part one, app leg: the v1 specimen through the real Import… path ──────
	await page.setInputFiles('input[type=file]', V1_SPECIMEN);
	await page.waitForFunction(() =>
		document.querySelector('h1')?.textContent?.includes('Canvas Editing')
	);
	if (await page.evaluate(() => !!document.querySelector('dialog[open]')))
		fail('a dialog opened importing the v1 canvas');
	if (await page.evaluate(() => document.body.textContent.includes('Unexported changes')))
		fail('the v1 import landed dirty');

	const labels = await page.locator('h2.panel__label').allTextContents();
	facts.one.app.panels = labels.map((l) => l.trim());
	if (labels.length !== 10) fail(`expected 10 panel labels, got ${labels.length}: ${labels}`);
	for (const p of PANELS) if (!labels.some((l) => l.trim() === p)) fail(`panel missing: ${p}`);
	facts.one.app.cautionRings = await page.locator('.role--caution').count();
	if (facts.one.app.cautionRings < 1) fail('no caution ring on brain context');
	const oursShown = await page.locator('.rel__ours').allTextContents();
	if (!oursShown.some((t) => t.includes('open-host-service')))
		fail(`migrated relationship not on ours: ${oursShown}`);
	facts.one.app.migratedOursRendered = true;
	await page.screenshot({ path: OUT + 'imported-v1-canvas-editing.png', fullPage: true });

	await armExports();
	const json = await exportVia('Canvas file');
	const appV2 = json.bytes.toString('utf8');
	writeFileSync(OUT + 'app-' + json.download, json.bytes);
	const parsed = JSON.parse(appV2);
	facts.one.app.export = {
		download: json.download,
		version: parsed.version,
		endsWithNewline: appV2.endsWith('\n'),
		hasPurpose: 'purpose' in parsed,
		hasDescription: 'description' in parsed,
		collaboratorsAreObjects: [...parsed.inboundCommunication, ...parsed.outboundCommunication].every(
			(l) => typeof l.collaborator === 'object'
		),
		relationshipsAreObjects: [...parsed.inboundCommunication, ...parsed.outboundCommunication].every(
			(l) => l.relationship === undefined || typeof l.relationship === 'object'
		)
	};
	if (parsed.version !== 2) fail('the app exported something other than v2');
	if (!facts.one.app.export.endsWithNewline) fail('export lost the §3.5 trailing newline (064)');
	if (!facts.one.app.export.hasPurpose || facts.one.app.export.hasDescription)
		fail('purpose/description migration wrong in the export');

	const art = await exportVia('HTML artifact');
	writeFileSync(OUT + 'app-' + art.download, art.bytes);
	facts.one.app.artifactEmbedsExport =
		extractEmbedded(art.bytes.toString('utf8')) === appV2.trimEnd();
	if (!facts.one.app.artifactEmbedsExport) fail('artifact embed diverges from the Canvas-file export');

	const png1 = await exportVia('PNG image');
	writeFileSync(OUT + 'app-' + png1.download, png1.bytes);

	// ── part two: the four examples byte-exact through the live path ──────────
	for (const [i, ex] of ROSTER.entries()) {
		await page.getByRole('button', { name: 'Examples' }).click();
		await page.getByRole('menuitem').nth(i).click();
		if (await page.evaluate(() => !!document.querySelector('dialog[open]')))
			fail(`gate fired over a clean canvas opening ${ex.name}`);
		await page.waitForFunction(
			(name) => document.querySelector('h1')?.textContent?.includes(name),
			ex.name
		);
		await armExports();
		const want = committed(ex.file);
		const got = await exportVia('Canvas file');
		const gotText = got.bytes.toString('utf8');
		const html = await exportVia('HTML artifact');
		facts.two[ex.name] = {
			byteIdentical: gotText === want,
			version: JSON.parse(gotText).version,
			artifactEmbedsCommitted: extractEmbedded(html.bytes.toString('utf8')) === want.trimEnd()
		};
		if (!facts.two[ex.name].byteIdentical)
			fail(`${ex.name}: export diverges from committed bytes (newline included, post-064)`);
		if (!facts.two[ex.name].artifactEmbedsCommitted)
			fail(`${ex.name}: artifact embed diverges from committed bytes`);
		if (ex.file === 'order-fulfillment.bcc.json') {
			writeFileSync(OUT + 'example-' + html.download, html.bytes);
			const png = await exportVia('PNG image');
			writeFileSync(OUT + 'example-' + png.download, png.bytes);
			facts.three.pngExport = 'example-' + png.download;
			facts.three.artifactExport = 'example-' + html.download;
		}
	}

	// ── part three, DOM walk on Order Fulfillment (reopen it) ─────────────────
	await page.getByRole('button', { name: 'Examples' }).click();
	await page.getByRole('menuitem').nth(0).click();
	await page.waitForFunction(() =>
		document.querySelector('h1')?.textContent?.includes('Order Fulfillment')
	);
	const labels2 = (await page.locator('h2.panel__label').allTextContents()).map((l) => l.trim());
	if (labels2.length !== 10) fail(`OF: expected 10 panels, got ${labels2.length}`);
	facts.three.panels = labels2;

	const theirs = await page.locator('.rel__theirs').allTextContents();
	const ours = await page.locator('.rel__ours').allTextContents();
	facts.three.twoSided =
		theirs.some((t) => t.includes('big-ball-of-mud')) &&
		ours.some((t) => t.includes('anticorruption-layer'));
	facts.three.symmetric =
		theirs.some((t) => t.includes('published-language')) &&
		ours.some((t) => t.includes('published-language'));
	if (!facts.three.twoSided) fail('Warehouse two-sided relationship not rendered');
	if (!facts.three.symmetric) fail('Carriers symmetric relationship not rendered');

	facts.three.kindSlots = await page.evaluate(
		() => document.querySelectorAll('[aria-label^="Collaborator kind for"]').length
	);
	if (facts.three.kindSlots < 6)
		fail(`OF: expected a kind slot on all six lanes, got ${facts.three.kindSlots}`);
	const legend = ((await page.locator('[data-legend]').textContent()) ?? '').replace(/\s+/g, ' ');
	facts.three.legend = {
		kinds: ['bounded context', 'external system', 'frontend', 'direct user interaction'].every((k) =>
			legend.includes(k)
		),
		relationshipKey: legend.includes('theirs') && legend.includes('ours')
	};
	if (!facts.three.legend.kinds || !facts.three.legend.relationshipKey)
		fail(`legend incomplete: ${legend}`);
	facts.three.roleWordOnLanes = await page.evaluate(() =>
		[...document.querySelectorAll('.lane [aria-label], .lane button')].some((n) =>
			(n.getAttribute('aria-label') ?? '').toLowerCase().includes('role')
		)
	);
	await page.screenshot({ path: OUT + 'sheet-order-fulfillment.png', fullPage: true });

	facts.three.centreBox = await page.evaluate(() => {
		const labels = [...document.querySelectorAll('h2.panel__label')];
		const ul = labels.find((l) => l.textContent.trim() === 'Ubiquitous language');
		const bd = labels.find((l) => l.textContent.trim() === 'Business decisions');
		if (!ul || !bd) return false;
		let a = ul.parentElement;
		while (a && !a.contains(bd)) a = a.parentElement;
		return a ? { tag: a.tagName, cls: a.className } : false;
	});

	facts.network = [...hosts].sort();

	// ── part three, the artifact render (exported from the live origin) ───────
	const artPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
	await artPage.goto('file://' + OUT + facts.three.artifactExport, { waitUntil: 'load' });
	await artPage.waitForSelector('h1');
	const artLabels = (await artPage.locator('h2.panel__label').allTextContents()).map((l) => l.trim());
	facts.three.artifactPanels = artLabels;
	if (artLabels.length !== 10) fail(`artifact: expected 10 panels, got ${artLabels.length}`);
	const artLegend = ((await artPage.locator('[data-legend]').textContent()) ?? '').replace(/\s+/g, ' ');
	facts.three.artifactLegendComplete =
		['bounded context', 'external system', 'frontend', 'direct user interaction', 'theirs', 'ours'].every(
			(k) => artLegend.includes(k)
		);
	facts.three.artifactSr = await artPage.evaluate(() => {
		const texts = [...document.querySelectorAll('.sr-only')].map((n) => n.textContent ?? '');
		return {
			kindPrefixes: texts.filter((t) =>
				/Bounded context: |External system: |Frontend: |Direct user interaction: /.test(t)
			).length,
			collaboratorSide: texts.filter((t) => t === 'Collaborator: ').length,
			ourSide: texts.filter((t) => t === 'this context: ').length,
			roleWord: texts.some((t) => /\brole\b/i.test(t) && !/anti-pattern/.test(t))
		};
	});
	if (facts.three.artifactSr.kindPrefixes < 6)
		fail(`artifact: expected spoken kinds on all six lanes, got ${facts.three.artifactSr.kindPrefixes}`);
	await artPage.screenshot({ path: OUT + 'artifact-order-fulfillment.png', fullPage: true });
	await artPage.close();
} finally {
	await browser.close();
}

writeFileSync(OUT + 'checkpoint.json', JSON.stringify(facts, null, '\t'));
console.log(JSON.stringify(facts, null, '\t'));
console.log('CANONICAL V5 LIVE-ORIGIN CHECKPOINT: all green');
