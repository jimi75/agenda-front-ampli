import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { T } from '../src/lib/texts.js';
import { card, cards, openAgenda, readMine, shareCalls, mockShare, detailDialog, signupDialog } from './helpers.js';

const EIXAMPLE_MINE_KEY = 'agenda-eixample-2026-11:mine';

test('/eixample: capçalera, només els esdeveniments eix- i títol propi', async ({ page }) => {
	await openAgenda(page, { path: './eixample' });
	await expect(page.locator('h1')).toContainText('Eixample');
	await expect(page).toHaveTitle('Agenda Frontamplista Eixample');
	await expect(cards(page)).toHaveCount(2);
	await expect(card(page, 'eix-paradeta')).toBeVisible();
	await expect(card(page, 'eix-xerrada')).toBeVisible();
	await expect(card(page, 'accio-1')).toHaveCount(0);
});

test('/eixample: s’hi pot apuntar, el nom surt a l’esdeveniment i el registre és d’Eixample', async ({ page }) => {
	const { signups } = await openAgenda(page, { path: './eixample' });
	await card(page, 'eix-paradeta').getByRole('button', { name: /^Participar a/ }).click();
	const dialog = signupDialog(page);
	await dialog.getByLabel(T.dialog.nameLabel).fill('Eva');
	await dialog.getByRole('button', { name: T.dialog.submit }).click();
	await expect(dialog.getByText(T.dialog.success)).toBeVisible();
	await dialog.getByRole('button', { name: T.dialog.close }).click();

	expect(signups().map((row) => row.slice(1, 3))).toEqual([['eix-paradeta', 'Eva']]);
	await expect(card(page, 'eix-paradeta')).toContainText(T.count(1));
	const mine = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), EIXAMPLE_MINE_KEY);
	expect(mine.items.map((/** @type {{ eventId: string }} */ i) => i.eventId)).toEqual(['eix-paradeta']);
});

test('/ continua mostrant només Sants i no veu les inscripcions d’Eixample', async ({ page }) => {
	await openAgenda(page, { path: './eixample' });
	await card(page, 'eix-paradeta').getByRole('button', { name: /^Participar a/ }).click();
	await signupDialog(page).getByLabel(T.dialog.nameLabel).fill('Eva');
	await signupDialog(page).getByRole('button', { name: T.dialog.submit }).click();
	await expect(signupDialog(page).getByText(T.dialog.success)).toBeVisible();

	await page.goto('./?admin');
	await expect(card(page, 'accio-1')).toBeVisible();
	await expect(card(page, 'eix-paradeta')).toHaveCount(0);
	expect(JSON.stringify(await readMine(page))).not.toContain('eix-paradeta');
	await expect(page.getByText('local signups: 0')).toBeVisible();
});

test('l’enllaç de compartir d’Eixample conté /eixample?e=', async ({ page }) => {
	await mockShare(page);
	await openAgenda(page, { path: './eixample', query: 'e=eix-paradeta' });
	await detailDialog(page).getByRole('button', { name: T.share.share, exact: true }).click();
	await expect.poll(async () => (await shareCalls(page)).length).toBe(1);
	const [call] = await shareCalls(page);
	expect(call.text).toContain('/eixample?e=eix-paradeta');
});

test('/eixample?admin avisa dels ids sense prefix', async ({ page }) => {
	await openAgenda(page, {
		path: './eixample',
		query: 'admin',
		prepare: ({ script }) => {
			const sheet = /** @type {any} */ (script.sheets.get('Esdeveniments eixample'));
			sheet.rows.push(['paradeta-sin', '2026-11-13', '10:00', '12:00', 'Acció', 'Sense prefix', 'Lloc', '', '', '', '']);
		}
	});
	await expect(page.getByText(T.prefixWarning(['paradeta-sin'], /** @type {any} */ ({ prefix: 'eix-' })))).toBeVisible();
});

test('un script antic (sense district) no mostra mai els esdeveniments de Sants a /eixample', async ({ page }) => {
	await openAgenda(page, { path: './eixample', waitForCards: false, options: { noDistrict: true } });
	await expect(page.getByText(T.loadError)).toBeVisible();
	await expect(page.locator('article.event')).toHaveCount(0);
});

test('compilació: una pàgina per districte, amb una sola vegada cada etiqueta', () => {
	expect(existsSync('build/index.html')).toBe(true);
	expect(existsSync('build/eixample.html')).toBe(true);
	expect(existsSync('build/sants-montjuic.html')).toBe(false);
	const titles = { 'build/index.html': 'Agenda Frontamplista Sants-Montjuïc', 'build/eixample.html': 'Agenda Frontamplista Eixample' };
	for (const [file, title] of Object.entries(titles)) {
		const html = readFileSync(file, 'utf8');
		expect(html.match(/<title[ >]/g)).toHaveLength(1);
		expect(html.match(/name="description"/g)).toHaveLength(1);
		expect(html.match(/property="og:title"/g)).toHaveLength(1);
		expect(html.match(/property="og:description"/g)).toHaveLength(1);
		expect(html).toContain(`<title>${title}</title>`);
	}
});
