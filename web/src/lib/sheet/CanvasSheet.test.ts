// @vitest-environment jsdom
/**
 * The shared read-only sheet (SPEC §9) rendering the SPEC §3.1 reference
 * example: every section populated in the V5 layout, meanings carried by
 * glyph + text (never color alone), footer legend + attribution, and no
 * editing affordances — the artifact serializers will reuse this DOM as-is.
 */
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { blankCanvas, stampIds, type CanvasDoc } from '$lib/model/canvas';
import { parseCanvasFile } from '$lib/model/parse';
import { REFERENCE_FILE } from '$lib/model/reference.fixture';
import CanvasSheet from './CanvasSheet.svelte';

function referenceDoc(): CanvasDoc {
	const result = parseCanvasFile(REFERENCE_FILE);
	if (!result.ok) throw new Error('reference fixture must parse');
	return stampIds(result.file);
}

let component: ReturnType<typeof mount> | null = null;

function render(doc: CanvasDoc): HTMLElement {
	const target = document.createElement('div');
	document.body.append(target);
	component = mount(CanvasSheet, { target, props: { doc } });
	flushSync();
	return target;
}

afterEach(() => {
	if (component) unmount(component);
	component = null;
	document.body.innerHTML = '';
});

const SECTION_LABELS = [
	'Purpose',
	'Strategic classification',
	'Domain roles',
	'Inbound communication',
	'Ubiquitous language',
	'Business decisions',
	'Outbound communication',
	'Assumptions',
	'Verification metrics',
	'Open questions'
];

describe('CanvasSheet renders the reference example (SPEC §3.1)', () => {
	it('shows the name as h1 and the ten section sheets as h2, in the V5 order', () => {
		const el = render(referenceDoc());
		expect(el.querySelector('h1')?.textContent).toBe('Order Fulfillment');
		const labels = [...el.querySelectorAll('h2')].map((h) => h.textContent);
		expect(labels).toEqual(SECTION_LABELS);
	});

	it('shows the strategic classification as its own panel — sub-columns, nothing left in the title block', () => {
		const el = render(referenceDoc());
		const pairs = [...el.querySelectorAll('.area-classification .axes > div')].map((d) =>
			[...d.children].map((c) => c.textContent)
		);
		expect(pairs).toEqual([
			['Domain', 'core'],
			['Business model', 'revenue'],
			['Evolution', 'custom-built']
		]);
		// The block keeps its eyebrow and the context name — the axes left it.
		expect(el.querySelector('.tb dl')).toBeNull();
	});

	it('renders domain roles as chips', () => {
		const el = render(referenceDoc());
		expect(el.textContent).toContain('execution context');
	});

	it('draws the centre box around ubiquitous language and business decisions, still two sections', () => {
		const el = render(referenceDoc());
		const centre = el.querySelector('.centre');
		const labels = [...(centre?.querySelectorAll('h2') ?? [])].map((h) => h.textContent);
		expect(labels).toEqual(['Ubiquitous language', 'Business decisions']);
	});

	it('renders lanes with collaborator h3 and message chips', () => {
		const el = render(referenceDoc());
		const collaborators = [...el.querySelectorAll('h3')].map((h) => h.textContent?.trim());
		expect(collaborators[0]).toBe('Checkout');
		expect(collaborators[1]).toContain('Notifications');
		expect(el.textContent).toContain('Place Order');
		expect(el.textContent).toContain('Payment Confirmed');
		expect(el.textContent).toContain('Triggers fulfillment.');
		expect(el.textContent).toContain('Order Shipped');
	});

	it('renders a one-sided relationship as the arrow plus that side alone (SPEC §5)', () => {
		const el = render(referenceDoc());
		// Inbound reference lane: { ours: 'customer-supplier' } — value after
		// the arrow, prefixed for AT; no theirs invented.
		const rel = el.querySelector('.area-inbound .rel');
		expect(rel?.querySelector('.rel__theirs')).toBeNull();
		expect(rel?.querySelector('.rel__ours')?.textContent).toBe('customer-supplier');
		expect(rel?.querySelector('.rel__arrow')?.getAttribute('aria-hidden')).toBe('true');
		expect(rel?.textContent).toContain('this context:');
	});

	it('renders both relationship ends collaborator-first, sr prefixes naming the sides', () => {
		const el = render(referenceDoc());
		// Outbound reference lane: { theirs: 'conformist', ours: 'open-host-service' }.
		const rel = el.querySelector('.area-outbound .rel');
		expect(rel?.querySelector('.rel__theirs')?.textContent).toBe('conformist');
		expect(rel?.querySelector('.rel__ours')?.textContent).toBe('open-host-service');
		const spoken = rel?.textContent?.replace(/\s+/g, ' ');
		expect(spoken).toContain('Collaborator: conformist');
		expect(spoken).toContain('this context: open-host-service');
	});

	it('draws the collaborator kind as an icon with a spoken meaning; no kind, no icon', () => {
		const el = render(referenceDoc());
		const checkout = el.querySelector('.area-inbound h3');
		expect(checkout?.querySelector('.kind')).toBeNull();
		const notifications = el.querySelector('.area-outbound h3');
		expect(notifications?.querySelector('.kind svg')).not.toBeNull();
		expect(notifications?.textContent).toContain('Bounded context:');
	});

	it('rings an anti-pattern trait with the caution mark; ordinary traits stay plain', () => {
		const doc = referenceDoc();
		doc.domainRoles.push({ id: 'caution-1', name: 'brain context' });
		const el = render(doc);
		const rung = [...el.querySelectorAll('.role--caution')];
		expect(rung).toHaveLength(1);
		expect(rung[0].textContent).toContain('brain context');
		expect(rung[0].textContent).toContain('likely anti-pattern');
	});

	it('chips lead with their type as text and carry the glyph as decoration (SPEC §8.5)', () => {
		const el = render(referenceDoc());
		const chips = [...el.querySelectorAll('li[data-meaning]')];
		expect(chips.map((c) => c.getAttribute('data-meaning'))).toEqual([
			'command',
			'event',
			'event'
		]);
		const [command, event] = chips;
		expect(command.textContent).toMatch(/command.*Place Order/i);
		expect(command.querySelector('[aria-hidden="true"]')?.textContent).toBe('▶');
		expect(event.querySelector('[aria-hidden="true"]')?.textContent).toBe('◆');
	});

	it('renders the query chip with its ? glyph (not in the reference example)', () => {
		const doc = referenceDoc();
		doc.inboundCommunication[0].messages.push({
			id: 'query-1',
			type: 'query',
			name: 'Get Shipment Status'
		});
		const el = render(doc);
		const query = el.querySelector('li[data-meaning="query"]');
		expect(query?.textContent).toMatch(/query.*Get Shipment Status/i);
		expect(query?.querySelector('[aria-hidden="true"]')?.textContent).toBe('?');
	});

	it('renders terms with definitions, decisions, and the one-liner sticky sections', () => {
		const el = render(referenceDoc());
		expect(el.textContent).toContain('Shipment');
		expect(el.textContent).toContain('A physical parcel dispatched against an order.');
		expect(el.textContent).toContain('No partial shipments');
		expect(el.textContent).toContain('An order ships complete or not at all.');
		expect(el.textContent).toContain('Warehouse stock counts are accurate within the hour.');
		expect(el.textContent).toContain('Time from payment to dispatch under 4 hours.');
		expect(el.textContent).toContain('Who owns returns — this context or a new one?');
	});
});

