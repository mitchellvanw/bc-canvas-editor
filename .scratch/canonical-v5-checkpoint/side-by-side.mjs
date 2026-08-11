// The gate's human half, staged: upstream's blank V5 canvas beside the shipped
// PNG export, one image, so the ten-panel walk is a single look.
import { webkit } from 'playwright-core';

const OUT = new URL('./evidence/', import.meta.url).pathname;

const page = await (await webkit.launch()).newPage({ viewport: { width: 2400, height: 900 } });
await page.setContent(`
	<style>
		body { margin: 0; display: flex; gap: 8px; background: #f4f4f2; align-items: flex-start; }
		figure { margin: 0; flex: 1; }
		img { width: 100%; display: block; }
		figcaption { font: 13px system-ui; padding: 6px 8px; }
	</style>
	<figure>
		<figcaption>ddd-crew, resources/bounded-context-canvas-5v-blank.jpg (V5 canonical)</figcaption>
		<img src="file://${OUT}bounded-context-canvas-5v-blank.jpg">
	</figure>
	<figure>
		<figcaption>BC Canvas, shipped PNG export — Order Fulfillment</figcaption>
		<img src="file://${OUT}example-order-fulfillment.bcc.png">
	</figure>
`);
await page.waitForLoadState('networkidle');
await page.screenshot({ path: OUT + 'side-by-side.png', fullPage: true });
await page.context().browser().close();
console.log('side-by-side.png written');
