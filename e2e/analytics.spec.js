import { expect, test } from '@playwright/test';
import { CONSENT_KEY } from '#lib/analytics.js';
import { T } from '#lib/texts.js';
import { card, detailDialog, mockShare, mockWindowOpen, openAgenda, seedMine, shareCalls, signupDialog } from './helpers.js';

/** @param {import('@playwright/test').Page} page */
const events = (page) => page.evaluate(() =>
	(/** @type {Window & { dataLayer?: IArguments[] }} */ (window).dataLayer ?? [])
		.map((entry) => Array.from(entry)).filter((entry) => entry[0] === 'event')
);

/** @param {import('@playwright/test').Page} page */
const banner = (page) => page.getByRole('region', { name: T.consent.label });
/** @param {import('@playwright/test').Page} page */
const scripts = (page) => page.locator('script[src*="gtag/js"]');
/** @param {import('@playwright/test').Page} page */
const storedConsent = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), CONSENT_KEY);

/** @param {import('@playwright/test').Page} page @param {string} id @param {string} [name] */
async function signup(page, id, name = 'Nom de prova') {
	await card(page, id).getByRole('button', { name: /^Participar a/ }).click();
	const dialog = signupDialog(page);
	await dialog.getByLabel(T.dialog.nameLabel).fill(name);
	await dialog.getByRole('button', { name: id === 'ext-1' ? T.dialog.submitExternalLabel : T.dialog.submit, exact: true }).click();
}

/** @param {import('@playwright/test').Page} page @param {string} name @param {Record<string, string>} params */
async function expectEvent(page, name, params) {
	await expect.poll(async () => (await events(page)).filter((entry) => entry[1] === name))
		.toContainEqual(['event', name, expect.objectContaining(params)]);
}

/** @type {Array<() => string[]>} */
let requestReaders;
test.beforeEach(() => { requestReaders = []; });
test.afterEach(() => {
	for (const read of requestReaders) {
		for (const url of read()) {
			expect(new URL(url).hostname).toBe('www.googletagmanager.com');
			expect(new URL(url).pathname).toBe('/gtag/js');
		}
	}
});

/** @param {import('@playwright/test').Page} page @param {Parameters<typeof openAgenda>[1]} [config] */
async function open(page, config = {}) {
	const handle = await openAgenda(page, { ...config, options: { consent: 'granted', ...config.options } });
	requestReaders.push(handle.googleRequests);
	return handle;
}

test('CUJ 1: acceptar a l’Eixample carrega una sola vegada i enfoca main', async ({ page }) => {
	const { googleRequests } = await open(page, { path: './eixample', options: { consent: null } });
	await expect(banner(page)).toBeVisible();
	expect(googleRequests()).toEqual([]);
	await banner(page).getByRole('button', { name: T.consent.accept }).click();
	await expect(banner(page)).toBeHidden();
	await expect(page.locator('main')).toBeFocused();
	await expect(scripts(page)).toHaveCount(1);
	const views = (await events(page)).filter((entry) => entry[1] === 'page_view');
	expect(views).toHaveLength(1);
	const layer = await page.evaluate(() => (/** @type {Window & { dataLayer: IArguments[] }} */ (window)).dataLayer.map((entry) => Array.from(entry)));
	expect(layer).toContainEqual(['set', { districte: 'eixample' }]);
	expect((await storedConsent(page)).analytics).toBe('granted');
});

test('CUJ 2: rebutjar persisteix entre districtes sense Google', async ({ page }) => {
	const { googleRequests } = await open(page, { options: { consent: null } });
	await banner(page).getByRole('button', { name: T.consent.reject }).click();
	await expect(banner(page)).toBeHidden();
	expect(googleRequests()).toEqual([]);
	await page.goto('./eixample');
	await expect(card(page, 'eix-paradeta')).toBeVisible();
	await expect(banner(page)).toBeHidden();
	expect(googleRequests()).toEqual([]);
});