describe('CanvasSheet footer (SPEC §10)', () => {
	it('shows the one-line legend: swatches, the four kind icons, and the relationship-pair key', () => {
		const el = render(referenceDoc());
		const legend = [...el.querySelectorAll('footer [data-legend] li')].map((s) =>
			s.textContent?.replace(/\s+/g, ' ').trim()
		);
		expect(legend).toEqual([
			'command',
			'query',
			'event',
			'decision',
			'collaborator',
			'open question',
			'bounded context',
			'external system',
			'frontend',
			'direct user interaction',
			'relationship: theirs→ours'
		]);
	});

	it('links the attribution to the ddd-crew repo and the CC BY 4.0 license', () => {
		const el = render(referenceDoc());
		const hrefs = [...el.querySelectorAll('footer a')].map((a) => a.getAttribute('href'));
		expect(hrefs).toContain('https://github.com/ddd-crew/bounded-context-canvas');
		expect(hrefs).toContain('https://creativecommons.org/licenses/by/4.0/');
		expect(el.querySelector('footer')?.textContent).toContain(
			'Based on the Bounded Context Canvas by the ddd-crew · CC BY 4.0'
		);
	});
});

describe('CanvasSheet is read-only and complete when empty', () => {
	it('carries no editing affordances for the artifact serializers to leak', () => {
		const el = render(referenceDoc());
		expect(el.querySelector('[contenteditable]')).toBeNull();
		expect(el.querySelector('button, input, textarea, [data-placeholder]')).toBeNull();
	});

	it('renders an empty canvas as labeled empty sheets without teaching hints (SPEC §9)', () => {
		const el = render(stampIds(blankCanvas()));
		const labels = [...el.querySelectorAll('h2')].map((h) => h.textContent);
		expect(labels).toEqual(SECTION_LABELS);
		expect(el.textContent).not.toContain('Name this context');
		// The §10 teaching copy enters only through the editor's snippets — the
		// bare sheet (the artifact path) never shows a question or placeholder.
		// No '?' holds only on an empty canvas: a filled one renders ? glyphs
		// on query chips (and question marks in user prose).
		expect(el.textContent).not.toContain('?');
		expect(el.textContent).not.toContain('What it means here');
		expect(el.querySelectorAll('h3')).toHaveLength(0);
	});
});
