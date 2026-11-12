import { expect, test } from '@playwright/test';
import { T } from '../src/lib/texts.js';
import { card, detailDialog, MINE_KEY, openAgenda, readMine, signupDialog } from './helpers.js';

/** @param {import('@playwright/test').Page} page @param {string} name */
async function submitName(page, name) {
	const dialog = signupDialog(page);
	await dialog.getByLabel(T.dialog.nameLabel).fill(name);
	await dialog.getByRole('button', { name: T.dialog.submit }).click();
}

test('alta des de la targeta: apareix a la llista, s’escriu al full i es desa el registre local', async ({
	page
}) => {
	// The real script now answers `features: ['unsignup']`; this test is about a script that predates it.
	const { signups } = await openAgenda(page, { options: { features: [] } });
	await card(page, 'accio-1').getByRole('button', { name: /^Participar a/ }).click();

	const dialog = signupDialog(page);
	await expect(dialog.getByRole('heading', { level: 2 })).toHaveText('Paradeta al mercat');
	// The reduced modal is only the form: no list of people, no contact sentence.
	await expect(dialog.getByText(T.detail.listTitle)).toHaveCount(0);
	await expect(dialog.getByText(/només ell pot esborrar noms/)).toHaveCount(0);

	await submitName(page, 'Eva');
	await expect(dialog.getByText(T.dialog.success)).toBeVisible();
	// With a script that predates `features`, the modal does not promise an unsignup.
	await expect(dialog.getByText(T.participation.hint)).toHaveCount(0);
	await expect(dialog.getByRole('region', { name: T.participation.mine })).toHaveCount(0);

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
	for (const name of ['Eva', 'Eva']) await signUp(page, 'accio-1', name);
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
	await expect(card(page, 'accio-1').getByRole('button', { name: /^Desapuntar-me de/ })).toHaveCount(0);
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

// ---- R4: unsignup ----

/** @param {import('@playwright/test').Page} page @param {string} id @param {string} name */
async function signUp(page, id, name) {
	await openSignupModal(page, id);
	await submitName(page, name);
	await expect(signupDialog(page).getByText(T.dialog.success)).toBeVisible();
	await closeDialogs(page);
}

/**
 * Opens the sign-up modal of an event. With an own signup the card offers «Desapuntar-me» instead of
 * «Participar», so the modal is reached through the detail, which keeps «Participar».
 * @param {import('@playwright/test').Page} page @param {string} id
 */
async function openSignupModal(page, id) {
	const participate = card(page, id).getByRole('button', { name: /^Participar a/ });
	if (await participate.count()) {
		await participate.click();
	} else {
		await card(page, id).getByRole('link', { name: /^Veure el detall de/ }).click();
		await detailDialog(page).getByRole('button', { name: T.participate }).click();
	}
	await expect(signupDialog(page)).toBeVisible();
}

/** Closes the modal and, if it was opened from the detail, the detail too. @param {import('@playwright/test').Page} page */
async function closeDialogs(page) {
	await page.keyboard.press('Escape');
	await expect(signupDialog(page)).toBeHidden();
	if (await detailDialog(page).count()) {
		await page.keyboard.press('Escape');
		await expect(detailDialog(page)).toBeHidden();
	}
}

/** Opens the modal of an event and returns its «La teva participació» section. @param {import('@playwright/test').Page} page @param {string} id */
async function openMine(page, id) {
	await openSignupModal(page, id);
	return signupDialog(page).getByRole('region', { name: T.participation.mine });
}

/** Two taps on the unsign button of one record. @param {import('@playwright/test').Locator} section @param {number} [index] */
async function confirmUnsign(section, index = 0) {
	const button = section.getByRole('listitem').nth(index).getByRole('button');
	await button.click();
	await expect(button).toHaveText(T.participation.unsignConfirm);
	await button.click();
}

/** Rows of `Inscripcions` as [event_id, nom]. @param {Array<string[]>} rows */
const idsAndNames = (rows) => rows.map((row) => row.slice(1, 3));

/** @param {import('@playwright/test').Page} page */
const mineItems = async (page) => (await readMine(page))?.items ?? [];

test('«La teva participació» només surt al navegador que s’ha apuntat i a l’esdeveniment propi', async ({
	page,
	browser,
	baseURL,
	locale,
	timezoneId
}) => {
	await openAgenda(page);
	const before = signupDialog(page).getByRole('region', { name: T.participation.mine });
	await card(page, 'accio-1').getByRole('button', { name: /^Participar a/ }).click();
	await expect(signupDialog(page)).toBeVisible();
	await expect(before).toHaveCount(0);
	await page.keyboard.press('Escape');

	await signUp(page, 'accio-1', 'Eva');
	const section = await openMine(page, 'accio-1');
	await expect(section).toBeVisible();
	await expect(section.getByRole('listitem')).toHaveText([new RegExp(`Eva\\s*${T.participation.unsign}`)]);
	// The form stays available, and the modal of another event has no section.
	await expect(signupDialog(page).getByLabel(T.dialog.nameLabel)).toBeVisible();
	await closeDialogs(page);
	await card(page, 'acte-1').getByRole('button', { name: /^Participar a/ }).click();
	await expect(signupDialog(page)).toBeVisible();
	await expect(signupDialog(page).getByRole('region', { name: T.participation.mine })).toHaveCount(0);
	await page.keyboard.press('Escape');

	// A new browser context has no local record, so no button either.
	const other = await browser.newContext({ baseURL, locale, timezoneId });
	try {
		const otherPage = await other.newPage();
		await openAgenda(otherPage);
		await card(otherPage, 'accio-1').getByRole('button', { name: /^Participar a/ }).click();
		await expect(signupDialog(otherPage)).toBeVisible();
		await expect(signupDialog(otherPage).getByRole('region', { name: T.participation.mine })).toHaveCount(0);
		await expect(otherPage.getByRole('button', { name: T.participation.unsign })).toHaveCount(0);
	} finally {
		await other.close();
	}
});

test('amb un script sense features, el registre local no ofereix «Desapuntar-me»', async ({ page }) => {
	await openAgenda(page, { options: { features: [] } });
	await signUp(page, 'accio-1', 'Eva');
	// No «Desapuntar-me» on the card either: «Participar» stays.
	await expect(card(page, 'accio-1').getByRole('button', { name: /^Desapuntar-me de/ })).toHaveCount(0);
	await card(page, 'accio-1').getByRole('button', { name: /^Participar a/ }).click();
	await expect(signupDialog(page).getByRole('region', { name: T.participation.mine })).toHaveCount(0);
	await expect(page.getByRole('button', { name: T.participation.unsign })).toHaveCount(0);
	expect(await mineItems(page)).toHaveLength(1);
});

test('desapuntar-se exigeix dos tocs: arxiva a Baixes, esborra la fila i actualitza la llista', async ({
	page
}) => {
	const { signups, baixes } = await openAgenda(page, {
		prepare: ({ script }) => {
			script.sheets.get('Inscripcions')?.rows.push(['2026-11-09 18:00:00', 'accio-1', 'Pau', 'pau-request-0001']);
		}
	});
	await signUp(page, 'accio-1', 'Eva');
	const evaId = signups()[1][3];
	await expect(card(page, 'accio-1')).toContainText(T.count(2));

	const section = await openMine(page, 'accio-1');
	const button = section.getByRole('button');
	await expect(button).toHaveText(T.participation.unsign);
	await button.click();
	// The first tap only asks for confirmation: nothing is written.
	await expect(button).toHaveText(T.participation.unsignConfirm);
	expect(signups()).toHaveLength(2);
	expect(baixes()).toEqual([]);
	// ... and it goes back by itself after a few seconds.
	await expect(button).toHaveText(T.participation.unsign, { timeout: 8000 });
	expect(signups()).toHaveLength(2);

	/** @type {Array<string | null>} */
	const requests = [];
	page.on('request', (request) => {
		if (request.method() === 'POST') requests.push(request.postData());
	});
	await button.click();
	await expect(button).toHaveText(T.participation.unsignConfirm);
	// A repeated tap while the request is on its way must not send a second one.
	await button.dblclick({ force: true });
	await expect(signupDialog(page).getByText(T.participation.unsignDone)).toBeVisible();
	expect(requests).toHaveLength(1);
	expect(JSON.parse(requests[0] ?? '{}')).toMatchObject({ action: 'unsignup', eventId: 'accio-1', requestId: evaId });

	expect(idsAndNames(signups())).toEqual([['accio-1', 'Pau']]);
	expect(baixes()).toHaveLength(1);
	expect(baixes()[0].slice(1)).toEqual(['accio-1', 'Eva', evaId]);
	expect(await mineItems(page)).toEqual([]);
	await expect(section.getByRole('listitem')).toHaveCount(0);

	await closeDialogs(page);
	await expect(card(page, 'accio-1')).toContainText(T.count(1));
	await card(page, 'accio-1').getByRole('link', { name: /^Veure el detall de/ }).click();
	const list = detailDialog(page).getByRole('list', { name: T.detail.listTitle });
	await expect(list).toContainText('Pau');
	await expect(list).not.toContainText('Eva');
});

test('si el nom ja no és al full, la baixa respon «Ja no hi eres a la llista» i treu el registre', async ({
	page
}) => {
	const { script, baixes } = await openAgenda(page);
	await signUp(page, 'accio-1', 'Eva');
	// The owner removed the row by hand in the meantime.
	script.sheets.get('Inscripcions')?.rows.splice(1);
	const section = await openMine(page, 'accio-1');
	await confirmUnsign(section);
	await expect(signupDialog(page).getByText(T.participation.alreadyGone)).toBeVisible();
	expect(baixes()).toEqual([]);
	expect(await mineItems(page)).toEqual([]);
});

test('amb registres duplicats del mateix esdeveniment, cada baixa treu només el seu', async ({ page }) => {
	const { signups, baixes } = await openAgenda(page);
	await signUp(page, 'accio-1', 'Eva');
	await signUp(page, 'accio-1', 'Eva');
	const [first, second] = signups().map((row) => row[3]);
	expect(first).not.toBe(second);

	const section = await openMine(page, 'accio-1');
	await expect(section.getByRole('listitem')).toHaveCount(2);
	await confirmUnsign(section, 0);
	await expect(signupDialog(page).getByText(T.participation.unsignDone)).toBeVisible();
	await expect(section.getByRole('listitem')).toHaveCount(1);
	expect(signups().map((row) => row[3])).toEqual([second]);
	expect(baixes().map((row) => row[3])).toEqual([first]);
	expect((await mineItems(page)).map((item) => item.requestId)).toEqual([second]);

	await confirmUnsign(section, 0);
	await expect(section.getByRole('listitem')).toHaveCount(0);
	expect(signups()).toEqual([]);
	expect(baixes().map((row) => row[3])).toEqual([first, second]);
	expect(await mineItems(page)).toEqual([]);
});

test('un error de xarxa o d’ocupat conserva el registre i es pot repetir', async ({ page }) => {
	const { signups, baixes, options } = await openAgenda(page);
	await signUp(page, 'accio-1', 'Eva');
	const section = await openMine(page, 'accio-1');
	const button = section.getByRole('button');

	options.down = true;
	await confirmUnsign(section);
	await expect(signupDialog(page).getByText(T.signupErrors.network)).toBeVisible();
	await expect(button).toHaveText(T.participation.unsign);
	expect(await mineItems(page)).toHaveLength(1);
	expect(signups()).toHaveLength(1);

	options.down = false;
	options.busy = true;
	await confirmUnsign(section);
	await expect(signupDialog(page).getByText(T.signupErrors.busy)).toBeVisible();
	expect(await mineItems(page)).toHaveLength(1);
	expect(signups()).toHaveLength(1);
	expect(baixes()).toEqual([]);

	options.busy = false;
	await confirmUnsign(section);
	await expect(signupDialog(page).getByText(T.participation.unsignDone)).toBeVisible();
	expect(signups()).toEqual([]);
	expect(baixes()).toHaveLength(1);
	expect(await mineItems(page)).toEqual([]);
});

test('si la resposta de la baixa es perd, el registre es conserva i repetir-la és inofensiu', async ({ page }) => {
	const { signups, baixes, options } = await openAgenda(page);
	await signUp(page, 'accio-1', 'Eva');
	const section = await openMine(page, 'accio-1');

	options.loseAnswer = true;
	await confirmUnsign(section);
	await expect(signupDialog(page).getByText(T.signupErrors.network)).toBeVisible();
	// The script did remove the row, but the browser never knew.
	expect(signups()).toEqual([]);
	expect(baixes()).toHaveLength(1);
	expect(await mineItems(page)).toHaveLength(1);

	options.loseAnswer = false;
	await confirmUnsign(section);
	await expect(signupDialog(page).getByText(T.participation.alreadyGone)).toBeVisible();
	expect(baixes()).toHaveLength(1);
	expect(await mineItems(page)).toEqual([]);
});

/** Local records written before the page loads, as an old visit would have left them. @param {import('@playwright/test').Page} page @param {string[]} ids */
async function seedMine(page, ids) {
	const items = ids.map((eventId, i) => ({ eventId, requestId: `seed-request-${i}0001`, name: 'Eva' }));
	await page.addInitScript(
		({ key, items }) => {
			if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ v: 1, items }));
		},
		{ key: MINE_KEY, items }
	);
}

