import { expect, test } from '@playwright/test';
import { T } from '../src/lib/texts.js';
import {
	card,
	detailDialog,
	mockShare,
	openAgenda,
	postersRendered,
	sameShareFile,
	shareCalls,
	trackPosters
} from './helpers.js';

const ID = 'accio-1';
const DETAIL_URL = `http://localhost:5300/agenda-front-ampli/?e=${ID}`;
const EXPECTED_TEXT =
	`📢 *Paradeta al mercat* 📢\n\n🗓️ Dijous 12 de novembre\n⏰ 10h-14h\n📍 Mercat de Sants\n\n🔗 Més detalls i inscripcions: ${DETAIL_URL}`;
const WA_LINK = `https://wa.me/?text=${encodeURIComponent(EXPECTED_TEXT)}`;

/**
 * Opens the detail of an event with `navigator.share` simulated, and counts the downloads and the
 * times the poster is generated.
 * @param {import('@playwright/test').Page} page
 * @param {{ behaviour?: string[], files?: boolean, query?: string }} [config]
 */
async function openDetail(page, { behaviour = ['ok'], files = true, query = `e=${ID}` } = {}) {
	await trackPosters(page);
	await mockShare(page, behaviour, { files });
	const downloads = /** @type {string[]} */ ([]);
	page.on('download', (download) => downloads.push(download.suggestedFilename()));
	await openAgenda(page, { query });
	const detail = detailDialog(page);
	await expect(detail).toBeVisible();
	return {
		detail,
		downloads,
		share: detail.getByRole('button', { name: T.share.share, exact: true }),
		ready: detail.getByRole('button', { name: T.share.ready }),
		waLink: detail.getByRole('link', { name: new RegExp(T.share.waLink) }),
		live: detail.locator('.live')
	};
}

/** Waits until the mocked `navigator.share` has been called `count` times. @param {import('@playwright/test').Page} page @param {number} count */
const sharedTimes = (page, count) => expect.poll(async () => (await shareCalls(page)).length).toBe(count);

test('èxit: un sol share amb l’arxiu agenda-<id>.png i la plantilla completa, i torna a repòs', async ({ page }) => {
	const { share, waLink, live, downloads } = await openDetail(page);
	await share.click();
	await sharedTimes(page, 1);

	const [call] = await shareCalls(page);
	expect(call.files).toEqual([{ name: `agenda-${ID}.png`, type: 'image/png', size: expect.any(Number) }]);
	expect(call.files[0].size).toBeGreaterThan(1000);
	expect(call.text).toBe(EXPECTED_TEXT);
	expect(call.text).toContain(DETAIL_URL);

	await expect(share).toBeEnabled();
	await expect(waLink).toHaveCount(0);
	await expect(live).toHaveText('');
	expect(downloads).toEqual([]);
	expect(await postersRendered(page)).toBe(1);
	await expect(page.locator('.poster')).toHaveCount(0);
});

test('AbortError: no passa res i no hi ha enllaç de respatller', async ({ page }) => {
	const { share, ready, waLink, live, downloads } = await openDetail(page, { behaviour: ['AbortError'] });
	await share.click();
	await sharedTimes(page, 1);

	await expect(share).toBeEnabled();
	await expect(ready).toHaveCount(0);
	await expect(waLink).toHaveCount(0);
	await expect(live).toHaveText('');
	expect(downloads).toEqual([]);
	expect(await shareCalls(page)).toHaveLength(1);
});

test('NotAllowedError: queda «preparada» i el segon toc comparteix el MATEIX arxiu sense tornar a generar', async ({
	page
}) => {
	const { share, ready, waLink, downloads } = await openDetail(page, { behaviour: ['NotAllowedError', 'ok'] });
	await share.click();

	await expect(ready).toBeVisible();
	await expect(ready).toBeEnabled();
	await expect(share).toHaveCount(0);
	await expect(waLink).toHaveCount(0);
	expect(await shareCalls(page)).toHaveLength(1);
	expect(await postersRendered(page)).toBe(1);

	await ready.click();
	await sharedTimes(page, 2);

	// The same File object, and the poster was never mounted again.
	expect(await sameShareFile(page)).toBe(true);
	expect(await postersRendered(page)).toBe(1);
	const [first, second] = await shareCalls(page);
	expect(second).toEqual(first);

	await expect(share).toBeEnabled();
	await expect(ready).toHaveCount(0);
	await expect(waLink).toHaveCount(0);
	expect(downloads).toEqual([]);
});

