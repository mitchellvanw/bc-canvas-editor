/**
 * The four tools and the canvas resource, driven through a real client.
 *
 * Everything here goes over the protocol rather than into a handler, because
 * the failures worth catching live in the gap between the two. A Zod schema
 * that converts into JSON Schema a host quietly rejects produces no error a
 * unit test can see — it produces a server that "just doesn't work" in Claude
 * Desktop, with protocol logging deprecated and nothing to read. A client on
 * the other end of an in-memory transport is the cheapest thing that notices.
 *
 * The crown jewel is the round trip: every committed example read out through
 * `bcc_read_canvas` and written back through `bcc_write_canvas` has to land on
 * disk byte for byte as it started. That property is the destination of this
 * whole effort — the app's exports open unchanged in the server, and the
 * server's writes open unchanged in the app — and it holds only if the digest,
 * the schema, the parser and the serializer all agree.
 */

import {
	copyFileSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	realpathSync,
	writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CANVAS_VERSION } from '$lib/model/canvas';
import { openRoot } from './root';
import { buildServer } from './server';

const EXAMPLES = fileURLToPath(new URL('../../examples/', import.meta.url));
const EXAMPLE_FILES = readdirSync(EXAMPLES).filter((name) => name.endsWith('.bcc.json'));

let base: string;
let client: Client;

/** Put a file under the root, making its directory on the way. */
function put(relative: string, text: string): void {
	const path = join(base, relative);
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, text);
}

async function connect(): Promise<Client> {
	const server = buildServer(openRoot(base));
	const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
	const connected = new Client({ name: 'bcc-tests', version: '0.0.1' });
	await Promise.all([server.connect(serverSide), connected.connect(clientSide)]);
	return connected;
}

/** A tool call's text content, joined — what the model actually reads. */
function text(result: any): string {
	return result.content
		.filter((block: any) => block.type === 'text')
		.map((block: any) => block.text)
		.join('\n');
}

function call(name: string, args: Record<string, unknown> = {}): Promise<any> {
	return client.callTool({ name, arguments: args });
}

beforeEach(async () => {
	base = realpathSync(mkdtempSync(join(tmpdir(), 'bcc-tools-')));
	client = await connect();
});

afterEach(async () => {
	await client.close();
});

describe('tools/list', () => {
	it('is well-formed, and in the order it will be in tomorrow', async () => {
		const { tools } = await client.listTools();

		expect(tools.map((tool) => tool.name)).toEqual([
			'bcc_list_canvases',
			'bcc_read_canvas',
			'bcc_write_canvas',
			'bcc_explain'
		]);
		for (const tool of tools) {
			expect(tool.description, `${tool.name} has no description`).toBeTruthy();
			expect(tool.inputSchema.type).toBe('object');
			expect(tool.annotations?.openWorldHint).toBe(false);
		}
	});

	it('carries the vocabularies into the write schema, one-liners and all', async () => {
		const { tools } = await client.listTools();
		const write = tools.find((tool) => tool.name === 'bcc_write_canvas');
		const schema = JSON.stringify(write?.inputSchema);

		// Generated from vocab.ts, so the values and their teaching arrive
		// whether or not the model thought to ask bcc_explain first.
		expect(schema).toContain('anticorruption-layer');
		expect(schema).toContain('A translation layer at the boundary');
		expect(schema).toContain('octopus coordinator');
		// Only the genuinely closed sets are enums; everything else is a string
		// with an escape hatch, per SPEC §4.
		const canvas = (write?.inputSchema as any).properties.canvas.properties;
		const lane = canvas.inboundCommunication.items.properties;
		expect(lane.messages.items.properties.type.enum).toEqual(['command', 'query', 'event']);
		expect(lane.collaborator.properties.kind.enum).toEqual([
			'bounded-context',
			'external-system',
			'frontend',
			'user'
		]);
		expect(lane.relationship.properties.theirs.enum).toBeUndefined();
		expect(lane.relationship.properties.ours.enum).toBeUndefined();
		expect(canvas.strategicClassification.properties.domain.enum).toBeUndefined();
	});

	it('declares no output schema on any tool, so the prose is the result', async () => {
		const { tools } = await client.listTools();

		// A declared output schema entitles a host to drop the text block as a
		// duplicate serialization, and both day-one hosts do — the standing rule
		// at the registration site in tools.ts.
		for (const tool of tools) {
			expect(tool.outputSchema, `${tool.name} declares an outputSchema`).toBeUndefined();
		}
	});
});