test('no s’ofereix la baixa en un esdeveniment passat, cancel·lat o amb inscripció externa', async ({ page }) => {
	await seedMine(page, ['pasat-1', 'cancel-1', 'ext-1']);
	await openAgenda(page);
	for (const id of ['pasat-1', 'cancel-1', 'ext-1']) {
		await expect(card(page, id)).toHaveCount(1);
		await expect(card(page, id).getByRole('button', { name: /^Participar a/ })).toHaveCount(0);
		await expect(card(page, id).getByRole('button', { name: /^Desapuntar-me de/ })).toHaveCount(0);
	}
	for (const id of ['pasat-1', 'cancel-1', 'ext-1']) {
		await page.goto(`./?e=${id}`);
		await expect(detailDialog(page)).toBeVisible();
		await expect(page.getByRole('button', { name: T.participation.unsign })).toHaveCount(0);
		await expect(signupDialog(page)).toHaveCount(0);
	}
});

test('amb B1 = NO no s’ofereix la baixa, ni al detall', async ({ page }) => {
	await seedMine(page, ['accio-1']);
	await openAgenda(page, { options: { closed: true } });
	await expect(card(page, 'accio-1').getByRole('button', { name: /^Participar a/ })).toHaveCount(0);
	await expect(card(page, 'accio-1').getByRole('button', { name: /^Desapuntar-me de/ })).toHaveCount(0);
	await card(page, 'accio-1').getByRole('button', { name: /^Veure qui s’ha apuntat/ }).click();
	await expect(detailDialog(page)).toBeVisible();
	await expect(page.getByRole('button', { name: T.participation.unsign })).toHaveCount(0);
	await expect(signupDialog(page)).toHaveCount(0);
});

