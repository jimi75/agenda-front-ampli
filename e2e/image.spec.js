import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { EVENT_HEADER_OPTIONAL } from '../apps-script/fake-google.js';
import { POSTER } from '../src/lib/config.js';
import { T } from '../src/lib/texts.js';
import { card, detailDialog, hasInk, openAgenda, pixelAt, readPngSize } from './helpers.js';

// A phone with 3x density: without `pixelRatio: 1` the PNG would not be 2048 × 1346.
test.use({ deviceScaleFactor: 3 });

// 120 characters each (the most the agenda keeps) and wide letters: the name needs more than four
// lines, so it is cut by the clamp, and the place takes as many lines as it can.
// Chrome 158 loses the ellipsis of `line-clamp` in html-to-image's clone, so only the cut is checked.
const LONG_NAME = 'MWMWMWMW '.repeat(14).slice(0, 120).trim();
const LONG_PLACE = 'Mercat Municipal de Montjuïc Wi-Fi '.repeat(4).slice(0, 120).trim();

/** @param {string} hex @returns {number[]} */
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** The colour of a CSS variable of the page, as RGB. @param {import('@playwright/test').Page} page @param {string} name */
async function cssColor(page, name) {
	const hex = await page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
	return rgb(hex);
}

/** Opens the detail of an event, taps «Descarrega la imatge» and returns the downloaded file. */
async function downloadImage(/** @type {import('@playwright/test').Page} */ page, /** @type {string} */ id) {
	await card(page, id).getByRole('link', { name: /^Veure el detall de/ }).click();
	const button = detailDialog(page).getByRole('button', { name: T.share.download });
	const [download] = await Promise.all([page.waitForEvent('download'), button.click()]);
	const path = await download.path();
	return { name: download.suggestedFilename(), png: await readFile(path) };
}

for (const [id, type, variable] of /** @type {const} */ ([
	['accio-1', 'Acció', '--lime'],
	['acte-1', 'Acte', '--rust']
])) {
	test(`la imatge d’un ${type} baixa a 2048 × 1346, no és en blanc i té el color del tipus`, async ({ page }) => {
		await openAgenda(page);
		const { name, png } = await downloadImage(page, id);

		expect(name).toBe(`agenda-${id}.png`);
		expect(readPngSize(png)).toEqual(POSTER);
		expect(await pixelAt(page, png, 20, 1300)).toEqual(await cssColor(page, variable));

		// The poster is gone and the button is back to normal.
		await expect(page.locator('.poster')).toHaveCount(0);
		await expect(detailDialog(page).getByRole('button', { name: T.share.download })).toBeEnabled();
	});
}

test('un nom i un lloc llargs es retallen i queden dins la imatge', async ({ page }) => {
	await openAgenda(page, {
		prepare: ({ script }) => {
			const row = script.sheets.get('Esdeveniments')?.rows.find((r) => r[0] === 'accio-1');
			if (!row) throw new Error('Falta accio-1');
			row[EVENT_HEADER_OPTIONAL.indexOf('nom')] = LONG_NAME;
			row[EVENT_HEADER_OPTIONAL.indexOf('lloc')] = LONG_PLACE;
		}
	});
	const { png } = await downloadImage(page, 'accio-1');
	expect(readPngSize(png)).toEqual(POSTER);

	const background = await cssColor(page, '--lime');
	// Text reaches the lower part (the place is the last block) ...
	expect(await hasInk(page, png, { x: 0, y: 900, width: POSTER.width, height: 300 }, background)).toBe(true);
	// ... but not the bottom margin nor the right margin.
	expect(await hasInk(page, png, { x: 0, y: 1290, width: POSTER.width, height: POSTER.height - 1290 }, background)).toBe(false);
	expect(await hasInk(page, png, { x: POSTER.width - 80, y: 200, width: 80, height: POSTER.height - 200 }, background)).toBe(false);
});

test('si no es pot generar la imatge, es diu i el botó queda a punt per tornar-ho a provar', async ({ page }) => {
	await page.addInitScript(() => {
		// Simulates a font that never loads.
		document.fonts.check = () => false;
	});
	await openAgenda(page);
	await card(page, 'accio-1').getByRole('link', { name: /^Veure el detall de/ }).click();
	const detail = detailDialog(page);
	await detail.getByRole('button', { name: T.share.download }).click();

	await expect(detail).toContainText(T.share.imageFailed);
	await expect(detail.getByRole('button', { name: T.share.download })).toBeEnabled();
	await expect(page.locator('.poster')).toHaveCount(0);
});

test('en els estats sense compartir no hi ha botó d’imatge', async ({ page }) => {
	await openAgenda(page);
	await card(page, 'cancel-1').getByRole('button', { name: /^Veure qui s’ha apuntat/ }).click();
	await expect(detailDialog(page)).toBeVisible();
	await expect(detailDialog(page).getByRole('button', { name: T.share.download })).toHaveCount(0);
});
