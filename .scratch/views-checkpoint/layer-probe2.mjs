import { webkit, chromium } from 'playwright-core';
const html = `<!doctype html><html><head>
<style>@layer theme, base, components, utilities;
@layer base { [hidden]:where(:not([hidden="until-found"])) { display: none !important } }</style>
<style>
.p--off { display: none; }
@media print { #c { display: block; } }
</style></head>
<body><div class="p p--off" id="c">c</div></body></html>`;
for (const [n,e] of [['webkit',webkit],['chromium',chromium]]) {
  const b=await e.launch(); const p=await b.newPage();
  await p.setContent(html);
  const screen = await p.evaluate(()=>getComputedStyle(document.getElementById('c')).display);
  await p.emulateMedia({media:'print'});
  const print = await p.evaluate(()=>getComputedStyle(document.getElementById('c')).display);
  console.log(n, {screen, print});
  await b.close();
}