describe('the round trip', () => {
	it.each(EXAMPLE_FILES)('%s survives read-then-write byte for byte', async (name) => {
		const committed = readFileSync(join(EXAMPLES, name), 'utf8');
		put(`docs/contexts/${name}`, committed);

		const read = await call('bcc_read_canvas', { path: `docs/contexts/${name}`, view: 'json' });
		expect(read.isError).toBeFalsy();
		expect(text(read)).toBe(committed);

		const { version, ...canvas } = JSON.parse(text(read));
		expect(version).toBe(CANVAS_VERSION);

		const written = await call('bcc_write_canvas', { path: `out/${name}`, canvas });
		expect(written.isError).toBeFalsy();
		expect(readFileSync(join(base, 'out', name), 'utf8')).toBe(committed);
	});

	it('reads a canvas back out of an HTML artifact', async () => {
		const committed = readFileSync(join(EXAMPLES, 'notifications.bcc.json'), 'utf8');
		put(
			'artifacts/notifications.bcc.html',
			`<!doctype html><title>x</title>\n<script type="application/json" data-canvas-file>\n${committed.trimEnd()}\n</script>\n<p>the rendered sheet</p>\n`
		);

		const read = await call('bcc_read_canvas', {
			path: 'artifacts/notifications.bcc.html',
			view: 'json'
		});

		// The Canvas file the artifact carries, not the HTML that carries it.
		expect(text(read).trimEnd()).toBe(committed.trimEnd());
	});
});

describe('bcc_list_canvases', () => {
	it('says what is there, how far along, and where to read it', async () => {
		put('docs/contexts/orders.bcc.json', readFileSync(join(EXAMPLES, 'order-fulfillment.bcc.json'), 'utf8'));
		put('docs/contexts/half.bcc.json', readFileSync(join(EXAMPLES, 'royalty-distribution.bcc.json'), 'utf8'));

		const result = await call('bcc_list_canvases');
		const body = text(result);

		expect(body).toContain('2 canvases under');
		expect(body).toContain('docs/contexts/orders.bcc.json — Order Fulfillment');
		// Sorted by path, so the listing reads the same tomorrow.
		expect(body.indexOf('half.bcc.json')).toBeLessThan(body.indexOf('orders.bcc.json'));
		expect(body).toMatch(/\d+ of 11 sections filled\./);
		expect(body).toContain('bcc://canvas/docs/contexts/orders.bcc.json');
	});

	it('reports a file it cannot read rather than dropping it', async () => {
		put('broken.bcc.json', '{"version":1,"name":42}');

		const result = await call('bcc_list_canvases');
		const body = text(result);

		expect(body).toContain('Files that look like canvases and could not be read:');
		expect(body).toContain('broken.bcc.json — name: expected a string, got a number.');
	});

	it('tells the model what to do when there is nothing there, and where it did not look', async () => {
		// A canvas sitting in a skipped directory is the one case where an empty
		// listing misleads, so the empty listing is where the skip rule is spent.
		put('.scratch/hidden.bcc.json', '{}');

		const body = text(await call('bcc_list_canvases'));
		expect(body).toContain('bcc_write_canvas creates the first');
		expect(body).toContain('Hidden and generated directories were not searched');
	});
});

