/**
 * The bundled example canvases (SPEC §3.5): the committed `examples/*.bcc.json`
 * files are the single source, imported as raw bytes and read through the same
 * parse path as any import — so a future schema bump reaches them through its
 * migration instead of silently stranding them. The one-liners are chooser
 * copy (SPEC §10), never canvas content; Royalty Distribution's trailing flag
 * marks the deliberately half-finished canvas.
 */

import type { CanvasFile } from '$lib/model/canvas';
import { parseCanvasImport } from '$lib/model/parse';
import appointmentScheduling from '../../../examples/appointment-scheduling.bcc.json?raw';
import notifications from '../../../examples/notifications.bcc.json?raw';
import orderFulfillment from '../../../examples/order-fulfillment.bcc.json?raw';
import royaltyDistribution from '../../../examples/royalty-distribution.bcc.json?raw';

export interface ExampleEntry {
	/** The canvas's own name — the file is the source, never a second copy. */
	name: string;
	/** Chooser one-liner (SPEC §10). */
	description: string;
	file: CanvasFile;
}

function example(raw: string, description: string): ExampleEntry {
	const result = parseCanvasImport(raw);
	// A bundled example its own app refuses is a programming error, not a
	// user-facing refusal — fail loud (the pinning test reads these same bytes).
	if (!result.ok) throw new Error(`bundled example refused: ${result.reason}`);
	return { name: result.file.name, description, file: result.file };
}

export const EXAMPLES: readonly ExampleEntry[] = [
	example(orderFulfillment, 'Coordinates picking, packing and shipping once an order is paid.'),
	example(notifications, 'Delivers order updates to customers on their preferred channel.'),
	example(appointmentScheduling, 'Books patients into clinic slots and keeps no-shows down.'),
	example(royaltyDistribution, 'Splits streaming revenue among rights holders. Captured mid-workshop.')
];
