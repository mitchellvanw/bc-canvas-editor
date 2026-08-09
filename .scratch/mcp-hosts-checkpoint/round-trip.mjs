// MCP hosts checkpoint (wayfinder ticket 030), half two: the round-trip
// property, driven across the real boundary rather than inside a test harness.
//
// Out: the canvas `drive-server.mjs` wrote goes through the live app's own
// Import… control, renders, and is exported back — the bytes have to match.
// In: what the app exports (both the Canvas file and the HTML artifact) goes
// back through the built server, which has to read it unchanged.
//
// The only difference allowed in either direction is the trailing newline
// SPEC §3.5 defines: the committed/written file is serializer bytes plus "\n",
// the app's export is the serializer bytes.
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { webkit } from 'playwright-core';

const REPO = new URL('../../', import.meta.url).pathname.replace(/\/$/, '');
const OUT = new URL('./evidence/', import.meta.url).pathname;
const APP = 'https://bc-canvas.pages.dev/';
mkdirSync(OUT, { recursive: true });

const CLIENT_PKG = join(REPO, 'mcp', 'node_modules', '@modelcontextprotocol', 'client');
const { Client } = await import(join(CLIENT_PKG, 'dist', 'index.mjs'));
const { StdioClientTransport } = await import(join(CLIENT_PKG, 'dist', 'stdio.mjs'));
const SERVER = join(REPO, 'mcp', 'dist', 'server.js');

const facts = { out: {}, in: {}, network: null };
const fail = (msg) => {
	throw new Error(msg);
};

// What the server wrote, in half one. Serializer bytes plus the newline.
const WRITTEN = readFileSync(OUT + 'canvas-mcp-server.bcc.json', 'utf8');
const EMBED_OPEN = '<script type="application/json" data-canvas-file>';
const extractEmbedded = (text) => {
	const open = text.indexOf(EMBED_OPEN);
	if (open < 0) return null;
	const start = open + EMBED_OPEN.length;
	const close = text.indexOf('</scr' + 'ipt>', start);
	return close < 0 ? null : text.slice(start, close).trim();
};

const browser = await webkit.launch();
let exportedJson;
let exportedHtml;
try {
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
	const hosts = new Set();
	page.on('request', (r) => hosts.add(new URL(r.url()).host));

	await page.goto(APP, { waitUntil: 'networkidle' });
	await page.waitForSelector('h1');

	// ── out: the server's bytes go in through the real Import… path ──────────
	const source = OUT + 'canvas-mcp-server.bcc.json';
	await page.setInputFiles('input[type=file]', source);
	await page.waitForFunction(() =>
		document.querySelector('h1')?.textContent?.includes('Canvas MCP Server')
	);
	if (await page.evaluate(() => !!document.querySelector('dialog[open]')))
		fail('a dialog opened importing over the pristine sheet');

	// It renders — one spot-check per section kind that could silently drop.
	const SPOTS = [
		'Digest', // ubiquitous language term
		'MCP Host', // inbound collaborator
		'Read Canvas', // inbound message
		'BC Canvas Editor', // outbound collaborator
		'gateway context', // domain role
		'supporting', // strategic classification
		'Nothing is read or written outside the root.', // business decision
		'Does a facilitated workshop need row-level edits, or is a whole-document rewrite enough?' // open question
	];
	facts.out.rendered = {};
	for (const spot of SPOTS) {
		const seen = await page
			.getByText(spot, { exact: false })
			.first()
			.isVisible()
			.catch(() => false);
		if (!seen) fail(`imported canvas does not show "${spot}"`);
		facts.out.rendered[spot] = true;
	}
	await page.screenshot({ path: OUT + 'imported-canvas-mcp-server.png', fullPage: true });

	// A fresh import lands clean — nothing to export yet.
	facts.out.landedClean = !(await page.evaluate(() =>
		document.body.textContent.includes('Unexported changes')
	));
	if (!facts.out.landedClean) fail('a fresh import landed dirty');

	// ── back out through Export, without touching the canvas ─────────────────
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

	const json = await exportVia('Canvas file');
	exportedJson = json.bytes.toString('utf8');
	writeFileSync(OUT + 'exported-' + json.download, json.bytes);
	facts.out.canvasFile = {
		download: json.download,
		byteIdentical: exportedJson === WRITTEN,
		identicalUpToTrailingNewline: exportedJson === WRITTEN.replace(/\n$/, ''),
		writtenBytes: WRITTEN.length,
		exportedBytes: exportedJson.length
	};
	if (!facts.out.canvasFile.identicalUpToTrailingNewline)
		fail('the app re-exported the server’s canvas with different bytes');

	const html = await exportVia('HTML artifact');
	exportedHtml = html.bytes.toString('utf8');
	writeFileSync(OUT + 'exported-' + html.download, html.bytes);
	facts.out.htmlArtifact = {
		download: html.download,
		bytes: html.bytes.length,
		embedsWrittenBytes: extractEmbedded(exportedHtml) === WRITTEN.trimEnd()
	};
	if (!facts.out.htmlArtifact.embedsWrittenBytes)
		fail('the artifact’s embedded canvas diverges from the server’s bytes');

	facts.network = [...hosts].sort();
} finally {
	await browser.close();
}

