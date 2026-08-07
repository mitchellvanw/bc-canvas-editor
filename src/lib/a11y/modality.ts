/**
 * Which input last drove the app — the distinction SPEC §8.4 needs for
 * contenteditable fields, where :focus-visible can't tell a keyboard Tab from
 * a pointer click (browsers treat text-entry targets as always focus-visible).
 * A focus that follows a keydown is keyboard-initiated and gets the 2px ring;
 * one that follows a pointerdown keeps the hairline + caret.
 */

type Modality = 'keyboard' | 'pointer';

// Keyboard until proven otherwise: programmatic focus before any input (the
// add-and-focus flows) most often continues a keyboard journey.
let modality: Modality = 'keyboard';

/** Start listening; returns the teardown. Capture phase so no handler can stop it. */
export function trackModality(): () => void {
	const onKeydown = () => (modality = 'keyboard');
	const onPointerdown = () => (modality = 'pointer');
	window.addEventListener('keydown', onKeydown, true);
	window.addEventListener('pointerdown', onPointerdown, true);
	return () => {
		window.removeEventListener('keydown', onKeydown, true);
		window.removeEventListener('pointerdown', onPointerdown, true);
	};
}

/** The input kind that most recently preceded the current focus. */
export function lastInputModality(): Modality {
	return modality;
}
