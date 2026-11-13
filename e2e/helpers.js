import { installScript } from './script.js';

export const MINE_KEY = 'agenda-sants-montjuic-2026-11:mine';
export const TODAY = '2026-11-10T09:00:00+01:00';

/**
 * Opens the agenda with a freshly seeded sheet and a fixed clock, and waits for the cards.
 * `offline` visits once to store the offline copy and then makes the script unreachable.
 * `prepare` runs before the first visit, to change the seeded sheet for one test.
 * `path` is the page to open (`./eixample` for a district); `waitForCards: false` does not wait for the first card.
 * @param {import('@playwright/test').Page} page
 * @param {{
 *   today?: string, path?: string, waitForCards?: boolean, query?: string, offline?: boolean, options?: import('./script.js').ScriptOptions,
 *   prepare?: (handle: Awaited<ReturnType<typeof installScript>>) => void
 * }} [config]
 */
export async function openAgenda(
	page,
	{ today = TODAY, path = './', waitForCards = true, query = '', offline = false, options = {}, prepare } = {}
) {
	const handle = await installScript(page, options);
	prepare?.(handle);
	await page.clock.setFixedTime(today);
	if (offline) {
		await page.goto(path);
		if (waitForCards) await cards(page).first().waitFor();
		options.down = true;
	}
	await page.goto(query ? `${path}?${query}` : path);
	if (waitForCards) await cards(page).first().waitFor();
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

/**
 * Replaces `navigator.share` and `navigator.canShare` before the page loads. `behaviour` has one entry
 * per `share` call: `'ok'` resolves and any other value rejects with a DOMException of that name, for
 * example `['NotAllowedError', 'ok']` for «refuses once, then works». Calls past the list resolve.
 * Every call is kept in `window.__shareCalls` as `{files, text}` with the real `File` objects, so a
 * test can tell whether two calls got the very same file. With `files: false`, `canShare` refuses files.
 * @param {import('@playwright/test').Page} page
 * @param {string[]} [behaviour] @param {{ files?: boolean, pending?: number[] }} [options]
 */
export async function mockShare(page, behaviour = ['ok'], { files = true, pending = [] } = {}) {
	await page.addInitScript(
		({ behaviour, files, pending }) => {
			/** @type {Array<{ files: File[], text?: string }>} */
			const calls = [];
			/** @type {Map<number, { resolve: () => void, reject: (error: DOMException) => void }>} */
			const unsettled = new Map();
			Object.assign(window, { __shareCalls: calls });
			Object.assign(window, { __pendingShareCalls: unsettled });
			Object.defineProperty(navigator, 'canShare', {
				configurable: true,
				value: (/** @type {ShareData} */ data) => files || !data?.files?.length
			});
			Object.defineProperty(navigator, 'share', {
				configurable: true,
				value: (/** @type {ShareData} */ data) => {
					const index = calls.length;
					calls.push({ files: [...(data.files ?? [])], text: data.text });
					if (pending.includes(index)) {
						return new Promise((resolve, reject) => {
							unsettled.set(index, { resolve: () => resolve(), reject });
						});
					}
					const outcome = behaviour[index] ?? 'ok';
					return outcome === 'ok'
						? Promise.resolve()
						: Promise.reject(new DOMException('simulated', outcome));
				}
			});
		},
		{ behaviour, files, pending }
	);
}

/** @param {import('@playwright/test').Page} page */
export function pendingShareCalls(page) {
	return page.evaluate(() =>
		[.../** @type {any} */ (window).__pendingShareCalls.keys()].sort((a, b) => a - b)
	);
}

/**
 * Resolves or rejects one held share call; unknown and settled indices are test errors.
 * @param {import('@playwright/test').Page} page @param {number} index @param {string} [outcome]
 */
export async function settleShare(page, index, outcome = 'ok') {
	await page.evaluate(
		([callIndex, result]) => {
			const pending = /** @type {any} */ (window).__pendingShareCalls;
			const entry = pending.get(callIndex);
			if (!entry) throw new Error(`No unsettled share call at index ${callIndex}`);
			pending.delete(callIndex);
			if (result === 'ok') entry.resolve();
			else entry.reject(new DOMException('simulated', result));
		},
		[index, outcome]
	);
}

/**
 * What the page passed to the mocked `navigator.share`, as plain data (file name, type and size).
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<Array<{ files: Array<{ name: string, type: string, size: number }>, text?: string }>>}
 */
export function shareCalls(page) {
	return page.evaluate(() =>
		/** @type {any} */ (window).__shareCalls.map((/** @type {{ files: File[], text?: string }} */ call) => ({
			files: call.files.map((file) => ({ name: file.name, type: file.type, size: file.size })),
			text: call.text
		}))
	);
}

/** Whether two calls of the mocked `navigator.share` got the very same `File` object. @param {import('@playwright/test').Page} page */
export function sameShareFile(page, first = 0, second = 1) {
	return page.evaluate(
		([a, b]) => {
			const calls = /** @type {any} */ (window).__shareCalls;
			return calls[a].files[0] === calls[b].files[0];
		},
		[first, second]
	);
}

/**
 * Counts, from the next page load, how many times the poster is put in the page: one per generation.
 * Read the count with `postersRendered`.
 * @param {import('@playwright/test').Page} page
 */
export async function trackPosters(page) {
	await page.addInitScript(() => {
		Object.assign(window, { __posters: 0 });
		new MutationObserver((records) => {
			for (const record of records) {
				for (const node of record.addedNodes) {
					if (node instanceof Element && (node.matches('.poster') || node.querySelector('.poster'))) {
						/** @type {any} */ (window).__posters++;
					}
				}
			}
		}).observe(document, { childList: true, subtree: true });
	});
}

/** @param {import('@playwright/test').Page} page */
export const postersRendered = (page) => page.evaluate(() => /** @type {any} */ (window).__posters);
