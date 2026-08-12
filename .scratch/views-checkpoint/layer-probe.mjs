// Is layer precedence what beats our !important, or specificity?
import { webkit, chromium } from 'playwright-core';
const html = `<!doctype html><html><head>
<style>@layer theme, base, components, utilities;
@layer base { [hidden]:where(:not([hidden="until-found"])) { display: none !important } }</style>
<style>
@media print {
  #a { display: block !important; }   /* unlayered important, id */
  #b { display: block; }              /* unlayered normal, id */
}
.p--off { display: none; }
</style></head>
<body><div class="p" id="a" hidden>a</div><div class="p" id="b">b</div>
<div class="p p--off" id="c">c</div></body></html>`;
for (const [n,e] of [['webkit',webkit],['chromium',chromium]]) {
  const b=await e.launch(); const p=await b.newPage();
  await p.setContent(html);
  await p.emulateMedia({media:'print'});
  console.log(n, await p.evaluate(()=>({
    aHiddenAttrImportant: getComputedStyle(document.getElementById('a')).display,
    bPlain: getComputedStyle(document.getElementById('b')).display,
    cClassOff: getComputedStyle(document.getElementById('c')).display
  })));
  await b.close();
}
