import { expect, test } from '@playwright/test';
import { EVENT_HEADER_OPTIONAL } from '../apps-script/fake-google.js';
import { T } from '../src/lib/texts.js';
import {
	card,
	detailDialog,
	mockShare,
	mockWindowOpen,
	openAgenda,
	openCalls,
	readMine,
	seedMine,
	shareCalls,
	signupDialog
} from './helpers.js';

const EXTERNAL_URL = 'https://example.org/inscripcio';

/** Changes the `inscripcio_url` cell of one seeded event. @param {string} id @param {string} value */
const withExternalUrl = (id, value) => ({
	prepare: (/** @type {{ script: { sheets: Map<string, { rows: string[][] }> } }} */ { script }) => {
		const row = script.sheets.get('Esdeveniments')?.rows.find((r) => r[0] === id);
		if (row) row[EVENT_HEADER_OPTIONAL.indexOf('inscripcio_url')] = value;
	}
});

/** Types a name in the open modal and sends it with the external button. @param {import('@playwright/test').Page} page @param {string} name */
async function submitExternal(page, name) {
	const dialog = signupDialog(page);
	await dialog.getByLabel(T.dialog.nameLabel).fill(name);
	await dialog.getByRole('button', { name: T.dialog.submitExternalLabel }).click();
}

/** Opens the modal of «ext-1» from its card. @param {import('@playwright/test').Page} page */
async function openExternalModal(page) {
	await card(page, 'ext-1').getByRole('button', { name: /^Participar a/ }).click();
	await expect(signupDialog(page)).toBeVisible();
}

/** Routes the external site, so that the new tab loads without network. @param {import('@playwright/test').BrowserContext} context */
const routeExternalSite = (context) =>
	context.route('https://example.org/**', (route) =>
		route.fulfill({ contentType: 'text/html', body: '<title>Inscripció externa</title>' })
	);

test('la targeta amb URL externa té el botó «Participar» i el recompte', async ({ page }) => {
	await openAgenda(page);
	const ext = card(page, 'ext-1');
	await expect(ext.getByRole('button', { name: /^Participar a/ })).toBeVisible();
	await expect(ext.getByRole('link', { name: /^Participar/ })).toHaveCount(0);
	await expect(ext).toContainText(T.count(0));
});

test('el detall amb URL externa mostra el recompte, la llista, el botó «Participar» i la nota', async ({ page }) => {
	await openAgenda(page, { query: 'e=ext-1' });
	const detail = detailDialog(page);
	await expect(detail.getByRole('heading', { level: 2 })).toHaveText('Jornada amb inscripció externa');
	await expect(detail).toContainText(T.count(0));
	await expect(detail.getByText(T.detail.listEmpty)).toBeVisible();
	await expect(detail.getByRole('button', { name: T.participate })).toBeVisible();
	await expect(detail).toContainText(T.detail.externalNote);
	await expect(detail.getByRole('button', { name: T.share.share, exact: true })).toBeVisible();
});

test('el text compartit d’un esdeveniment extern enllaça al detall de l’app', async ({ page }) => {
	await mockShare(page);
	await openAgenda(page, { query: 'e=ext-1' });
	const detail = detailDialog(page);
	await detail.getByRole('button', { name: T.share.share, exact: true }).click();
	await expect.poll(async () => (await shareCalls(page)).length).toBe(1);

	const [call] = await shareCalls(page);
	expect(call.text).toContain('?e=ext-1');
	expect(call.text).not.toContain(EXTERNAL_URL);
});

test('enviar un nom obre l’URL externa en una pestanya nova, desa la inscripció i mostra el detall', async ({
	page,
	context
}) => {
	await routeExternalSite(context);
	await openAgenda(page);
	await openExternalModal(page);

	const newTab = context.waitForEvent('page');
	await submitExternal(page, 'Anna');
	const tab = await newTab;
	await tab.waitForLoadState();
	expect(tab.url()).toBe(EXTERNAL_URL);

	await expect(signupDialog(page)).toHaveCount(0);
	const detail = detailDialog(page);
	await expect(detail).toBeVisible();
	await expect(detail.getByRole('heading', { level: 2 })).toHaveText('Jornada amb inscripció externa');
	await expect(detail.getByRole('button', { name: T.detail.close })).toBeFocused();
	await expect(detail.getByText('Anna')).toBeVisible();
	await expect(detail).toContainText(T.count(1));
});