test('CUJ 3: el detall previ al consentiment no s’envia i es conserven els UTMs', async ({ page }) => {
	await open(page, { query: 'e=acte-1&utm_source=compartir&utm_medium=share', options: { consent: null } });
	await expect(detailDialog(page)).toBeVisible();
	await expect(banner(page)).toBeHidden();
	await detailDialog(page).getByRole('button', { name: T.detail.close }).click();
	await banner(page).getByRole('button', { name: T.consent.accept }).click();
	const recorded = await events(page);
	expect(recorded.filter((entry) => entry[1] === 'page_view')).toHaveLength(1);
	expect(recorded[0][2].page_location).toContain('e=acte-1&utm_source=compartir&utm_medium=share');
	expect(recorded.filter((entry) => entry[1] === 'event_detail_view')).toEqual([]);
	await card(page, 'accio-1').getByRole('link', { name: /^Veure el detall de/ }).click();
	await expectEvent(page, 'event_detail_view', { activitat_id: 'accio-1', activitat_tipus: 'accio', origen: 'card', districte: 'sants-montjuic' });
});

test('CUJ 3 amb consentiment: vista de link després de page_view', async ({ page }) => {
	await open(page, { query: 'e=acte-1' });
	await expectEvent(page, 'event_detail_view', { activitat_id: 'acte-1', origen: 'link' });
	const recorded = await events(page);
	expect(recorded.findIndex((entry) => entry[1] === 'page_view')).toBeLessThan(recorded.findIndex((entry) => entry[1] === 'event_detail_view'));
});

test('CUJ 4: inici i èxit propi sense enviar el nom', async ({ page }) => {
	await open(page);
	await signup(page, 'accio-1');
	await expectEvent(page, 'signup_start', { activitat_id: 'accio-1', activitat_tipus: 'accio', externa: 'no', districte: 'sants-montjuic' });
	await expectEvent(page, 'signup_success', { activitat_id: 'accio-1', externa: 'no' });
	expect(JSON.stringify(await events(page))).not.toContain('Nom de prova');
});

test('CUJ 4: error d’inscripció ocupada', async ({ page }) => {
	await open(page, { options: { busy: true } });
	await signup(page, 'accio-1');
	await expectEvent(page, 'signup_error', { activitat_id: 'accio-1', externa: 'no', error_type: 'busy' });
});

test('CUJ 4: èxit extern amb el formulari tancat', async ({ page }) => {
	await mockWindowOpen(page);
	await open(page);
	await signup(page, 'ext-1');
	await expect(signupDialog(page)).toHaveCount(0);
	await expectEvent(page, 'signup_success', { activitat_id: 'ext-1', externa: 'si' });
	expect((await events(page)).filter((entry) => entry[1] === 'event_detail_view')).toEqual([]);
});

test('el mapa de la targeta envia map_click a la pàgina original', async ({ page, context }) => {
	await context.route('https://www.google.com/maps/**', (route) => route.fulfill({ body: '' }));
	await open(page);
	await card(page, 'accio-1').getByRole('link', { name: new RegExp('Mercat de Sants') }).click();
	await expectEvent(page, 'map_click', { activitat_id: 'accio-1', origen: 'card' });
});

test('desapuntar-se envia el resultat', async ({ page }) => {
	await open(page);
	await signup(page, 'accio-1');
	await expect(signupDialog(page).getByText(T.dialog.success)).toBeVisible();
	await signupDialog(page).getByRole('button', { name: T.dialog.close }).click();
	const button = card(page, 'accio-1').getByRole('button', { name: /^Desapuntar-me de/ });
	await button.click();
	await expect(button).toHaveText(T.participation.unsignConfirm);
	await button.click();
	await expectEvent(page, 'unsignup', { activitat_id: 'accio-1', resultat: 'ok' });
});