describe('refusals that teach', () => {
	it('will not read a canvas from a newer version, and does not read the file', async () => {
		put('future.bcc.json', '{"version":9,"name":"Later","description":""}');

		const result = await call('bcc_read_canvas', { path: 'future.bcc.json' });

		expect(result.isError).toBe(true);
		expect(text(result)).toContain('format version 9');
		expect(text(result)).toContain('reads up to version 2');
		expect(text(result)).toContain('nothing was changed');
	});

	it('will not write a version it does not emit, and writes nothing', async () => {
		const result = await call('bcc_write_canvas', {
			path: 'later.bcc.json',
			version: 9,
			canvas: blank()
		});

		expect(result.isError).toBe(true);
		expect(text(result)).toContain('Nothing was written');
		expect(readdirSync(base)).toEqual([]);
	});

	it('refuses a path that leaves the root, naming the root', async () => {
		const result = await call('bcc_read_canvas', { path: '../escape.bcc.json' });

		expect(result.isError).toBe(true);
		expect(text(result)).toContain('outside the canvas root');
		expect(text(result)).toContain(base);
	});

	it('refuses to write outside the root, and writes nothing', async () => {
		const result = await call('bcc_write_canvas', {
			path: '../escape.bcc.json',
			canvas: blank()
		});

		expect(result.isError).toBe(true);
		expect(text(result)).toContain('outside the canvas root');
		expect(readdirSync(base)).toEqual([]);
	});

	it('insists on the extension the listing and the editor both look for', async () => {
		const result = await call('bcc_write_canvas', { path: 'shipping.json', canvas: blank() });

		expect(result.isError).toBe(true);
		expect(text(result)).toContain('has to end in .bcc.json');
		expect(text(result)).toContain('Try shipping.bcc.json.');
	});

	it('names the field and the legal values when a message type is invented', async () => {
		const result = await call('bcc_write_canvas', {
			path: 'bad.bcc.json',
			canvas: {
				...blank(),
				inboundCommunication: [
					{ collaborator: { name: 'Checkout' }, messages: [{ type: 'shout', name: 'Hi' }] }
				]
			}
		});

		// `message.type` is the one hard enum, so the schema refuses it before the
		// handler runs — which is the whole reason nothing else is an enum: the
		// same treatment of `relationship` would refuse a legitimate custom value.
		expect(result.isError).toBe(true);
		expect(text(result)).toContain('canvas.inboundCommunication.0.messages.0.type');
		expect(text(result)).toContain('"command"');
		expect(readdirSync(base)).toEqual([]);
	});

	it('names the field on a file that is not a Canvas file, wherever it is read from', async () => {
		put(
			'docs/broken.bcc.json',
			JSON.stringify({ version: 1, ...blank(), name: 'X', domainRoles: [{}] })
		);

		const result = await call('bcc_read_canvas', { path: 'docs/broken.bcc.json' });

		// The parser's path-carrying detail (ticket 026) is what reaches the model
		// here: on disk there is no input schema in front of the file, so this is
		// the only thing that can say which field is wrong.
		expect(result.isError).toBe(true);
		expect(text(result)).toContain('domainRoles[0].name: expected a string, got nothing');
		expect(text(result)).toContain('bcc_explain');
	});

	it('says which canvases exist when the path names one that does not', async () => {
		const result = await call('bcc_read_canvas', { path: 'nope.bcc.json' });

		expect(result.isError).toBe(true);
		expect(text(result)).toContain('bcc_list_canvases');
	});
});

describe('bcc_write_canvas', () => {
	it('names what came out empty, which is the only guard against a dropped section', async () => {
		const result = await call('bcc_write_canvas', {
			path: 'thin.bcc.json',
			canvas: { ...blank(), name: 'Thin', purpose: 'Barely started.' }
		});

		expect(result.isError).toBeFalsy();
		const body = text(result);
		expect(body).toContain('Wrote thin.bcc.json — Thin.');
		expect(body).toMatch(/Nothing came out under: .*Open questions/);
		expect(body).not.toContain('Name');
	});

	it('notes a custom vocabulary value instead of refusing it', async () => {
		const result = await call('bcc_write_canvas', {
			path: 'custom.bcc.json',
			canvas: {
				...blank(),
				name: 'Legacy Bridge',
				domainRoles: [{ name: 'strangler' }],
				outboundCommunication: [
					{ collaborator: { name: 'Mainframe' }, relationship: { ours: 'strangler-fig' }, messages: [] }
				]
			}
		});

		expect(result.isError).toBeFalsy();
		const body = text(result);
		expect(body).toContain('"strangler" is a custom domain-role trait, kept as written');
		expect(body).toContain('"strangler-fig" is a custom relationship pattern');
		expect(body).toContain('anticorruption-layer');
		// And the custom values are in the file, unchanged.
		expect(readFileSync(join(base, 'custom.bcc.json'), 'utf8')).toContain('strangler-fig');
	});

	it('replaces an existing canvas and says so', async () => {
		await call('bcc_write_canvas', { path: 'x.bcc.json', canvas: { ...blank(), name: 'One' } });
		const again = await call('bcc_write_canvas', {
			path: 'x.bcc.json',
			canvas: { ...blank(), name: 'Two' }
		});

		expect(text(again)).toContain('Replaced x.bcc.json — Two.');
	});

	it('makes the directory a canvas is filed into', async () => {
		const result = await call('bcc_write_canvas', {
			path: 'docs/contexts/new.bcc.json',
			canvas: { ...blank(), name: 'New' }
		});

		expect(result.isError).toBeFalsy();
		expect(readFileSync(join(base, 'docs/contexts/new.bcc.json'), 'utf8')).toContain('"New"');
	});
});

