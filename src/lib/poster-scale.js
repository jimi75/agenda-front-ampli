/**
 * Scale tiers of the image text, checked in order. The limits come from the height budget in
 * docs/designs/imatge-text-gran.md («Escalones»). Tiers 2 and 3 assume the text takes several lines.
 * @type {readonly Readonly<{ k: number, maxName: number, maxPlace: number }>[]}
 */
const TIERS = Object.freeze([
	Object.freeze({ k: 1.9, maxName: 17, maxPlace: 40 }),
	Object.freeze({ k: 1.5, maxName: 40, maxPlace: 50 }),
	Object.freeze({ k: 1.15, maxName: 70, maxPlace: 110 })
]);

/**
 * The factor the text of the image is multiplied by: the shorter the name and the place, the bigger.
 * Long text keeps the base sizes (1).
 * @param {string} name @param {string} place Empty when the event has no place.
 * @returns {number}
 */
export function posterScale(name, place) {
	for (const tier of TIERS) {
		if (name.length <= tier.maxName && place.length <= tier.maxPlace) return tier.k;
	}
	return 1;
}
