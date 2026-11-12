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

/**
 * Saves a generated file with a temporary `<a download>` over an object URL. A browser without
 * `download` support opens the URL in a new tab instead.
 * @param {File} file
 * @param {{
 *   document: Pick<Document, 'createElement'> & { body: Pick<HTMLElement, 'append'> },
 *   URL: Pick<typeof URL, 'createObjectURL' | 'revokeObjectURL'>,
 *   open: (url: string, target: string, features: string) => unknown,
 *   setTimeout: (callback: () => void, ms: number) => unknown
 * }} [env]
 */
export function downloadFile(file, env = globalThis) {
	const url = env.URL.createObjectURL(file);
	const link = env.document.createElement('a');
	if ('download' in link) {
		link.href = url;
		link.download = file.name;
		link.rel = 'noopener';
		env.document.body.append(link);
		link.click();
		link.remove();
	} else {
		env.open(url, '_blank', 'noopener');
	}
	env.setTimeout(() => env.URL.revokeObjectURL(url), 60_000);
}