// ── in: what the app exported goes back through the built server ────────────
const root = mkdtempSync(join(tmpdir(), 'bcc-roundtrip-'));
writeFileSync(join(root, 'from-app.bcc.json'), exportedJson);
writeFileSync(join(root, 'from-app.bcc.html'), exportedHtml);

const client = new Client({ name: 'mcp-round-trip', version: '0.0.1' });
await client.connect(
	new StdioClientTransport({ command: process.execPath, args: [SERVER, '--root', root] })
);
try {
	const textOf = (r) =>
		r.content
			.filter((c) => c.type === 'text')
			.map((c) => c.text)
			.join('\n');

	const list = await client.callTool({ name: 'bcc_list_canvases', arguments: {} });
	facts.in.listed = list.structuredContent.canvases.map((c) => ({ path: c.path, name: c.name }));
	facts.in.problems = list.structuredContent.problems;
	if (facts.in.problems.length !== 0) fail(`the app's exports would not read: ${JSON.stringify(facts.in.problems)}`);

	// The exported Canvas file reads back as exactly what the app produced.
	const readJson = await client.callTool({
		name: 'bcc_read_canvas',
		arguments: { path: 'from-app.bcc.json', view: 'json' }
	});
	if (readJson.isError) fail(`the exported Canvas file was refused: ${textOf(readJson)}`);
	facts.in.canvasFile = {
		byteIdentical: textOf(readJson) === exportedJson,
		identicalUpToTrailingNewline: textOf(readJson).trimEnd() === exportedJson.trimEnd()
	};
	if (!facts.in.canvasFile.identicalUpToTrailingNewline)
		fail('reading the app’s export back changed the bytes');

	// The artifact reads through its embedded Canvas file, same bytes.
	const readHtml = await client.callTool({
		name: 'bcc_read_canvas',
		arguments: { path: 'from-app.bcc.html', view: 'json' }
	});
	if (readHtml.isError) fail(`the exported artifact was refused: ${textOf(readHtml)}`);
	facts.in.htmlArtifact = {
		matchesExportedJson: textOf(readHtml).trimEnd() === exportedJson.trimEnd(),
		matchesServerBytes: textOf(readHtml).trimEnd() === WRITTEN.trimEnd()
	};
	if (!facts.in.htmlArtifact.matchesServerBytes)
		fail('the artifact round trip lost the original bytes');

	// And the whole loop closes: write what came back out of the artifact, and
	// land on the bytes the server wrote in the first place.
	const rewritten = await client.callTool({
		name: 'bcc_write_canvas',
		arguments: { path: 'closed-loop.bcc.json', canvas: JSON.parse(textOf(readHtml)) }
	});
	if (rewritten.isError) fail(`closing the loop was refused: ${textOf(rewritten)}`);
	facts.in.closedLoopByteIdentical =
		readFileSync(join(root, 'closed-loop.bcc.json'), 'utf8') === WRITTEN;
	if (!facts.in.closedLoopByteIdentical) fail('the closed loop did not land on the original bytes');
} finally {
	await client.close();
}

writeFileSync(OUT + 'round-trip.json', JSON.stringify(facts, null, '\t'));
console.log(JSON.stringify(facts, null, '\t'));
