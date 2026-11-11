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