test('el detall mai ofereix la baixa, ni en un esdeveniment obert amb registre local', async ({ page }) => {
	await openAgenda(page);
	await signUp(page, 'accio-1', 'Eva');
	await card(page, 'accio-1').getByRole('link', { name: /^Veure el detall de/ }).click();
	await expect(detailDialog(page)).toBeVisible();
	await expect(detailDialog(page).getByRole('button', { name: T.participation.unsign })).toHaveCount(0);
});

// ---- «Desapuntar-me» on the card ----

test('la targeta canvia «Participar» per «Desapuntar-me» només a l’esdeveniment propi', async ({ page }) => {
	await openAgenda(page);
	await signUp(page, 'accio-1', 'Eva');
	const own = card(page, 'accio-1');
	await expect(own.getByRole('button', { name: /^Desapuntar-me de Paradeta al mercat/ })).toHaveText(T.participation.unsign);
	await expect(own.getByRole('button', { name: /^Participar a/ })).toHaveCount(0);
	await expect(card(page, 'acte-1').getByRole('button', { name: /^Participar a/ })).toHaveCount(1);
	await expect(card(page, 'acte-1').getByRole('button', { name: /^Desapuntar-me de/ })).toHaveCount(0);
	// The detail keeps «Participar».
	await own.getByRole('link', { name: /^Veure el detall de/ }).click();
	await expect(detailDialog(page).getByRole('button', { name: T.participate })).toBeVisible();
});

