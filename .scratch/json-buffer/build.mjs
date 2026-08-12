/**
 * PROTOTYPE (wayfinder ticket 043) — builds the one shareable file.
 *
 *   node .scratch/json-buffer/build.mjs
 *   open .scratch/json-buffer/json-buffer.html
 *
 * The demo has to be a single double-clickable file, and it has to run the
 * *real* parser, serializer and Markdown renderer — a stubbed parser would fake
 * exactly the two cases worth pressing (a text that migrates, and a text that
 * only differs by whitespace). So esbuild bundles the page against the app's
 * `$lib` and inlines the result into the shell. Same alias the MCP server
 * bundles through; esbuild is the MCP package's devDependency.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../..');

const { build } = await import(join(root, 'mcp/node_modules/esbuild/lib/main.js'));

/** The canvas the demo opens with — a committed example, read as bytes. */
const canvas = readFileSync(join(root, 'examples/notifications.bcc.json'), 'utf8');

/**
 * A version 1 Canvas file, for the migration walkthrough: `description` where
 * v2 says `purpose`, and both lane fields as bare strings. Hand-written rather
 * than generated, because a v1 file is exactly what nothing in the tree
 * produces any more.
 */
const v1 = JSON.stringify(
	{
		version: 1,
		name: 'Notifications (saved by an older version)',
		description: 'Delivers order updates to customers on their preferred channel.',
		strategicClassification: { domain: 'supporting', businessModel: 'engagement' },
		domainRoles: [{ name: 'execution' }],
		inboundCommunication: [
			{
				collaborator: 'Order Fulfillment',
				relationship: 'customer-supplier',
				messages: [{ type: 'event', name: 'OrderShipped' }]
			}
		],
		ubiquitousLanguage: [{ term: 'Channel', definition: 'How a customer wants to be reached.' }],
		businessDecisions: [{ name: 'Quiet hours are respected in the customer’s own timezone.' }],
		outboundCommunication: [],
		assumptions: ['Customers keep one preferred channel at a time.'],
		verificationMetrics: [],
		openQuestions: []
	},
	null,
	2
);

const result = await build({
	entryPoints: [join(here, 'page.js')],
	bundle: true,
	format: 'iife',
	platform: 'browser',
	target: 'safari17',
	alias: { $lib: join(root, 'src/lib') },
	define: { __CANVAS__: JSON.stringify(canvas), __V1__: JSON.stringify(v1) },
	write: false,
	logLevel: 'warning'
});

const shell = readFileSync(join(here, 'shell.html'), 'utf8');
const out = join(here, 'json-buffer.html');
writeFileSync(out, shell.replace('/*ENGINE*/', result.outputFiles[0].text));
console.log(`wrote ${out}`);