test('l’enllaç extern envia external_link_click', async ({ page, context }) => {
	await context.route('https://example.org/**', (route) => route.fulfill({ body: '' }));
	await seedMine(page, ['ext-1']);
	await open(page, { options: { features: [] } });
	await card(page, 'ext-1').getByRole('button', { name: /^Participar a/ }).click();
	await signupDialog(page).getByRole('link', { name: T.dialog.goExternalLabel }).click();
	await expectEvent(page, 'external_link_click', { activitat_id: 'ext-1' });
});

for (const [outcome, resultat] of [['ok', 'shared'], ['AbortError', 'aborted']]) {
	test(`CUJ 5: compartir ${resultat} amb UTMs`, async ({ page }) => {
		await mockShare(page, [outcome]);
		await open(page, { query: 'e=accio-1' });
		await detailDialog(page).getByRole('button', { name: T.share.share, exact: true }).click();
		await expectEvent(page, 'share', { method: 'web_share', content_type: 'activitat', item_id: 'accio-1', imatge: 'default', resultat });
		expect((await shareCalls(page))[0].text).toContain('utm_source=compartir&utm_medium=share');
		expect((await events(page)).filter((entry) => entry[1] === 'share')).toHaveLength(1);
	});
}

test('CUJ 6: retirar esborra galetes, desa denied i recarrega sense script', async ({ page }) => {
	await open(page);
	await page.evaluate(() => {
		document.cookie = '_ga=test; path=/agenda-front-ampli';
		document.cookie = '_ga_TEST000000=test; path=/agenda-front-ampli';
	});
	expect(await page.evaluate(() => document.cookie)).toContain('_ga_TEST000000=');
	await page.getByRole('button', { name: T.footer.consent, exact: true }).click();
	await expect(banner(page)).toContainText(T.consent.now('granted'));
	await Promise.all([page.waitForEvent('load'), banner(page).getByRole('button', { name: T.consent.reject }).click()]);
	await expect(scripts(page)).toHaveCount(0);
	await expect.poll(async () => (await storedConsent(page))?.analytics).toBe('denied');
	expect(await page.evaluate(() => document.cookie)).not.toMatch(/(?:^|;\s*)_ga(?:_TEST000000)?=/);
});

test('retirar recarrega les altres pestanyes', async ({ page, context }) => {
	const other = await context.newPage();
	await open(page);
	await open(other);
	await page.getByRole('button', { name: T.footer.consent, exact: true }).click();
	await Promise.all([
		page.waitForEvent('load'),
		other.waitForEvent('load'),
		banner(page).getByRole('button', { name: T.consent.reject }).click()
	]);
	await expect(scripts(other)).toHaveCount(0);
	await expect.poll(async () => (await storedConsent(other))?.analytics).toBe('denied');
	await other.close();
});

test('admin no carrega ni envia però manté el botó Galetes', async ({ page }) => {
	const { googleRequests } = await open(page, { query: 'admin' });
	await expect(scripts(page)).toHaveCount(0);
	expect(await events(page)).toEqual([]);
	expect(googleRequests()).toEqual([]);
	await expect(page.getByRole('button', { name: T.footer.consent, exact: true })).toBeVisible();
});

test('/galetes recarrega i mostra la taula i el retorn a l’agenda', async ({ page }) => {
	await open(page);
	const policy = page.locator('footer').getByRole('link', { name: T.footer.policy, exact: true });
	await expect(policy).toHaveAttribute('data-sveltekit-reload', '');
	await Promise.all([page.waitForEvent('load'), policy.click()]);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText(T.cookiesPage.heading);
	await expect(page.getByRole('table')).toContainText('_ga_XX3RJ48NN2');
	const back = page.getByRole('link', { name: T.cookiesPage.back });
	await expect(back).toHaveAttribute('data-sveltekit-reload', '');
	await Promise.all([page.waitForEvent('load'), back.click()]);
	await expect(card(page, 'accio-1')).toBeVisible();
	expect(new URL(page.url()).pathname).toBe('/agenda-front-ampli/');
});