test('baixa des de la targeta: dos tocs, arxiva a Baixes, actualitza el recompte i torna «Participar»', async ({
	page
}) => {
	const { signups, baixes } = await openAgenda(page);
	await signUp(page, 'accio-1', 'Eva');
	const evaId = signups()[0][3];
	const own = card(page, 'accio-1');
	const button = own.getByRole('button', { name: /^Desapuntar-me de/ });
	await expect(own).toContainText(T.count(1));

	await button.click();
	await expect(button).toHaveText(T.participation.unsignConfirm);
	expect(signups()).toHaveLength(1);
	expect(baixes()).toEqual([]);
	// The confirmation goes back by itself.
	await expect(button).toHaveText(T.participation.unsign, { timeout: 8000 });
	expect(signups()).toHaveLength(1);

	/** @type {Array<string | null>} */
	const requests = [];
	page.on('request', (request) => {
		if (request.method() === 'POST') requests.push(request.postData());
	});
	await button.click();
	await expect(button).toHaveText(T.participation.unsignConfirm);
	await button.dblclick({ force: true });
	await expect(own.getByText(T.participation.unsignDone)).toBeVisible();
	expect(requests).toHaveLength(1);
	expect(JSON.parse(requests[0] ?? '{}')).toMatchObject({ action: 'unsignup', eventId: 'accio-1', requestId: evaId });

	expect(signups()).toEqual([]);
	expect(baixes()).toHaveLength(1);
	expect(await mineItems(page)).toEqual([]);
	await expect(own).toContainText(T.count(0));
	await expect(own.getByRole('button', { name: /^Participar a/ })).toBeVisible();
	await expect(own.getByRole('button', { name: /^Desapuntar-me de/ })).toHaveCount(0);
});

