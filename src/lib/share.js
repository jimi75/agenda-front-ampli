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
 * Shares an image with the text through the system panel (Web Share API with files).
 * Nothing is awaited before `nav.share` is called, so a tap that calls this keeps its user
 * activation. `canShare` is checked here, with the file already made, and not before generating it.
 * - `shared`: the share went through. `aborted`: the person closed the panel (or there is no target).
 * - `needs-second-tap`: the browser refused with `NotAllowedError` (usually the activation expired
 *   while the image was generated); with `second: true` that is an `error`, never a new second tap.
 * - `unsupported`: no `share`, or `canShare` does not accept the file. `error`: anything else.
 * @param {File} file @param {string} text
 * @param {{ nav?: { share?: (data: ShareData) => Promise<void>, canShare?: (data: ShareData) => boolean }, second?: boolean }} [options]
 * @returns {Promise<'shared' | 'aborted' | 'needs-second-tap' | 'unsupported' | 'error'>}
 */
export async function shareImage(file, text, { nav = globalThis.navigator, second = false } = {}) {
	if (!nav?.share || !nav.canShare?.({ files: [file] })) return 'unsupported';
	try {
		await nav.share({ files: [file], text });
		return 'shared';
	} catch (error) {
		const name = /** @type {{ name?: unknown } | null} */ (error)?.name;
		if (name === 'AbortError') return 'aborted';
		if (name === 'NotAllowedError') return second ? 'error' : 'needs-second-tap';
		return 'error';
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
