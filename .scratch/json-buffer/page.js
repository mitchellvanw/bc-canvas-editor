/**
 * PROTOTYPE (wayfinder ticket 043) — the page. Throwaway shell over world.js.
 */

import * as world from './world.js';

const initialFile = world.parse(__CANVAS__).file;
const V1_TEXT = __V1__;

let state = world.initial(initialFile);
let scenario = null; // { key, step }

const $ = (id) => document.getElementById(id);

/* ---------------------------------------------------------------- rendering */

function render() {
	const bytes = world.docBytes(state);
	const box = world.boxText(state);
	const dirty = world.marker(state);

	// The switcher, with the marker exactly where 042 put it.
	for (const name of ['sheet', 'json', 'markdown']) {
		const seg = $(`seg-${name}`);
		seg.classList.toggle('active', state.view === name);
	}
	$('marker').hidden = !dirty;

	$('panel-sheet').hidden = state.view !== 'sheet';
	$('panel-json').hidden = state.view !== 'json';
	$('panel-markdown').hidden = state.view !== 'markdown';

	$('canvas-name').textContent = state.doc.name;
	$('canvas-purpose').textContent = state.doc.purpose;
	$('canvas-terms').textContent =
		state.doc.ubiquitousLanguage.map((t) => t.term).join(' · ') || '—';
	$('panel-markdown').textContent = world.digest(state.doc);

	const area = $('box');
	if (area.value !== box) area.value = box;

	$('state-view').textContent = { sheet: 'Sheet', json: 'JSON', markdown: 'Markdown' }[state.view];
	$('state-buffer').textContent = dirty
		? 'Proposing — the box holds text that is not the canvas'
		: 'Following the canvas';
	$('state-marker').textContent = dirty ? 'on' : 'off';
	$('state-marker').className = dirty ? 'val on' : 'val';
	$('state-undo').textContent = `${state.past.length} back, ${state.future.length} forward`;
	$('state-unexported').textContent = world.unexported(state) ? 'yes' : 'no';
	$('state-notice').textContent = state.notice ? 'showing' : 'hidden';
	$('state-slot').textContent = `${state.slot.length} bytes — ${
		state.slot === bytes ? 'this tab’s canvas' : 'NOT this tab’s canvas'
	}`;

	// Provisional wording — this string belongs to ticket 045's writing-copy pass
	// with the rest of the View's §10 strings.
	$('moved').hidden = !world.moved(state);
	$('state-moved').textContent = world.moved(state) ? 'yes' : 'no';

	const refusal = state.json.error;
	$('refusal').hidden = !refusal;
	if (refusal) {
		$('refusal-reason').textContent =
			refusal.reason === 'newer-version'
				? `made by a newer version (${refusal.version})`
				: 'not a Canvas file';
		$('refusal-detail').textContent = refusal.detail ?? '';
	}

	const log = $('log');
	log.innerHTML = '';
	for (const line of state.log.slice(-8)) {
		const li = document.createElement('li');
		li.textContent = line;
		log.append(li);
	}

	renderSteps();
}

function act(name, ...args) {
	state = world.ACTIONS[name](state, ...args);
	render();
}

/* ------------------------------------------------------------------ actions */

const EDITS = {
	'a valid hand-edit (renames the canvas)': () =>
		world.docBytes(state).replace(/"name": "[^"]*"/, '"name": "Hand-edited in the box"'),
	'the same canvas, reformatted (no real change)': () =>
		JSON.stringify(JSON.parse(world.docBytes(state))).replaceAll('<', '\\u003c'),
	'text that is not valid JSON': () => world.docBytes(state).slice(0, 120) + '\n  ...oops',
	'JSON with a wrong field type': () =>
		world.docBytes(state).replace(/"purpose": "[^"]*"/, '"purpose": 42'),
	'a version 1 canvas': () => V1_TEXT,
	'exactly the canvas again': () => world.docBytes(state)
};