test('baixa des de la targeta: si el nom ja no és al full respon «Ja no hi eres a la llista»', async ({ page }) => {
	const { script } = await openAgenda(page);
	await signUp(page, 'accio-1', 'Eva');
	script.sheets.get('Inscripcions')?.rows.splice(1);
	const own = card(page, 'accio-1');
	const button = own.getByRole('button', { name: /^Desapuntar-me de/ });
	await button.click();
	await button.click();
	await expect(own.getByText(T.participation.alreadyGone)).toBeVisible();
	expect(await mineItems(page)).toEqual([]);
});

test('baixa des de la targeta: un error conserva el registre i el botó, i es pot repetir', async ({ page }) => {
	const { signups, options } = await openAgenda(page);
	await signUp(page, 'accio-1', 'Eva');
	const own = card(page, 'accio-1');
	const button = own.getByRole('button', { name: /^Desapuntar-me de/ });

	options.down = true;
	await button.click();
	await button.click();
	await expect(own.getByText(T.signupErrors.network)).toBeVisible();
	await expect(button).toHaveText(T.participation.unsign);
	expect(await mineItems(page)).toHaveLength(1);
	expect(signups()).toHaveLength(1);

	options.down = false;
	await button.click();
	await button.click();
	await expect(own.getByText(T.participation.unsignDone)).toBeVisible();
	expect(signups()).toEqual([]);
});

test('amb dos registres propis al mateix esdeveniment, «Desapuntar-me» obre el modal amb la llista', async ({
	page
}) => {
	const { signups } = await openAgenda(page);
	await signUp(page, 'accio-1', 'Eva');
	await signUp(page, 'accio-1', 'Pau');
	await card(page, 'accio-1').getByRole('button', { name: /^Desapuntar-me de/ }).click();
	const section = signupDialog(page).getByRole('region', { name: T.participation.mine });
	await expect(section.getByRole('listitem')).toHaveCount(2);
	// Opening the modal removes nothing.
	expect(signups()).toHaveLength(2);
	await confirmUnsign(section, 0);
	await expect(signupDialog(page).getByText(T.participation.unsignDone)).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(signupDialog(page)).toBeHidden();
	// One record left: the card removes it directly again.
	await expect(card(page, 'accio-1').getByRole('button', { name: /^Desapuntar-me de/ })).toBeVisible();
	await expect(card(page, 'accio-1')).toContainText(T.count(1));
});
