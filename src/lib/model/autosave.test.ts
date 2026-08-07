import { describe, expect, it } from 'vitest';
import { blankCanvas } from '$lib/model/canvas';
import { serializeCanvas } from '$lib/model/serialize';
import { AUTOSAVE_KEY, loadAutosave, saveAutosave } from '$lib/model/autosave';

function fakeStorage(entries: Record<string, string> = {}): Storage {
	const map = new Map(Object.entries(entries));
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

describe('saveAutosave', () => {
	it('writes the serialized Canvas file (no ids) to bcc.autosave', () => {
		const storage = fakeStorage();
		const doc = blankCanvas();
		doc.name = 'Order Fulfillment';

		saveAutosave(doc, storage);

		expect(AUTOSAVE_KEY).toBe('bcc.autosave');
		expect(storage.getItem('bcc.autosave')).toBe(serializeCanvas(doc));
	});
});

describe('loadAutosave', () => {
	it('restores a saved canvas with fresh ephemeral ids', () => {
		const storage = fakeStorage();
		const doc = blankCanvas();
		doc.name = 'Order Fulfillment';
		doc.domainRoles = [{ id: 'runtime-id', name: 'execution context' }];
		saveAutosave(doc, storage);

		const restored = loadAutosave(storage);

		expect(restored).not.toBeNull();
		expect(restored?.name).toBe('Order Fulfillment');
		expect(restored?.domainRoles[0].name).toBe('execution context');
		expect(restored?.domainRoles[0].id).toBeTruthy();
		expect(restored?.domainRoles[0].id).not.toBe('runtime-id');
	});

	it('returns null when the slot is empty', () => {
		expect(loadAutosave(fakeStorage())).toBeNull();
	});

	it.each([
		['unparsable JSON', 'not json {'],
		['a non-object', '"just a string"'],
		['a section key of the wrong shape', '{"version":1,"domainRoles":"not an array"}'],
		['a lane without messages', '{"version":1,"inboundCommunication":[{"collaborator":"X"}]}']
	])('returns null when the slot holds %s', (_label, slot) => {
		expect(loadAutosave(fakeStorage({ 'bcc.autosave': slot }))).toBeNull();
	});

	it('fills missing section keys from the blank shape', () => {
		const storage = fakeStorage({
			'bcc.autosave': JSON.stringify({ version: 1, name: 'Half a canvas' })
		});
		const restored = loadAutosave(storage);
		expect(restored?.name).toBe('Half a canvas');
		expect(restored?.assumptions).toEqual([]);
		expect(restored?.strategicClassification).toEqual({});
	});
});
