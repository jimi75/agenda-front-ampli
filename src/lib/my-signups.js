import { MY_SIGNUPS_KEY } from './config.js';

/**
 * @typedef {{ eventId: string, requestId: string, name: string }} MySignup
 * @typedef {Pick<Storage, 'getItem' | 'setItem'> | null | undefined} MyStorage
 */

const isString = (/** @type {unknown} */ v) => typeof v === 'string';

/** @param {any} item @returns {item is MySignup} */
function isItem(item) {
	return !!item && isString(item.eventId) && isString(item.requestId) && isString(item.name);
}

/**
 * This browser's own signups, the only place where the secret of an unsignup lives.
 * Corrupt JSON, a missing storage or malformed items read as "nothing".
 * @param {MyStorage} storage
 * @returns {MySignup[]}
 */
export function readMine(storage) {
	try {
		const stored = JSON.parse(storage?.getItem(MY_SIGNUPS_KEY) ?? 'null');
		if (!stored || stored.v !== 1 || !Array.isArray(stored.items)) return [];
		return /** @type {unknown[]} */ (stored.items)
			.filter(isItem)
			.map(({ eventId, requestId, name }) => ({ eventId, requestId, name }));
	} catch {
		return [];
	}
}

/** @param {MyStorage} storage @param {MySignup[]} items */
function write(storage, items) {
	try {
		storage?.setItem(MY_SIGNUPS_KEY, JSON.stringify({ v: 1, items }));
	} catch {
		// A full or blocked storage only loses the local record.
	}
}

/** @param {MyStorage} storage @param {MySignup} item */
export function addMine(storage, item) {
	write(storage, [...readMine(storage), item]);
}

/** @param {MyStorage} storage @param {string} eventId @param {string} requestId */
export function removeMine(storage, eventId, requestId) {
	write(
		storage,
		readMine(storage).filter((item) => !(item.eventId === eventId && item.requestId === requestId))
	);
}

/** @param {MyStorage} storage @param {string} eventId */
export function mineForEvent(storage, eventId) {
	return readMine(storage).filter((item) => item.eventId === eventId);
}