const FREE = [
	['Switch to Sheet', () => act('view', 'sheet')],
	['Switch to JSON', () => act('view', 'json')],
	['Switch to Markdown', () => act('view', 'markdown')],
	['Apply', () => act('apply')],
	['Edit the canvas on the sheet', () => act('sheet', renameTerm)],
	['Undo', () => act('undo')],
	['Redo', () => act('redo')],
	['Export the Canvas file', () => act('export')],
	['Another tab saves', () => act('otherTab', otherTabCanvas())],
	['Close/background the tab (flush)', () => act('flush')],
	['Reload the page', () => act('reload')],
	['Open a different canvas', () => act('open', otherTabCanvas(), 'a different canvas')]
];

let termCount = 0;
function renameTerm(doc) {
	termCount += 1;
	doc.ubiquitousLanguage = [
		...doc.ubiquitousLanguage,
		{ term: `Sheet edit ${termCount}`, definition: 'Typed on the sheet, not in the box.' }
	];
	return doc;
}

function otherTabCanvas() {
	const other = structuredClone(initialFile);
	other.name = 'The other tab’s canvas';
	other.purpose = 'Saved over the shared slot by a second tab.';
	return other;
}

/* -------------------------------------------------------------- walkthroughs */

const SCENARIOS = [
	{
		key: 'return',
		title: 'Type, leave, come back',
		blurb:
			'The plainest case, and the one everything else rests on: text left in the box survives a trip to the Sheet, and the dot on the JSON tab says so the whole time.',
		steps: [
			['Go to the JSON view', () => act('view', 'json')],
			['Hand-edit the canvas name in the box', () => type('a valid hand-edit (renames the canvas)')],
			['Switch to the Sheet', () => act('view', 'sheet')],
			['Come back to JSON', () => act('view', 'json')]
		],
		watch: 'The box still holds your text and the dot never went out. Nothing was applied.'
	},
	{
		key: 'moves',
		title: 'The canvas moves under the box',
		blurb:
			'You leave text in the box, then edit the sheet. Both are true at once: the canvas has moved, your text has not — and Apply replaces the whole canvas, so pressing it drops the sheet edit. The box says so before you press it.',
		steps: [
			['Go to the JSON view', () => act('view', 'json')],
			['Hand-edit the canvas name in the box', () => type('a valid hand-edit (renames the canvas)')],
			['Switch to the Sheet', () => act('view', 'sheet')],
			['Add a term on the sheet', () => act('sheet', renameTerm)],
			['Back to JSON', () => act('view', 'json')],
			['Undo the sheet edit', () => act('undo')],
			['Redo it', () => act('redo')],
			['Apply anyway', () => act('apply')],
			['Undo', () => act('undo')]
		],
		watch:
			'The line above Apply appeared when the canvas moved out from under your text, went away when Undo put it back, and returned with Redo — it is a byte comparison against the canvas as it was when you started typing, not a flag someone sets. Applying anyway drops the sheet edit, as it always would, and one Undo brings it back.'
	},
	{
		key: 'apply-undo',
		title: 'Apply, then undo',
		blurb:
			'One Apply is one commit, so one Undo pops the whole replacement. The question is what the box shows afterwards — and whether it feels like the app ate your edit.',
		steps: [
			['Go to the JSON view', () => act('view', 'json')],
			['Hand-edit the canvas name in the box', () => type('a valid hand-edit (renames the canvas)')],
			['Apply', () => act('apply')],
			['Undo', () => act('undo')],
			['Redo', () => act('redo')]
		],
		watch:
			'After Apply the box already shows the canvas re-serialized, not your keystrokes — so Undo takes away nothing Apply had not already normalized, and Redo puts the applied canvas back.'
	},
	{
		key: 'undo-with-text',
		title: 'Undo while the box holds unapplied text',
		blurb:
			'⌘Z inside the box is the browser’s own text undo — a real textarea, which the app’s global handler already steps around. This walkthrough is the other ⌘Z: pressing it outside the box, on the sheet, while the box holds text.',
		steps: [
			['Add a term on the sheet', () => act('sheet', renameTerm)],
			['Go to the JSON view', () => act('view', 'json')],
			['Hand-edit the canvas name in the box', () => type('a valid hand-edit (renames the canvas)')],
			['Switch to the Sheet', () => act('view', 'sheet')],
			['Undo (app undo, outside the box)', () => act('undo')],
			['Back to JSON', () => act('view', 'json')]
		],
		watch:
			'App undo moved the canvas and left the box alone. Undo history and the buffer are two different stacks, and the buffer is not on any stack at all.'
	},
	{
		key: 'other-tab',
		title: 'Another tab saves',
		blurb:
			'Last write wins is settled in the saved slot, not on screen: the notice appears, and this tab’s canvas does not move. Watch the slot line in the state panel.',
		steps: [
			['Go to the JSON view', () => act('view', 'json')],
			['Hand-edit the canvas name in the box', () => type('a valid hand-edit (renames the canvas)')],
			['Another tab saves', () => act('otherTab', otherTabCanvas())],
			['Apply', () => act('apply')],
			['Reload the page', () => act('reload')]
		],
		watch:
			'The box never lied, because nothing under it moved. Apply then wrote this tab’s canvas back over the slot — last write wins, exactly as before the JSON view existed — so the reload restores what Apply wrote, and the box comes back empty of your text.'
	},
	{
		key: 'noop',
		title: 'Apply that changes nothing',
		blurb:
			'Reformat the JSON without changing anything real, then Apply. A pick that changes nothing does not enter history; neither should this.',
		steps: [
			['Go to the JSON view', () => act('view', 'json')],
			['Reformat the JSON (same canvas, one line)', () => type('the same canvas, reformatted (no real change)')],
			['Apply', () => act('apply')]
		],
		watch:
			'Undo depth did not grow, and the box snapped back to the canvas’s own formatting. Applying identical bytes is the easy half; this is the half a raw text comparison would have missed.'
	},
	{
		key: 'migrate',
		title: 'Apply a version 1 canvas',
		blurb:
			'Paste an old Canvas file into the box. Apply runs the same import path a file does — version check, migrations, strict validation — so it comes back migrated.',
		steps: [
			['Go to the JSON view', () => act('view', 'json')],
			['Paste a version 1 canvas', () => type('a version 1 canvas')],
			['Apply', () => act('apply')]
		],
		watch:
			'The box now holds version 2 bytes you did not type: `description` became `purpose`, the collaborator became an object. The box re-rendering from the canvas is what makes the migration visible.'
	},
	{
		key: 'refusal',
		title: 'Apply something broken',
		blurb:
			'A refusal keeps your text — it is the one place in the app that names the offending field, because you are looking at the text it is talking about.',
		steps: [
			['Go to the JSON view', () => act('view', 'json')],
			['Break a field’s type', () => type('JSON with a wrong field type')],
			['Apply', () => act('apply')],
			['Edit the canvas on the sheet', () => act('sheet', renameTerm)],
			['Type something else in the box', () => type('text that is not valid JSON')]
		],
		watch:
			'The refusal survived the canvas moving underneath — it is about the text, and the text did not move — and went away the moment the text changed. Words are ticket 044’s; this is only their lifetime.'
	},
	{
		key: 'boundary',
		title: 'Open a different canvas with text in the box',
		blurb:
			'The transition the ticket’s list does not mention, and the only one that throws the buffer away.',
		steps: [
			['Go to the JSON view', () => act('view', 'json')],
			['Hand-edit the canvas name in the box', () => type('a valid hand-edit (renames the canvas)')],
			['Open a different canvas', () => act('open', otherTabCanvas(), 'a different canvas')]
		],
		watch:
			'Your text is gone, with no dialog. The session boundary already discards the whole undo history; a proposal against a canvas that is no longer open goes with it. Everything else on this page preserves the buffer.'
	},
	{
		key: 'typed-back',
		title: 'Type it, then type it back',
		blurb:
			'The dot is not "you have been in here" — it is "the box and the canvas disagree". Undo your own typing by hand and watch it go out on its own.',
		steps: [
			['Go to the JSON view', () => act('view', 'json')],
			['Hand-edit the canvas name in the box', () => type('a valid hand-edit (renames the canvas)')],
			['Type the canvas back exactly', () => type('exactly the canvas again')],
			['Apply', () => act('apply')]
		],
		watch:
			'The dot went out without an Apply, and the Apply that followed did nothing at all. There is no state in here for "a box that has been typed in but agrees with the canvas" — the box either disagrees or it is following.'
	},
	{
		key: 'reload',
		title: 'Close the tab with text in the box',
		blurb:
			'Backgrounding or closing commits the field you were typing on the sheet. The box is not one of those fields — it registers nothing to flush — so a reload starts clean.',
		steps: [
			['Go to the JSON view', () => act('view', 'json')],
			['Hand-edit the canvas name in the box', () => type('a valid hand-edit (renames the canvas)')],
			['Close/background the tab (flush)', () => act('flush')],
			['Reload the page', () => act('reload')]
		],
		watch:
			'The flush changed nothing and the reload discarded the box. The saved slot holds the canvas, never the proposal.'
	}
];

