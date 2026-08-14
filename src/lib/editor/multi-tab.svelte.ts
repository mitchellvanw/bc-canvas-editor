/**
 * Multi-tab awareness (SPEC §6.1): last write wins, softened by a persistent
 * notice in both tabs — no locking, both tabs stay editable. Another tab's
 * edits reach us as `storage` events on the shared autosave key. Merely
 * *opening* a second tab never changes that key (an identical write fires no
 * storage event), so each tab also says hello on a presence key as it loads;
 * a tab hearing a hello replies, and any presence traffic at all means two
 * tabs are open. Once seen, the notice is persistent for the session — it is
 * not a toast, and it never retracts (SPEC §10).
 */

import { announce } from '$lib/a11y/announce';
import { AUTOSAVE_KEY } from '$lib/model/autosave';

export const PRESENCE_KEY = 'bcc.presence';

/** SPEC §10 wording, verbatim; the banner bolds the first sentence. */
export const MULTI_TAB_NOTICE =
	'This canvas is open in another tab. Whichever tab edits last overwrites the other — close one of them.';

type PresenceType = 'hello' | 'reply';

export class MultiTabMonitor {
	/** Another tab has this canvas open (or edited it); drives the notice. */
	detected = $state(false);

	#storage: Storage | null = null;

	/** Start watching and greet any already-open tab; returns the teardown. */
	watch(storage: Storage = localStorage): () => void {
		this.#storage = storage;
		window.addEventListener('storage', this.#onStorage);
		this.#write('hello');
		return () => window.removeEventListener('storage', this.#onStorage);
	}

	// Storage events only ever come from *other* tabs — same-tab writes are
	// silent — so any hit on our keys is by itself proof of a second tab.
	#onStorage = (event: StorageEvent) => {
		if (event.newValue === null) return;
		if (event.key === AUTOSAVE_KEY) {
			this.#seen();
		} else if (event.key === PRESENCE_KEY) {
			const type = presenceType(event.newValue);
			if (!type) return;
			this.#seen();
			// Answer a hello so the newly opened tab hears us; replies go
			// unanswered — otherwise two tabs would ping-pong forever.
			if (type === 'hello') this.#write('reply');
		}
	};

	// A fresh nonce per write: writing a value identical to the stored one
	// fires no storage event, and every presence write must be heard.
	#write(type: PresenceType): void {
		// Blocked or full storage must not throw out of watch() — a tab that
		// cannot say hello also cannot overwrite anyone through the autosave
		// key, so losing presence loses nothing the notice protects.
		try {
			this.#storage?.setItem(PRESENCE_KEY, JSON.stringify({ type, nonce: crypto.randomUUID() }));
		} catch {
			/* presence is best-effort */
		}
	}

	#seen(): void {
		if (this.detected) return;
		this.detected = true;
		announce(MULTI_TAB_NOTICE);
	}
}

function presenceType(raw: string): PresenceType | null {
	try {
		const type = (JSON.parse(raw) as { type?: unknown }).type;
		return type === 'hello' || type === 'reply' ? type : null;
	} catch {
		return null;
	}
}

export const multiTab = new MultiTabMonitor();
