// @vitest-environment jsdom
/**
 * Undo/redo history (SPEC §6.1): a single linear history of full-document
 * snapshots, one per commit; undo/redo swaps the document and round-trips it
 * byte-identically. Session-scoped — replace() (import/new) clears it. Each
 * swap reports which sheet region changed so the editor can reveal it.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { canvas } from '$lib/editor/document.svelte';
import { changedRegion } from '$lib/editor/regions';
import { AUTOSAVE_KEY } from '$lib/model/autosave';
import { newId, stampIds, type CanvasDoc } from '$lib/model/canvas';
import { parseCanvasFile } from '$lib/model/parse';
import { REFERENCE_FILE } from '$lib/model/reference.fixture';
import { serializeCanvas } from '$lib/model/serialize';

// Neither jsdom 30 nor Node's experimental stub provides a working
// localStorage; the autosave pipeline needs a real Storage global under test.
function memoryStorage(): Storage {
	const map = new Map<string, string>();
	return {
		get length() {
			return map.size;
		},
		clear: () => map.clear(),
		getItem: (key: string) => map.get(key) ?? null,
		key: (i: number) => [...map.keys()][i] ?? null,
		removeItem: (key: string) => void map.delete(key),
		setItem: (key: string, value: string) => void map.set(key, value)
	};
}
Object.defineProperty(globalThis, 'localStorage', {
	value: memoryStorage(),
	configurable: true,
	writable: true
});

function referenceDoc(): CanvasDoc {
	const result = parseCanvasFile(REFERENCE_FILE);
	if (!result.ok) throw new Error('reference fixture must parse');
	return stampIds(result.file);
}

beforeEach(() => {
	localStorage.clear();
	canvas.replace(referenceDoc());
});

describe('one commit, one undo step', () => {
	it('starts with nothing to undo or redo', () => {
		expect(canvas.canUndo).toBe(false);
		expect(canvas.canRedo).toBe(false);
	});

	it('round-trips a commit byte-identically through undo and redo', () => {
		const before = serializeCanvas(canvas.doc);
		canvas.commit((doc) => (doc.purpose = 'Ships whatever was paid for.'));
		const after = serializeCanvas(canvas.doc);

		canvas.undo();
		expect(serializeCanvas(canvas.doc)).toBe(before);
		canvas.redo();
		expect(serializeCanvas(canvas.doc)).toBe(after);
	});

	it('keeps ephemeral row ids stable across undo, so keyed rendering never remounts', () => {
		const laneId = canvas.doc.inboundCommunication[0].id;
		canvas.commit((doc) => (doc.inboundCommunication[0].collaborator.name = 'Storefront'));
		canvas.undo();
		expect(canvas.doc.inboundCommunication[0].id).toBe(laneId);
	});

	it('undoes structural commits and field commits alike, one step each', () => {
		canvas.commit((doc) => (doc.name = 'Fulfillment'));
		canvas.commit((doc) => doc.assumptions.push('New assumption'));
		canvas.commit((doc) => doc.domainRoles.push({ id: newId(), name: 'gateway context' }));

		canvas.undo();
		expect(canvas.doc.domainRoles.map((role) => role.name)).not.toContain('gateway context');
		canvas.undo();
		expect(canvas.doc.assumptions).not.toContain('New assumption');
		canvas.undo();
		expect(canvas.doc.name).toBe('Order Fulfillment');
		expect(canvas.canUndo).toBe(false);
	});

	it('is a no-op at either end of history', () => {
		expect(canvas.undo()).toBeNull();
		expect(canvas.redo()).toBeNull();
	});

	it('drops the redo tail when a new commit lands after undo', () => {
		canvas.commit((doc) => (doc.name = 'One'));
		canvas.undo();
		canvas.commit((doc) => (doc.name = 'Two'));
		expect(canvas.canRedo).toBe(false);
		expect(canvas.doc.name).toBe('Two');
	});
});

describe('undo/redo feeds the persistence pipeline', () => {
	it('autosaves the swapped-in document and marks it unexported', () => {
		canvas.commit((doc) => (doc.purpose = 'Edited.'));
		canvas.exportCanvasFile();
		expect(canvas.unexported).toBe(false);

		canvas.undo();
		expect(canvas.unexported).toBe(true);
		expect(localStorage.getItem(AUTOSAVE_KEY)).toBe(serializeCanvas(canvas.doc));
	});

	it('runs clean again when undo returns the document to its exported bytes', () => {
		canvas.exportCanvasFile();
		canvas.commit((doc) => (doc.name = 'Edited'));
		expect(canvas.unexported).toBe(true);

		canvas.undo();
		expect(canvas.unexported).toBe(false);
		canvas.redo();
		expect(canvas.unexported).toBe(true);
	});

	it('markExported rebaselines without serializing — the HTML artifact path (SPEC §9.1)', () => {
		canvas.commit((doc) => (doc.name = 'Edited'));
		expect(canvas.unexported).toBe(true);

		canvas.markExported();
		expect(canvas.unexported).toBe(false);
		// The baseline moved: undoing away from the exported bytes dirties again.
		canvas.undo();
		expect(canvas.unexported).toBe(true);
	});
});

describe('the session boundary clears history', () => {
	it('cannot undo across replace() — import or new canvas', () => {
		canvas.commit((doc) => (doc.name = 'Edited'));
		expect(canvas.canUndo).toBe(true);

		canvas.replace(referenceDoc());
		expect(canvas.canUndo).toBe(false);
		expect(canvas.canRedo).toBe(false);
		expect(canvas.undo()).toBeNull();
	});
});

describe('undo/redo reports the affected region', () => {
	it('returns the changed region from undo and redo', () => {
		canvas.commit((doc) => doc.openQuestions.push('Who owns refunds?'));
		expect(canvas.undo()).toBe('questions');
		expect(canvas.redo()).toBe('questions');
	});
});

describe('changedRegion', () => {
	const cases: [string, (doc: CanvasDoc) => void, string][] = [
		['name', (doc) => (doc.name = 'Renamed'), 'title'],
		['classification', (doc) => (doc.strategicClassification.domain = 'supporting'), 'title'],
		['description', (doc) => (doc.purpose = 'Changed.'), 'description'],
		['domain roles', (doc) => doc.domainRoles.push({ id: newId(), name: 'gateway context' }), 'roles'],
		['inbound lanes', (doc) => (doc.inboundCommunication[0].collaborator.name = 'Web'), 'inbound'],
		['ubiquitous language', (doc) => (doc.ubiquitousLanguage[0].term = 'Parcel'), 'language'],
		['business decisions', (doc) => doc.businessDecisions.pop(), 'decisions'],
		['outbound lanes', (doc) => doc.outboundCommunication[0].messages.pop(), 'outbound'],
		['assumptions', (doc) => doc.assumptions.push('More stock.'), 'assumptions'],
		['metrics', (doc) => (doc.verificationMetrics[0] = 'Under 2 hours.'), 'metrics'],
		['open questions', (doc) => doc.openQuestions.pop(), 'questions']
	];

	it.each(cases)('maps a %s change to its region', (_label, mutate, region) => {
		const before = referenceDoc();
		const after = structuredClone(before);
		mutate(after);
		expect(changedRegion(before, after)).toBe(region);
	});

	it('returns null when the documents are identical', () => {
		const doc = referenceDoc();
		expect(changedRegion(doc, structuredClone(doc))).toBeNull();
	});
});
