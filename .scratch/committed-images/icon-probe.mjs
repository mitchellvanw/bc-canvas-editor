// Which icon technique survives an <img>-loaded SVG's foreignObject?
// 049 proved a NESTED <svg> does not draw. Test the alternatives, in all three
// engines, against the real KIND_META paths.
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium, firefox, webkit } from 'playwright-core';

const out = '/Users/mitchell/Projects/bc-canvas-editor/.scratch/committed-images';

// the real 'user' kind icon from CanvasSheet.svelte KIND_META
const PATHS = '<circle cx="8" cy="5.1" r="2.4"/><path d="M3.3 13.3a4.7 4.7 0 0 1 9.4 0"/>';
const inner = (stroke) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="${stroke}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${PATHS}</svg>`;

// data: URI, URL-encoded (not base64) so the file stays diffable
const uri = (stroke) => `data:image/svg+xml,${encodeURIComponent(inner(stroke))}`;

const CASES = [
  ['A-nested-svg', `<span class="box" style="color:#7a4b2a">${inner('currentColor')}</span>`],
  ['B-mask-image', `<span class="box" style="color:#7a4b2a;background-color:currentColor;-webkit-mask-image:url('${uri('black')}');mask-image:url('${uri('black')}');-webkit-mask-size:contain;mask-size:contain;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat"></span>`],
  ['C-background-image', `<span class="box" style="background-image:url('${uri('%237a4b2a')}');background-size:contain;background-repeat:no-repeat"></span>`],
  ['D-html-img', `<span class="box"><img src="${uri('%237a4b2a')}" width="40" height="40" /></span>`],
  ['E-css-content', `<span class="box" style="color:#7a4b2a"><span class="viaContent"></span></span>`]
];

const rows = CASES.map(
  ([name, html]) => `<div class="row">${html}<span class="lbl">${name}</span></div>`
).join('\n');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="320" viewBox="0 0 420 320">
<foreignObject x="0" y="0" width="420" height="320">
<div xmlns="http://www.w3.org/1999/xhtml">
<style>
* { box-sizing: border-box; }
div { font-family: sans-serif; background: #f6f1e7; margin: 0; padding: 10px; }
.row { display: flex; align-items: center; gap: 14px; height: 56px; }
.box { display: inline-block; width: 40px; height: 40px; flex: none; }
.box svg { display: block; width: 100%; height: 100%; }
.viaContent { display: block; width: 100%; height: 100%; }
.viaContent::before { content: url('${uri('%237a4b2a')}'); }
.lbl { font-size: 15px; color: #2b2b2b; }
</style>
${rows}
</div>
</foreignObject>
</svg>
`;
writeFileSync(path.join(out, 'icon-probe.svg'), svg);

const page = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#fff">
<img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" width="420" height="320" />
</body>`;

for (const [name, engine] of [['chromium', chromium], ['firefox', firefox], ['webkit', webkit]]) {
  const b = await engine.launch();
  const p = await b.newPage({ viewport: { width: 460, height: 340 } });
  await p.setContent(page, { waitUntil: 'load' });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: path.join(out, `icon-probe-${name}.png`) });
  await b.close();
  console.log('shot', name);
}
console.log('done');
