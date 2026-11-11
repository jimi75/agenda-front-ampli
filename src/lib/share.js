import { T } from './texts.js';

/**
 * The link to an event's detail. It is built from the origin and path only, so it never
 * carries `?admin` or any other parameter of the current address.
 * @param {{ origin: string, pathname: string }} location @param {string} id
 */
export function detailUrl(location, id) {
	return `${location.origin}${location.pathname}?e=${encodeURIComponent(id)}`;
}

/** @param {string} url */
export function shareText(url) {
	return T.share.text(url);
}

/** @param {string} text */
export function waLink(text) {
	return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/**
 * @param {string} text
 * @param {{ clipboard?: Pick<Clipboard, 'writeText'> }} [nav]
 * @returns {Promise<boolean>}
 */
export async function copyText(text, nav = globalThis.navigator) {
	try {
		if (!nav?.clipboard?.writeText) return false;
		await nav.clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
}
