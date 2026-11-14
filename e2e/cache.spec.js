import { expect, test } from '@playwright/test';
import { T } from '../src/lib/texts.js';
import { card, cards, openAgenda, signupDialog, TODAY } from './helpers.js';

const COPY_KEY = 'agenda-sants-montjuic-2026-11';
const OFFLINE_NOTICE = /^Dades (guardades|de fa)/;

/** Age of the stored copy in ms, rewriting its save time. @param {import('@playwright/test').Page} page @param {number} ageMs */
const ageCopy = (page, ageMs) =>
	page.evaluate(
		([key, age, now]) => {
			const stored = JSON.parse(localStorage.getItem(/** @type {string} */ (key)) ?? 'null');
			stored.at = /** @type {number} */ (now) - /** @type {number} */ (age);
			localStorage.setItem(/** @type {string} */ (key), JSON.stringify(stored));
		},
		[COPY_KEY, ageMs, Date.parse(TODAY)]
	);

test('amb una còpia jove, el calendari surt abans que arribi la resposta viva', async ({ page }) => {
	const { options } = await openAgenda(page);
	options.delayMs = 3000;
	await page.reload();
	await expect(cards(page).first()).toBeVisible({ timeout: 1500 });
	await expect(page.getByText(T.loading)).toHaveCount(0);
});

test('si la petició viva falla, es queda la còpia sense error ni avís', async ({ page }) => {
	await openAgenda(page, { offline: true });
	await expect(cards(page)).toHaveCount(6);
	await expect(page.getByText(OFFLINE_NOTICE)).toHaveCount(0);
	await expect(page.getByRole('alert')).toHaveCount(0);
});

test('una còpia de més d’una hora no es mostra primer', async ({ page }) => {
	const { options } = await openAgenda(page);
	await ageCopy(page, 3_600_001);
	options.delayMs = 1500;
	await page.reload();
	await expect(page.getByText(T.loading)).toBeVisible();
	await expect(cards(page).first()).toBeVisible();
});

test('les dades vives substitueixen la còpia', async ({ page }) => {
	const { options, script } = await openAgenda(page);
	options.delayMs = 500;
	script.sheets.get('Esdeveniments')?.rows.pop();
	await page.reload();
	await expect(cards(page).first()).toBeVisible();
	await expect(cards(page)).toHaveCount(5);
});

test('un ?e= que no és a la còpia espera les dades vives i obre el detall', async ({ page }) => {
	const { options, script } = await openAgenda(page);
	const sheet = script.sheets.get('Esdeveniments');
	const row = sheet?.rows.find((r) => r[0] === 'resp-1');
	// The copy has no `resp-1`: it is removed before the first visit is stored again.
	sheet?.rows.splice(sheet.rows.indexOf(/** @type {any} */ (row)), 1);
	await page.reload();
	await expect(cards(page).first()).toBeVisible();
	sheet?.rows.push(/** @type {any} */ (row));
	options.delayMs = 800;
	await page.goto('./?e=resp-1');
	await expect(page.getByText(T.loading)).toBeVisible();
	await expect(page.locator('dialog[open]').getByRole('heading', { level: 2 })).toHaveText('Enganxada de cartells');
});

test('un ?e= que no és a la còpia i amb la petició fallida mostra la còpia, l’avís i «no s’ha trobat»', async ({
	page
}) => {
	const { options } = await openAgenda(page);
	options.down = true;
	await page.goto('./?e=no-existeix');
	await expect(page.locator('dialog[open]')).toContainText(T.detail.notFound);
	await expect(page.getByText(OFFLINE_NOTICE)).toBeVisible();
});

test('apuntar-se a un esdeveniment que ja no existeix recarrega l’agenda', async ({ page }) => {
	const { script } = await openAgenda(page);
	await page.waitForLoadState('networkidle');
	await card(page, 'accio-1').getByRole('button', { name: /^Participar a/ }).click();
	const dialog = signupDialog(page);
	await dialog.getByLabel(T.dialog.nameLabel).fill('Eva');
	await page.waitForLoadState('networkidle');
	const sheet = script.sheets.get('Esdeveniments');
	const index = sheet?.rows.findIndex((r) => r[0] === 'accio-1') ?? -1;
	sheet?.rows.splice(index, 1);
	let agendaRequests = 0;
	page.on('request', (request) => {
		if (request.method() === 'GET' && request.url().includes('action=agenda')) agendaRequests++;
	});
	await dialog.getByLabel(T.dialog.nameLabel).press('Enter');
	await expect.poll(() => agendaRequests).toBeGreaterThanOrEqual(1);
});
