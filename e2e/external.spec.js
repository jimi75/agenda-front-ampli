import { expect, test } from '@playwright/test';
import { EVENT_HEADER_OPTIONAL } from '../apps-script/fake-google.js';
import { T } from '../src/lib/texts.js';
import { card, detailDialog, mockShare, openAgenda, shareCalls, signupDialog } from './helpers.js';

const EXTERNAL_URL = 'https://example.org/inscripcio';

/** The sign-up link of a card or of the detail: «Participar» when it is an <a>, not a button. @param {import('@playwright/test').Locator} scope */
const participateLink = (scope) => scope.getByRole('link', { name: /^Participar/ });

/** @param {import('@playwright/test').Locator} link */
async function expectExternalLink(link) {
	await expect(link).toHaveCount(1);
	await expect(link).toHaveAttribute('href', EXTERNAL_URL);
	await expect(link).toHaveAttribute('target', '_blank');
	await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
}

/** Changes the `inscripcio_url` cell of one seeded event. @param {string} id @param {string} value */
const withExternalUrl = (id, value) => ({
	prepare: (/** @type {{ script: { sheets: Map<string, { rows: string[][] }> } }} */ { script }) => {
		const row = script.sheets.get('Esdeveniments')?.rows.find((r) => r[0] === id);
		if (row) row[EVENT_HEADER_OPTIONAL.indexOf('inscripcio_url')] = value;
	}
});

test('la targeta amb URL externa té «Participar» com a enllaç a una pestanya nova, sense recompte ni llista', async ({
	page
}) => {
	await openAgenda(page);
	const ext = card(page, 'ext-1');
	await expectExternalLink(participateLink(ext));
	await expect(ext.getByRole('button', { name: /^Participar/ })).toHaveCount(0);
	await expect(ext.getByRole('button', { name: /^Veure qui s’ha apuntat/ })).toHaveCount(0);
	await expect(ext.locator('.count')).toHaveCount(0);
	await expect(ext).not.toContainText(/apuntat/);

	// The rest of the cards keep the count and the button.
	await expect(card(page, 'accio-1')).toContainText(T.count(0));
	await expect(card(page, 'accio-1').getByRole('button', { name: /^Participar a/ })).toBeVisible();
});

test('el detall amb URL externa mostra l’enllaç «Participar» i la nota, sense recompte ni llista', async ({ page }) => {
	await openAgenda(page, { query: 'e=ext-1' });
	const detail = detailDialog(page);
	await expect(detail.getByRole('heading', { level: 2 })).toHaveText('Jornada amb inscripció externa');
	await expectExternalLink(participateLink(detail));
	await expect(detail.getByRole('button', { name: T.participate })).toHaveCount(0);
	await expect(detail).toContainText(T.detail.externalNote);
	await expect(detail.getByText(/persones? apuntades?|Ningú apuntat/)).toHaveCount(0);
	await expect(detail.getByText(T.detail.listTitle)).toHaveCount(0);
	await expect(detail.getByText(T.detail.listEmpty)).toHaveCount(0);
	// Sharing is still offered for an external event.
	await expect(detail.getByRole('button', { name: T.share.share })).toBeVisible();
});

test('el text compartit d’un esdeveniment extern enllaça només a la inscripció externa', async ({ page }) => {
	await mockShare(page);
	await openAgenda(page, { query: 'e=ext-1' });
	const detail = detailDialog(page);
	await detail.getByRole('button', { name: T.share.share, exact: true }).click();
	await expect.poll(async () => (await shareCalls(page)).length).toBe(1);

	const [call] = await shareCalls(page);
	expect(call.text).toContain(`🔗 Més detalls i inscripcions: ${EXTERNAL_URL}`);
	expect(call.text).not.toContain('?e=ext-1');
});

test('pulsar «Participar» obre l’URL externa en una pestanya nova i no obre el modal', async ({ page, context }) => {
	await context.route('https://example.org/**', (route) =>
		route.fulfill({ contentType: 'text/html', body: '<title>Inscripció externa</title>' })
	);
	await openAgenda(page);

	const fromCard = context.waitForEvent('page');
	await participateLink(card(page, 'ext-1')).click();
	const cardTab = await fromCard;
	await cardTab.waitForLoadState();
	expect(cardTab.url()).toBe(EXTERNAL_URL);
	await cardTab.close();
	await expect(signupDialog(page)).toHaveCount(0);

	await card(page, 'ext-1').getByRole('link', { name: /^Veure el detall de/ }).click();
	const detail = detailDialog(page);
	const fromDetail = context.waitForEvent('page');
	await participateLink(detail).click();
	const detailTab = await fromDetail;
	await detailTab.waitForLoadState();
	expect(detailTab.url()).toBe(EXTERNAL_URL);
	await detailTab.close();
	await expect(signupDialog(page)).toHaveCount(0);
	await expect(detail).toBeVisible();
});

test('amb B1 = NO l’enllaç extern segueix funcionant, a la targeta i al detall', async ({ page }) => {
	await openAgenda(page, { options: { closed: true } });
	await expectExternalLink(participateLink(card(page, 'ext-1')));
	// An event without an external URL is closed.
	await expect(card(page, 'accio-1').getByRole('button', { name: /^Veure qui s’ha apuntat/ })).toBeVisible();

	await card(page, 'ext-1').getByRole('link', { name: /^Veure el detall de/ }).click();
	const detail = detailDialog(page);
	await expectExternalLink(participateLink(detail));
	await expect(detail).toContainText(T.detail.externalNote);
	await expect(detail).not.toContainText(T.dialog.closed);
});

for (const value of ['http://example.org/inscripcio', 'javascript:alert(1)', 'https://example.org/ins cripcio']) {
	test(`una URL externa no vàlida (${value}) es tracta com a buida: l’esdeveniment és normal`, async ({ page }) => {
		await openAgenda(page, withExternalUrl('ext-1', value));
		const ext = card(page, 'ext-1');
		await expect(participateLink(ext)).toHaveCount(0);
		await expect(ext.getByRole('button', { name: /^Participar a/ })).toBeVisible();
		await expect(ext).toContainText(T.count(0));
	});
}

test('un esdeveniment cancel·lat amb URL externa no ofereix l’enllaç: mana el seu estat', async ({ page }) => {
	await openAgenda(page, withExternalUrl('cancel-1', EXTERNAL_URL));
	const cancelled = card(page, 'cancel-1');
	await expect(participateLink(cancelled)).toHaveCount(0);
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
