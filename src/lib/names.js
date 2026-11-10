import { MAX_NAME_LENGTH } from './config.js';

// Same rule as apps-script/Code.gs. The server rule is the one that counts.
// The first character is a letter or digit, so a name can never start with = + - @ (sheet formulas).
const NAME_RE = new RegExp(`^[\\p{L}\\p{N}][\\p{L}\\p{N} .'’·_-]{0,${MAX_NAME_LENGTH - 1}}$`, 'u');

/** @param {unknown} raw */
export function cleanName(raw) {
	return String(raw ?? '')
		.normalize('NFC')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * @param {unknown} raw
 * @returns {{ ok: true, name: string } | { ok: false, error: 'empty' | 'invalid_name' }}
 */
export function validateName(raw) {
	const name = cleanName(raw);
	if (!name) return { ok: false, error: 'empty' };
	if (!NAME_RE.test(name)) return { ok: false, error: 'invalid_name' };
	return { ok: true, name };
}