function type(kind) {
	act('type', EDITS[kind]());
}

function startScenario(key) {
	state = world.initial(initialFile);
	termCount = 0;
	scenario = { key, step: 0 };
	render();
}

function renderSteps() {
	const tabs = $('scenario-tabs');
	for (const button of tabs.children) {
		button.classList.toggle('active', scenario?.key === button.dataset.key);
	}

	const box = $('scenario-body');
	box.innerHTML = '';
	if (!scenario) {
		box.innerHTML = '<p class="hint">Pick a walkthrough above, or just press things below.</p>';
		return;
	}
	const s = SCENARIOS.find((x) => x.key === scenario.key);

	const blurb = document.createElement('p');
	blurb.textContent = s.blurb;
	box.append(blurb);

	const list = document.createElement('ol');
	s.steps.forEach(([label, run], i) => {
		const li = document.createElement('li');
		const b = document.createElement('button');
		b.textContent = label;
		b.className = 'step';
		b.disabled = i !== scenario.step;
		if (i < scenario.step) li.classList.add('done');
		b.onclick = () => {
			scenario.step = i + 1;
			run();
		};
		li.append(b);
		list.append(li);
	});
	box.append(list);

	if (scenario.step >= s.steps.length) {
		const watch = document.createElement('p');
		watch.className = 'watch';
		watch.textContent = s.watch;
		box.append(watch);

		const again = document.createElement('button');
		again.textContent = 'Run it again';
		again.className = 'again';
		again.onclick = () => startScenario(s.key);
		box.append(again);
	}
}

/* --------------------------------------------------------------------- wire */

function boot() {
	const tabs = $('scenario-tabs');
	for (const s of SCENARIOS) {
		const b = document.createElement('button');
		b.textContent = s.title;
		b.dataset.key = s.key;
		b.onclick = () => startScenario(s.key);
		tabs.append(b);
	}

	const free = $('free-buttons');
	for (const [label, run] of FREE) {
		const b = document.createElement('button');
		b.textContent = label;
		b.onclick = run;
		free.append(b);
	}

	const edits = $('free-edits');
	for (const kind of Object.keys(EDITS)) {
		const b = document.createElement('button');
		b.textContent = `Put ${kind} in the box`;
		b.onclick = () => type(kind);
		edits.append(b);
	}

	$('box').addEventListener('input', (e) => act('type', e.target.value));
	$('apply').onclick = () => act('apply');
	for (const name of ['sheet', 'json', 'markdown']) {
		$(`seg-${name}`).onclick = () => act('view', name);
	}
	$('reset').onclick = () => {
		state = world.initial(initialFile);
		termCount = 0;
		scenario = null;
		render();
	};

	render();
}

boot();