test('enviar un nom des del detall obre la pestanya i deixa el detall visible', async ({ page, context }) => {
	await routeExternalSite(context);
	await openAgenda(page, { query: 'e=ext-1' });
	const detail = detailDialog(page);
	await detail.getByRole('button', { name: T.participate }).click();

	const newTab = context.waitForEvent('page');
	await submitExternal(page, 'Anna');
	expect((await newTab).url()).toBe(EXTERNAL_URL);
	await expect(signupDialog(page)).toHaveCount(0);
	await expect(detail).toBeVisible();
	await expect(detail.getByText('Anna')).toBeVisible();
});

test('window.open s’executa abans del POST (Chromium no bloqueja pestanyes; és l’única protecció de l’ordre)', async ({
	page
}) => {
	await mockWindowOpen(page);
	/** @type {string[] | undefined} */
	let openedAtPost;
	await openAgenda(page);
	await page.route(/localhost:5301\/exec/, async (route) => {
		if (route.request().method() === 'POST') openedAtPost = await openCalls(page);
		await route.fallback();
	});
	await openExternalModal(page);
	await submitExternal(page, 'Anna');
	await expect(detailDialog(page).getByText('Anna')).toBeVisible();
	expect(openedAtPost).toEqual([EXTERNAL_URL]);
});

test('un error en desar obre igualment la pestanya', async ({ page }) => {
	await mockWindowOpen(page);
	await openAgenda(page);
	await page.route(/localhost:5301\/exec/, (route) =>
		route.request().method() === 'POST' ? route.abort() : route.fallback()
	);
	await openExternalModal(page);

	const recovery = page.waitForRequest((request) => request.method() === 'GET' && request.url().includes('action=agenda'));
	await submitExternal(page, 'Anna');
	await recovery;
	expect(await openCalls(page)).toEqual([EXTERNAL_URL]);
	await expect(detailDialog(page)).toBeVisible();
	await expect(detailDialog(page).getByText(T.detail.listEmpty)).toBeVisible();
	expect((await readMine(page))?.items.some((item) => item.eventId === 'ext-1') ?? false).toBe(false);
});

test('un nom buit no obre cap pestanya', async ({ page }) => {
	await mockWindowOpen(page);
	let posts = 0;
	await openAgenda(page);
	await page.route(/localhost:5301\/exec/, (route) => {
		if (route.request().method() === 'POST') posts += 1;
		return route.fallback();
	});
	await openExternalModal(page);
	await submitExternal(page, '');
	await expect(signupDialog(page).getByText(T.signupErrors.empty)).toBeVisible();
	expect(await openCalls(page)).toEqual([]);
	expect(posts).toBe(0);
});

test('dos Enter seguits obren una sola pestanya', async ({ page }) => {
	await mockWindowOpen(page);
	await openAgenda(page);
	await openExternalModal(page);
	await signupDialog(page).getByLabel(T.dialog.nameLabel).fill('Anna');
	await page.keyboard.press('Enter');
	await page.keyboard.press('Enter');
	await expect(signupDialog(page)).toHaveCount(0);
	expect(await openCalls(page)).toEqual([EXTERNAL_URL]);
});

test('qui ja s’ha apuntat veu l’enllaç a la web externa al modal', async ({ page, context }) => {
	await routeExternalSite(context);
	await seedMine(page, ['ext-1']);
	await openAgenda(page, { options: { features: [] } });
	await openExternalModal(page);
	const dialog = signupDialog(page);
	const link = dialog.getByRole('link', { name: T.dialog.goExternalLabel });
	await expect(link).toHaveAttribute('href', EXTERNAL_URL);
	await expect(link).toHaveAttribute('target', '_blank');
	await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
	await expect(dialog.getByLabel(T.dialog.nameLabel)).toBeVisible();

	const newTab = context.waitForEvent('page');
	await link.click();
	expect((await newTab).url()).toBe(EXTERNAL_URL);
});

test('sense inscripció pròpia el modal no ofereix l’enllaç', async ({ page }) => {
	await openAgenda(page);
	await openExternalModal(page);
	await expect(signupDialog(page).getByRole('link')).toHaveCount(0);
});