test('dos NotAllowedError seguits: el segon va a la descàrrega i el botó no torna a «preparada»', async ({ page }) => {
	const { share, ready, waLink, live, downloads } = await openDetail(page, {
		behaviour: ['NotAllowedError', 'NotAllowedError']
	});
	await share.click();
	await expect(ready).toBeVisible();

	const [download] = await Promise.all([page.waitForEvent('download'), ready.click()]);
	expect(download.suggestedFilename()).toBe(`agenda-${ID}.png`);

	await expect(waLink).toHaveAttribute('href', WA_LINK);
	await expect(live).toHaveText(T.share.fallbackNote);
	await expect(share).toBeEnabled();
	await expect(ready).toHaveCount(0);
	expect(await shareCalls(page)).toHaveLength(2);
	// The downloaded file is the one already made.
	expect(await postersRendered(page)).toBe(1);
	expect(downloads).toEqual([`agenda-${ID}.png`]);
});

test('un altre error de share: descàrrega + enllaç wa.me només amb text + avís', async ({ page }) => {
	const { share, ready, waLink, live } = await openDetail(page, { behaviour: ['DataError'] });
	const [download] = await Promise.all([page.waitForEvent('download'), share.click()]);

	expect(download.suggestedFilename()).toBe(`agenda-${ID}.png`);
	await expect(waLink).toHaveAttribute('href', WA_LINK);
	await expect(live).toHaveText(T.share.fallbackNote);
	await expect(ready).toHaveCount(0);
	await expect(share).toBeEnabled();
});

test('sense suport d’arxius: descarrega la imatge i mostra l’enllaç wa.me amb el text codificat i l’avís', async ({
	page
}) => {
	const { share, waLink, live } = await openDetail(page, { files: false });
	const [download] = await Promise.all([page.waitForEvent('download'), share.click()]);

	expect(download.suggestedFilename()).toBe(`agenda-${ID}.png`);
	await expect(waLink).toBeVisible();
	await expect(waLink).toHaveAttribute('href', WA_LINK);
	await expect(waLink).toHaveAttribute('target', '_blank');
	await expect(waLink).toHaveAttribute('rel', /noopener/);
	await expect(live).toHaveText(T.share.fallbackNote);
	// `share` is never called when the browser does not accept the file.
	expect(await shareCalls(page)).toHaveLength(0);
	await expect(share).toBeEnabled();
});

test('si no es pot generar la imatge: missatge i enllaç wa.me només amb text, sense descàrrega', async ({ page }) => {
	await page.addInitScript(() => {
		// Simulates a font that never loads (the same way image.spec.js does).
		document.fonts.check = () => false;
	});
	const { share, waLink, live, downloads } = await openDetail(page);
	await share.click();

	await expect(live).toHaveText(T.share.imageFailed);
	await expect(waLink).toHaveAttribute('href', WA_LINK);
	await expect(waLink).toHaveAttribute('target', '_blank');
	await expect(share).toBeEnabled();
	await expect(page.locator('.poster')).toHaveCount(0);
	expect(downloads).toEqual([]);
	expect(await shareCalls(page)).toHaveLength(0);
});

test('un doble toc mentre genera no llança una segona generació', async ({ page }) => {
	const { share, downloads } = await openDetail(page);
	// Two clicks in the same task: the second one reaches the button before it is drawn as disabled.
	await share.evaluate((button) => {
		button.click();
		button.click();
	});
	await sharedTimes(page, 1);
	await expect(share).toBeEnabled();

	expect(await shareCalls(page)).toHaveLength(1);
	expect(await postersRendered(page)).toBe(1);
	expect(downloads).toEqual([]);
});

test('mentre genera, el botó diu «Generant…» i està desactivat', async ({ page }) => {
	await page.addInitScript(() => {
		// Holds the generation until the test lets it go.
		const load = document.fonts.load.bind(document.fonts);
		document.fonts.load = async (...args) => {
			await new Promise((resolve) => Object.assign(window, { __release: resolve }));
			return load(...args);
		};
	});
	const { detail, share } = await openDetail(page);
	await share.click();

	const generating = detail.getByRole('button', { name: T.share.generating });
	await expect(generating).toBeDisabled();
	await expect(detail.getByRole('button', { name: T.share.download })).toBeDisabled();
	await expect.poll(() => page.evaluate(() => '__release' in window)).toBe(true);
	await page.evaluate(() => /** @type {any} */ (window).__release());

	await sharedTimes(page, 1);
	await expect(share).toBeEnabled();
	expect(await postersRendered(page)).toBe(1);
});

test('la imatge preparada es descarta en tancar el detall', async ({ page }) => {
	const { detail, share, ready } = await openDetail(page, { behaviour: ['NotAllowedError', 'ok'] });
	await share.click();
	await expect(ready).toBeVisible();

	await detail.getByRole('button', { name: T.detail.close }).click();
	await expect(detail).toBeHidden();
	await card(page, ID).getByRole('link', { name: /^Veure el detall de/ }).click();

	await expect(detailDialog(page).getByRole('button', { name: T.share.share, exact: true })).toBeVisible();
	await expect(ready).toHaveCount(0);
});
