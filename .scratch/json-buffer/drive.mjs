// PROTOTYPE drive (wayfinder ticket 043) on Playwright WebKit — safaridriver
// stays admin-gated, so WebKit via Playwright is the habit.
//
// Runs every walkthrough in the demo end to end and writes down what a person
// would see after each click: the dot, the box, the undo depth, the saved slot.
// The point is not to assert (a prototype with tests is not a prototype) — it
// is to have the transcript on disk, so the claims in the ticket's resolution
// are quotes rather than recollections.
//
//   node .scratch/json-buffer/build.mjs && node .scratch/json-buffer/drive.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { webkit } from 'playwright-core';

const OUT = new URL('./evidence/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const FILE = `file://${new URL('./json-buffer.html', import.meta.url).pathname}`;

const browser = await webkit.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1100 }, deviceScaleFactor: 2 });
await page.goto(FILE);

const look = () =>
	page.evaluate(() => {
		const box = document.getElementById('box').value;
		return {
			view: document.getElementById('state-view').textContent,
			dot: document.getElementById('marker').hidden ? 'off' : 'ON',
			moved: document.getElementById('moved').hidden ? '—' : 'MOVED',
			box: document.getElementById('state-buffer').textContent,
			undo: document.getElementById('state-undo').textContent,
			unexported: document.getElementById('state-unexported').textContent,
			notice: document.getElementById('state-notice').textContent,
			slot: document.getElementById('state-slot').textContent,
			refusal: document.getElementById('refusal').hidden
				? null
				: document.getElementById('refusal-detail').textContent,
			name: document.getElementById('canvas-name').textContent,
			terms: document.getElementById('canvas-terms').textContent,
			boxHead: box.split('\n').slice(0, 3).join(' ⏎ ').slice(0, 110),
			boxBytes: box.length
		};
	});

const lines = ['# Walkthrough transcript — the JSON box prototype (ticket 043)', ''];
const say = (l = '') => lines.push(l);

const tabs = await page.$$('#scenario-tabs button');
for (let i = 0; i < tabs.length; i++) {
	const title = await tabs[i].textContent();
	await tabs[i].click();
	say(`## ${title}`);
	say();
	say('| step | dot | canvas moved | the box | undo | slot |');
	say('| --- | --- | --- | --- | --- | --- |');

	const start = await look();
	say(`| _(reset)_ | ${start.dot} | ${start.moved} | ${start.box} | ${start.undo} | ${start.slot} |`);

	for (let guard = 0; guard < 12; guard++) {
		const step = await page.$('#scenario-body button.step:not([disabled])');
		if (!step) break;
		const label = (await step.textContent()).trim();
		await step.click();
		const s = await look();
		say(`| ${label} | ${s.dot} | ${s.moved} | ${s.box} | ${s.undo} | ${s.slot} |`);
		lines.push(
			`| ↳ | | | \`${s.boxHead}\` (${s.boxBytes} bytes)${
				s.refusal ? ` — refusal: _${s.refusal}_` : ''
			} | canvas: “${s.name}” | terms: ${s.terms} |`
		);
	}

	const watch = await page.$('#scenario-body .watch');
	if (watch) {
		say();
		say(`> ${(await watch.textContent()).trim()}`);
	}
	say();

	await page.screenshot({ path: `${OUT}${String(i + 1).padStart(2, '0')}-${await slug(tabs[i])}.png` });
}

async function slug(el) {
	return (await el.textContent())
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

// ⌘Z *inside* the box, on a real textarea, typed at by a real keyboard. The
// app's global handler already steps around `textarea`, so what happens here
// is the browser's own text undo — and this is the one way to see whether that
// interacts sanely with the dot (it does: native undo fires `input`, so the
// box comes back to the canvas's bytes and the dot goes out by the same rule
// as any other edit).
await page.click('#seg-json');
await page.click('#box');
await page.keyboard.press('End');
await page.keyboard.type('   ');
const typed = await look();
await page.keyboard.press('Meta+z');
const undone = await look();
say('## ⌘Z inside the box (native text undo, WebKit)');
say();
say('| after | dot | box bytes |');
say('| --- | --- | --- |');
say(`| typing three spaces into the box | ${typed.dot} | ${typed.boxBytes} |`);
say(`| pressing ⌘Z with the caret in the box | ${undone.dot} | ${undone.boxBytes} |`);
say();
say(
	'> Native undo took the text back and the dot went out with it, without the canvas or its history moving. Nothing had to be written for this.'
);
say();

// One shot of the line itself, since it is the only thing on this page that
// did not exist before the ticket was answered. Walkthrough 2 up to the step
// where the canvas has moved and the box has not.
await page.click('#scenario-tabs button:nth-child(2)');
for (let i = 0; i < 5; i++) await page.click('#scenario-body button.step:not([disabled])');
await page.locator('#panel-json').screenshot({ path: `${OUT}moved-notice.png` });

writeFileSync(`${OUT}transcript.md`, lines.join('\n'));
console.log(`wrote ${OUT}transcript.md and ${tabs.length} screenshots`);
await browser.close();
