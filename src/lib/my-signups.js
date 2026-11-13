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
 * @param {string} [key] one key per district
 * @returns {MySignup[]}
 */
export function readMine(storage, key = MY_SIGNUPS_KEY) {
	try {
		const stored = JSON.parse(storage?.getItem(key) ?? 'null');
		if (!stored || stored.v !== 1 || !Array.isArray(stored.items)) return [];
		return /** @type {unknown[]} */ (stored.items)
			.filter(isItem)
			.map(({ eventId, requestId, name }) => ({ eventId, requestId, name }));
	} catch {
		return [];
	}
}

/** @param {MyStorage} storage @param {MySignup[]} items @param {string} key */
function write(storage, items, key) {
	try {
		storage?.setItem(key, JSON.stringify({ v: 1, items }));
	} catch {
		// A full or blocked storage only loses the local record.
	}
}

/** @param {MyStorage} storage @param {MySignup} item @param {string} [key] */
export function addMine(storage, item, key = MY_SIGNUPS_KEY) {
	write(storage, [...readMine(storage, key), item], key);
}

/** @param {MyStorage} storage @param {string} eventId @param {string} requestId @param {string} [key] */
export function removeMine(storage, eventId, requestId, key = MY_SIGNUPS_KEY) {
	write(
		storage,
		readMine(storage, key).filter((item) => !(item.eventId === eventId && item.requestId === requestId)),
		key
	);
}

/** @param {MyStorage} storage @param {string} eventId @param {string} [key] */
export function mineForEvent(storage, eventId, key = MY_SIGNUPS_KEY) {
	return readMine(storage, key).filter((item) => item.eventId === eventId);
}