test('es pot desapuntar d’un esdeveniment extern', async ({ page, context }) => {
	await routeExternalSite(context);
	await openAgenda(page, { options: { features: ['unsignup'] } });
	await openExternalModal(page);
	const newTab = context.waitForEvent('page');
	await submitExternal(page, 'Anna');
	await (await newTab).close();
	const detail = detailDialog(page);
	await expect(detail.getByText('Anna')).toBeVisible();
	await detail.getByRole('button', { name: T.detail.close }).click();
	await expect(detail).toBeHidden();

	const unsign = card(page, 'ext-1').getByRole('button', { name: /^Desapuntar-me de/ });
	await unsign.click();
	await unsign.click();
	await expect(card(page, 'ext-1')).toContainText(T.participation.unsignDone);
	await expect(card(page, 'ext-1')).toContainText(T.count(0));

	await openExternalModal(page);
	await expect(signupDialog(page).getByRole('link')).toHaveCount(0);
});

test('amb B1 = NO un esdeveniment extern està tancat', async ({ page }) => {
	await openAgenda(page, { options: { closed: true } });
	const ext = card(page, 'ext-1');
	await expect(ext.getByRole('button', { name: /^Veure qui s’ha apuntat/ })).toBeVisible();
	await expect(ext.getByRole('button', { name: /^Participar a/ })).toHaveCount(0);

	await ext.getByRole('link', { name: /^Veure el detall de/ }).click();
	const detail = detailDialog(page);
	await expect(detail).toContainText(T.dialog.closed);
	await expect(detail.getByRole('button', { name: T.participate })).toHaveCount(0);
	await expect(page.locator(`a[href="${EXTERNAL_URL}"]`)).toHaveCount(0);
});

for (const value of ['http://example.org/inscripcio', 'javascript:alert(1)', 'https://example.org/ins cripcio']) {
	test(`una URL externa no vàlida (${value}) es tracta com a buida: l’esdeveniment és normal`, async ({ page }) => {
		await openAgenda(page, withExternalUrl('ext-1', value));
		const ext = card(page, 'ext-1');
		await expect(ext.getByRole('button', { name: /^Participar a/ })).toBeVisible();
		await expect(ext).toContainText(T.count(0));
		await ext.getByRole('button', { name: /^Participar a/ }).click();
		const submit = signupDialog(page).getByRole('button', { name: T.dialog.submit, exact: true });
		await expect(submit).toBeVisible();
		await expect(signupDialog(page).getByRole('button', { name: T.dialog.submitExternalLabel })).toHaveCount(0);
	});
}

test('un esdeveniment cancel·lat amb URL externa no ofereix l’enllaç: mana el seu estat', async ({ page }) => {
	await openAgenda(page, withExternalUrl('cancel-1', EXTERNAL_URL));
	const cancelled = card(page, 'cancel-1');
	await expect(cancelled.getByRole('button', { name: /^Veure qui s’ha apuntat/ })).toBeVisible();
	await expect(cancelled).toContainText(T.count(0));
});

test('el responsable es veu a la targeta i al detall, i no surt si no n’hi ha', async ({ page }) => {
	await openAgenda(page);
	const withManager = card(page, 'resp-1');
	await expect(withManager).toContainText(T.card.manager('Marta'));
	await expect(card(page, 'accio-1')).not.toContainText('Responsable');

	await withManager.getByRole('link', { name: /^Veure el detall de/ }).click();
	const detail = detailDialog(page);
	await expect(detail).toContainText(T.card.manager('Marta'));
	await detail.getByRole('button', { name: T.detail.close }).click();
	await expect(detail).toBeHidden();

	await card(page, 'accio-1').getByRole('link', { name: /^Veure el detall de/ }).click();
	await expect(detailDialog(page)).not.toContainText('Responsable');
});

test('el responsable no desborda la targeta ni la pàgina', async ({ page }) => {
	await openAgenda(page, {
		prepare: ({ script }) => {
			const row = script.sheets.get('Esdeveniments')?.rows.find((r) => r[0] === 'resp-1');
			if (row) row[EVENT_HEADER_OPTIONAL.indexOf('responsable')] = 'Maria-Lluïsa de la Concepció Fernández i Puigcerdà-Roca';
		}
	});
	const overflow = await page.evaluate(() => ({
		page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
		card: [...document.querySelectorAll('article.event')].filter((el) => el.scrollWidth > el.clientWidth).length
	}));
	expect(overflow).toEqual({ page: 0, card: 0 });
});
