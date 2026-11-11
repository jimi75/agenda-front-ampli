import { expect, test } from '@playwright/test';
import { T } from '../src/lib/texts.js';
import { card, detailDialog, openAgenda, readMine, signupDialog } from './helpers.js';

/** @param {import('@playwright/test').Page} page @param {string} name */
async function submitName(page, name) {
	const dialog = signupDialog(page);
	await dialog.getByLabel(T.dialog.nameLabel).fill(name);
	await dialog.getByRole('button', { name: T.dialog.submit }).click();
}

test('alta des de la targeta: apareix a la llista, s’escriu al full i es desa el registre local', async ({
	page
}) => {
	const { signups } = await openAgenda(page);
	await card(page, 'accio-1').getByRole('button', { name: /^Participar a/ }).click();

	const dialog = signupDialog(page);
	await expect(dialog.getByRole('heading', { level: 2 })).toHaveText('Paradeta al mercat');
	// The reduced modal is only the form: no list of people, no contact sentence.
	await expect(dialog.getByText(T.detail.listTitle)).toHaveCount(0);
	await expect(dialog.getByText(/només ell pot esborrar noms/)).toHaveCount(0);

	await submitName(page, 'Eva');
	await expect(dialog.getByText(T.dialog.success)).toBeVisible();
	// Without `features` in the script's answer, the modal does not promise an unsignup.
	await expect(dialog.getByText(T.participation.hint)).toHaveCount(0);

	const rows = signups();
	expect(rows).toHaveLength(1);
	expect(rows[0].slice(1, 3)).toEqual(['accio-1', 'Eva']);
	const requestId = rows[0][3];
	expect(requestId).toMatch(/^[A-Za-z0-9-]{8,64}$/);
	expect(await readMine(page)).toEqual({ v: 1, items: [{ eventId: 'accio-1', requestId, name: 'Eva' }] });

	await dialog.getByRole('button', { name: T.dialog.close }).click();
	await expect(signupDialog(page)).toBeHidden();
	await expect(card(page, 'accio-1')).toContainText(T.count(1));
});

test('alta des del detall: el modal s’obre a sobre i la llista del detall s’actualitza', async ({ page }) => {
	const { signups } = await openAgenda(page, { query: 'e=acte-1' });
	const detail = detailDialog(page);
	await detail.getByRole('button', { name: T.participate }).click();
	await submitName(page, 'Pau');
	await expect(signupDialog(page).getByText(T.dialog.success)).toBeVisible();

	await signupDialog(page).getByRole('button', { name: T.dialog.close }).click();
	await expect(signupDialog(page)).toBeHidden();
	await expect(detail).toBeVisible();
	await expect(detail).toContainText(T.count(1));
	await expect(detail.getByRole('list', { name: T.detail.listTitle })).toContainText('Pau');
	expect(signups().map((row) => row.slice(1, 3))).toEqual([['acte-1', 'Pau']]);
	expect((await readMine(page)).items).toHaveLength(1);
});

test('cada alta afegeix un registre local, també per a un mateix esdeveniment', async ({ page }) => {
	const { signups } = await openAgenda(page);
	for (const name of ['Eva', 'Eva']) {
		await card(page, 'accio-1').getByRole('button', { name: /^Participar a/ }).click();
		await submitName(page, name);
		await expect(signupDialog(page).getByText(T.dialog.success)).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(signupDialog(page)).toBeHidden();
	}
	const items = (await readMine(page)).items;
	expect(items.map((item) => item.eventId)).toEqual(['accio-1', 'accio-1']);
	expect(new Set(items.map((item) => item.requestId)).size).toBe(2);
	expect(items.map((item) => item.requestId)).toEqual(signups().map((row) => row[3]));
});

test('amb features unsignup, després de l’alta el modal explica com desapuntar-se', async ({ page }) => {
	await openAgenda(page, { options: { features: ['unsignup'] } });
	await card(page, 'accio-1').getByRole('button', { name: /^Participar a/ }).click();
	await submitName(page, 'Eva');
	await expect(signupDialog(page).getByText(T.participation.hint)).toBeVisible();
});

test('si la resposta es perd, l’alta es recupera i el registre local guarda el requestId del full', async ({
	page
}) => {
	const { signups } = await openAgenda(page, { options: { loseAnswer: true } });
	await card(page, 'accio-1').getByRole('button', { name: /^Participar a/ }).click();
	await submitName(page, 'Eva');
	await expect(signupDialog(page).getByText(T.dialog.success)).toBeVisible();

	const rows = signups();
	expect(rows).toHaveLength(1);
	expect(await readMine(page)).toEqual({
		v: 1,
		items: [{ eventId: 'accio-1', requestId: rows[0][3], name: 'Eva' }]
	});
});

test('un error del servidor (ocupat) es mostra i no deixa cap registre', async ({ page }) => {
	const { signups } = await openAgenda(page, { options: { busy: true } });
	await card(page, 'accio-1').getByRole('button', { name: /^Participar a/ }).click();
	await submitName(page, 'Eva');
	await expect(signupDialog(page).getByText(T.signupErrors.busy)).toBeVisible();
	expect(signups()).toEqual([]);
	expect(await readMine(page)).toBeNull();
});

test('amb B1 = NO, «Participar» no obre el modal: la targeta ofereix «Veure apuntats»', async ({ page }) => {
	await openAgenda(page, { options: { closed: true } });
	await expect(card(page, 'accio-1').getByRole('button', { name: /^Participar a/ })).toHaveCount(0);
	await card(page, 'accio-1').getByRole('button', { name: /^Veure qui s’ha apuntat/ }).click();
	await expect(detailDialog(page)).toContainText(T.dialog.closed);
	await expect(signupDialog(page)).toHaveCount(0);
});

test('?admin mostra features i el nombre de registres locals', async ({ page }) => {
	await openAgenda(page, { query: 'admin', options: { features: ['unsignup'] } });
	await expect(page.getByText('features: unsignup · local signups: 0')).toBeVisible();

	await card(page, 'accio-1').getByRole('button', { name: /^Participar a/ }).click();
	await submitName(page, 'Eva');
	await expect(signupDialog(page).getByText(T.dialog.success)).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(page.getByText('features: unsignup · local signups: 1')).toBeVisible();
});