describe('bcc_explain', () => {
	it('asks the section its own question, in the sheet\'s words', async () => {
		const roles = text(await call('bcc_explain', { topic: 'domainRoles' }));

		expect(roles).toContain('# Domain roles');
		expect(roles).toContain('how does this context behave?');
		// The fifteen, with their teaching, from the same module the pickers read.
		expect(roles).toContain('octopus coordinator — Orchestrates several contexts to fulfil one process.');
		expect(roles).toContain('kept as written');
	});

	it('describes the method as eleven questions, and credits it', async () => {
		const canvas = text(await call('bcc_explain', { topic: 'canvas' }));

		expect(canvas).toContain('Ubiquitous language — which words mean something precise here?');
		expect(canvas).toContain('ddd-crew · CC BY 4.0');
	});

	it('tells a model drafting from code where the judgment sections go', async () => {
		const canvas = text(await call('bcc_explain', { topic: 'canvas' }));

		// The five sections code cannot answer, and the honest place for them —
		// method knowledge that lives server-side so every MCP client gets it.
		expect(canvas).toContain('business judgments a codebase cannot answer');
		expect(canvas).toContain('verification metrics');
		expect(canvas).toContain('under Open questions');
	});

	it('covers the canvas and all eleven sections', async () => {
		const { tools } = await client.listTools();
		const topics = (tools.find((tool) => tool.name === 'bcc_explain')?.inputSchema as any).properties
			.topic.enum;

		expect(topics).toHaveLength(12);
		for (const topic of topics) {
			const result = await call('bcc_explain', { topic });
			expect(result.isError, `${topic} refused`).toBeFalsy();
			expect(text(result).length).toBeGreaterThan(60);
		}
	});
});

describe('the canvas resource', () => {
	beforeEach(() => {
		copyFileSync(join(EXAMPLES, 'notifications.bcc.json'), join(base, 'notifications.bcc.json'));
		mkdirSync(join(base, 'docs'), { recursive: true });
		copyFileSync(join(EXAMPLES, 'order-fulfillment.bcc.json'), join(base, 'docs/orders.bcc.json'));
	});

	it('lists the same canvases the tool does', async () => {
		const { resources } = await client.listResources();

		expect(resources.map((resource) => resource.uri)).toEqual([
			'bcc://canvas/docs/orders.bcc.json',
			'bcc://canvas/notifications.bcc.json'
		]);
	});

	it('serves the digest and the exact file under one URI', async () => {
		const { contents } = await client.readResource({ uri: 'bcc://canvas/docs/orders.bcc.json' });
		const [digest, json] = contents as { mimeType?: string; text: string }[];

		expect(contents).toHaveLength(2);
		expect(digest.mimeType).toBe('text/markdown');
		expect(digest.text).toContain('# Order Fulfillment');
		expect(json.mimeType).toBe('application/json');
		expect(json.text).toBe(readFileSync(join(EXAMPLES, 'order-fulfillment.bcc.json'), 'utf8'));
	});

	it('completes a path the way a person types one', async () => {
		const { completion } = await client.complete({
			ref: { type: 'ref/resource', uri: 'bcc://canvas/{+path}' },
			argument: { name: 'path', value: 'docs/' }
		});

		expect(completion.values).toEqual(['docs/orders.bcc.json']);
	});

	it('links the canvas it just read, so a host can pin it', async () => {
		const result = await call('bcc_read_canvas', { path: 'docs/orders.bcc.json' });
		const link = result.content.find((block: any) => block.type === 'resource_link');

		expect(link.uri).toBe('bcc://canvas/docs/orders.bcc.json');
		expect(link.name).toBe('Order Fulfillment');
	});
});

/** The eleven sections, all empty — what a caller sends before it knows anything. */
function blank() {
	return {
		name: '',
		purpose: '',
		strategicClassification: {},
		domainRoles: [],
		inboundCommunication: [],
		ubiquitousLanguage: [],
		businessDecisions: [],
		outboundCommunication: [],
		assumptions: [],
		verificationMetrics: [],
		openQuestions: []
	};
}
