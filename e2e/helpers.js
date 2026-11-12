import { installScript } from './script.js';

export const MINE_KEY = 'agenda-sants-montjuic-2026-11:mine';
export const TODAY = '2026-11-10T09:00:00+01:00';

/**
 * Opens the agenda with a freshly seeded sheet and a fixed clock, and waits for the cards.
 * `offline` visits once to store the offline copy and then makes the script unreachable.
 * `prepare` runs before the first visit, to change the seeded sheet for one test.
 * @param {import('@playwright/test').Page} page
 * @param {{
 *   today?: string, query?: string, offline?: boolean, options?: import('./script.js').ScriptOptions,
 *   prepare?: (handle: Awaited<ReturnType<typeof installScript>>) => void
 * }} [config]
 */
export async function openAgenda(page, { today = TODAY, query = '', offline = false, options = {}, prepare } = {}) {
	const handle = await installScript(page, options);
	prepare?.(handle);
	await page.clock.setFixedTime(today);
	if (offline) {
		await page.goto('./');
		await cards(page).first().waitFor();
		options.down = true;
	}
	await page.goto(query ? `./?${query}` : './');
	await cards(page).first().waitFor();
	return { ...handle, options };
}

/** @param {import('@playwright/test').Page} page */
export const cards = (page) => page.locator('article.event');

/** The card of an event, found by its «detall» link. @param {import('@playwright/test').Page} page @param {string} id */
export const card = (page, id) => cards(page).filter({ has: page.locator(`a[href="?e=${id}"]`) });

/** @param {import('@playwright/test').Page} page */
export const detailDialog = (page) => page.locator('dialog[open][aria-labelledby="detail-title"]');

/** @param {import('@playwright/test').Page} page */
export const signupDialog = (page) => page.locator('dialog[open][aria-labelledby="signup-title"]');

/** @param {import('@playwright/test').Page} page */
export const readMine = (page) =>
	page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), MINE_KEY);

/** Width and height from the IHDR chunk of a PNG. @param {Buffer} buffer */
export function readPngSize(buffer) {
	const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
	if (buffer.length < 24 || !buffer.subarray(0, 8).equals(signature)) throw new Error('No és un PNG');
	if (buffer.toString('ascii', 12, 16) !== 'IHDR') throw new Error('Falta el bloc IHDR');
	return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

/**
 * RGB of one pixel of a PNG, or whether any pixel of a region differs from a background, read from
 * a canvas inside the page (so a large region is not serialised).
 * @param {import('@playwright/test').Page} page @param {Buffer} png
 * @param {{ x: number, y: number, width: number, height: number }} region @param {number[] | null} background
 * @returns {Promise<number[] | boolean>}
 */
function readRegion(page, png, region, background) {
	return page.evaluate(
		async ({ base64, region, background }) => {
			const image = new Image();
			image.src = `data:image/png;base64,${base64}`;
			await image.decode();
			const canvas = document.createElement('canvas');
			canvas.width = image.naturalWidth;
			canvas.height = image.naturalHeight;
			const context = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
			context.drawImage(image, 0, 0);
			const { data } = context.getImageData(region.x, region.y, region.width, region.height);
			if (!background) return [data[0], data[1], data[2]];
			for (let i = 0; i < data.length; i += 4) {
				if (data[i] !== background[0] || data[i + 1] !== background[1] || data[i + 2] !== background[2]) return true;
			}
			return false;
		},
		{ base64: png.toString('base64'), region, background }
	);
}

/** RGB colour of one pixel of a PNG. @param {import('@playwright/test').Page} page @param {Buffer} png @param {number} x @param {number} y */
export async function pixelAt(page, png, x, y) {
	return /** @type {Promise<number[]>} */ (readRegion(page, png, { x, y, width: 1, height: 1 }, null));
}

/**
 * Whether any pixel of the region differs from `background`, that is, something is drawn there.
 * @param {import('@playwright/test').Page} page @param {Buffer} png
 * @param {{ x: number, y: number, width: number, height: number }} region @param {number[]} background
 */
export async function hasInk(page, png, region, background) {
	return /** @type {Promise<boolean>} */ (readRegion(page, png, region, background));
}

