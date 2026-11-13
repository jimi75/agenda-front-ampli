/**
 * @typedef {{ slug: string, name: string, deName: string, prefix: string | null }} District
 */

/** Served at `/`: sends no `d` and keeps the browser keys it always had. */
/** @type {District} */
export const ROOT_DISTRICT = Object.freeze({
	slug: 'sants-montjuic',
	name: 'Sants-Montjuïc',
	deName: 'de Sants-Montjuïc',
	prefix: null
});

/** Districts with their own page, `/<slug>`: all but the root. */
/** @type {readonly District[]} */
export const ROUTED_DISTRICTS = Object.freeze([
	Object.freeze({ slug: 'eixample', name: 'Eixample', deName: 'de l’Eixample', prefix: 'eix-' })
]);

/** @param {string} slug @returns {District | null} */
export function findDistrict(slug) {
	return ROUTED_DISTRICTS.find((district) => district.slug === slug) ?? null;
}

/** @param {District} district */
export const storageKey = (district) => `agenda-${district.slug}-2026-11`;

/** @param {District} district */
export const mineKey = (district) => `${storageKey(district)}:mine`;

/** Same rule as eventsSheetName_ in apps-script/Code.gs, for districts that exist. @param {District} district */
export const eventsTabName = (district) => (district === ROOT_DISTRICT ? 'Esdeveniments' : `Esdeveniments ${district.slug}`);

/**
 * Ids of already validated events that do not start with the prefix of the district.
 * @param {{ id: string }[]} events @param {District} district
 */
export function missingPrefix(events, district) {
	const prefix = district.prefix;
	if (district === ROOT_DISTRICT || prefix === null) return [];
	return events.map((event) => event.id).filter((id) => !id.startsWith(prefix));
}
