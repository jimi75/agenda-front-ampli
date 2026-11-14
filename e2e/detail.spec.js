import { expect, test } from '@playwright/test';
import { EVENT_HEADER } from '../apps-script/fake-google.js';
import { T } from '../src/lib/texts.js';
import { card, cards, detailDialog, openAgenda, signupDialog } from './helpers.js';

/** @param {import('@playwright/test').Page} page @param {string} id */
const detailLink = (page, id) => card(page, id).getByRole('link', { name: /^Veure el detall de/ });

test('«detall» obre el detall amb tota la informació i no toca la barra d’adreces', async ({ page }) => {
	await openAgenda(page);
	const before = page.url();
	const link = detailLink(page, 'accio-1');
	await link.click();

	const detail = detailDialog(page);
	await expect(detail).toBeVisible();
	await expect(detail.getByRole('heading', { level: 2 })).toHaveText('Paradeta al mercat');
	await expect(detail).toContainText(T.types.accio);
	await expect(detail).toContainText('dijous 12 de novembre · 10h-14h');
	await expect(detail.getByRole('link', { name: /Mercat de Sants/ })).toHaveAttribute(
		'href',
		/^https:\/\/www\.google\.com\/maps\//
	);
	await expect(detail).toContainText(T.count(0));
	await expect(detail).toContainText(T.detail.listEmpty);
	await expect(detail.getByRole('button', { name: T.participate })).toBeVisible();
	await expect(detail.getByRole('button', { name: T.detail.close })).toBeFocused();
	expect(page.url()).toBe(before);

	await detail.getByRole('button', { name: T.detail.close }).click();
	await expect(detail).toBeHidden();
	expect(page.url()).toBe(before);
	await expect(link).toBeFocused();
});

test('tocar la targeta fora d’un enllaç o botó no fa res', async ({ page }) => {
	await openAgenda(page);
	await card(page, 'accio-1').locator('.name').click();
	await card(page, 'accio-1').locator('.time').click();
	await expect(page.locator('dialog[open]')).toHaveCount(0);
});

test('Ctrl/Cmd+clic a «detall» conserva el comportament natiu: obre ?e= en una altra pestanya', async ({
	page,
	context
}) => {
	await openAgenda(page);
	const popup = context.waitForEvent('page');
	await detailLink(page, 'accio-1').click({ modifiers: ['ControlOrMeta'] });
	expect((await popup).url()).toMatch(/\/agenda-front-ampli\/\?e=accio-1$/);
	await expect(page.locator('dialog[open]')).toHaveCount(0);
});

test('?e= vàlid obre el detall en carregar, sense desplaçar-se al proper dia', async ({ page }) => {
	await openAgenda(page, { query: 'e=acte-1' });
	const detail = detailDialog(page);
	await expect(detail.getByRole('heading', { level: 2 })).toHaveText('Xerrada oberta');
	await expect(detail).toContainText(T.types.acte);
	expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test('sense ?e=, la llista s’obre al proper dia amb esdeveniments', async ({ page }) => {
	// At 500 px high, day 12 starts below the window, so the «already visible» guard does not apply.
	await page.setViewportSize({ width: 1280, height: 500 });
	await openAgenda(page, { waitForCards: false });
	await cards(page).first().waitFor();
	const start = await page.locator('#dia-2026-11-12').evaluate((el) => el.getBoundingClientRect().top);
	expect(start + (await page.evaluate(() => window.scrollY))).toBeGreaterThanOrEqual(500);
	const top = () => page.locator('#dia-2026-11-12').evaluate((el) => el.getBoundingClientRect().top);
	await expect.poll(top).toBeLessThanOrEqual(16);
	expect(await top()).toBeGreaterThanOrEqual(0);
	expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
});

test('sense ?e=, si el dia de destí ja és visible no es desplaça la pàgina', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 1600 });
	await openAgenda(page);
	const inside = await page
		.locator('#dia-2026-11-12')
		.evaluate((el) => el.getBoundingClientRect().top < window.innerHeight);
	expect(inside).toBe(true);
	await page.waitForTimeout(300);
	expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test('sense ?e=, si la pàgina ja té scroll quan arriben les dades no hi ha salt', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 600 });
	let release = () => {};
	const held = new Promise((resolve) => (release = () => resolve(undefined)));
	await openAgenda(page, {
		waitForCards: false,
		prepare: () => {
			// Registered after the script mock, so it runs first and releases the request later.
			void page.route(/^http:\/\/localhost:5301\/exec/, async (route) => {
				await held;
				await route.fallback();
			});
		}
	});
	// The loading notice is short: give the page some height so it can scroll.
	await page.evaluate(() => {
		document.body.style.minHeight = '3000px';
		window.scrollTo(0, 50);
	});
	expect(await page.evaluate(() => window.scrollY)).toBe(50);
	release();
	await cards(page).first().waitFor();
	await page.waitForTimeout(300);
	expect(await page.evaluate(() => window.scrollY)).toBe(50);
});

test('mòbil: si el dia de destí ja és visible en carregar, no es desplaça la pàgina', async ({
	page,
	isMobile
}) => {
	test.skip(!isMobile, 'prova del perfil mòbil (CUJ 4)');
	await page.setViewportSize({ width: 390, height: 1600 });
	await openAgenda(page);
	const inside = await page
		.locator('#dia-2026-11-12')
		.evaluate((el) => el.getBoundingClientRect().top < window.innerHeight);
	expect(inside).toBe(true);
	await page.waitForTimeout(300);
	expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test('?e= amb un id mal format no obre res', async ({ page }) => {
	await openAgenda(page, { query: 'e=Mal_Id' });
	await expect(page.locator('dialog[open]')).toHaveCount(0);
});

for (const offline of [false, true]) {
	const source = offline ? 'còpia sense connexió' : 'agenda del script';

	test(`?e= desconegut (${source}): avís «no s’ha trobat» i calendari`, async ({ page }) => {
		await openAgenda(page, { query: 'e=no-existeix', offline });
		const detail = detailDialog(page);
		await expect(detail).toContainText(T.detail.notFound);
		await expect(detail.getByRole('button')).toHaveCount(1);
		await expect(detail.getByRole('button', { name: T.detail.close })).toBeVisible();
		if (offline) await expect(page.getByText(/^Dades (guardades|de fa)/)).toBeVisible();

		await detail.getByRole('button', { name: T.detail.close }).click();
		await expect(detail).toBeHidden();
		await expect(cards(page)).toHaveCount(6);
	});

	test(`?e= conegut (${source}) obre el detall`, async ({ page }) => {
		await openAgenda(page, { query: 'e=accio-1', offline });
		await expect(detailDialog(page).getByRole('heading', { level: 2 })).toHaveText('Paradeta al mercat');
	});
}

test('si l’esdeveniment desapareix en recarregar amb el detall obert, només queda l’avís i «Tanca»', async ({
	page
}) => {
	const { script } = await openAgenda(page, { query: 'e=accio-1' });
	const detail = detailDialog(page);
	await expect(detail.getByRole('heading', { level: 2 })).toHaveText('Paradeta al mercat');

	const rows = script.sheets.get('Esdeveniments').rows;
	rows.splice(
		rows.findIndex((/** @type {string[]} */ row) => row[0] === 'accio-1'),
		1
	);
	// «Participar» reloads the agenda in silence.
	await detail.getByRole('button', { name: T.participate }).click();

	await expect(detail).toContainText(T.detail.notFound);
	await expect(detail.getByRole('button')).toHaveCount(1);
	await expect(detail.getByRole('button', { name: T.detail.close })).toBeVisible();
	await expect(signupDialog(page)).toHaveCount(0);
});

for (const [id, note] of [
	['pasat-1', T.dialog.pastNote],
	['cancel-1', T.dialog.cancelledNote]
]) {
	test(`${id}: s’obre en només lectura, sense «Participar», «Desapuntar-me» ni compartir`, async ({ page }) => {
		await openAgenda(page, { query: `e=${id}` });
		const detail = detailDialog(page);
		await expect(detail).toContainText(note);
		await expect(detail).toContainText(T.detail.listEmpty);
		await expect(detail.getByRole('button', { name: T.participate })).toHaveCount(0);
		await expect(detail.getByRole('button', { name: T.participation.unsign })).toHaveCount(0);
		await expect(detail.getByRole('button', { name: T.share.share, exact: true })).toHaveCount(0);
		await expect(detail.getByRole('button', { name: T.share.customImage, exact: true })).toHaveCount(0);
	});

	test(`${id}: «Veure apuntats» obre el detall, no el modal d’inscripció`, async ({ page }) => {
		await openAgenda(page);
		await card(page, id).getByRole('button', { name: /^Veure qui s’ha apuntat/ }).click();
		await expect(detailDialog(page)).toBeVisible();
		await expect(signupDialog(page)).toHaveCount(0);
	});
}

test('un esdeveniment passat i cancel·lat conserva el nom ratllat, a la targeta i al detall', async ({ page }) => {
	await openAgenda(page, {
		prepare: ({ script }) => {
			const row = script.sheets.get('Esdeveniments')?.rows.find((r) => r[0] === 'pasat-1');
			if (row) row[EVENT_HEADER.indexOf('estat')] = 'Cancel·lat';
		}
	});
	await expect(card(page, 'pasat-1').locator('.name')).toHaveCSS('text-decoration-line', 'line-through');

	await card(page, 'pasat-1').getByRole('button', { name: /^Veure qui s’ha apuntat/ }).click();
	const detail = detailDialog(page);
	await expect(detail.getByRole('heading', { level: 2 })).toHaveCSS('text-decoration-line', 'line-through');
	// Past wins over cancelled for what a person can do: the note is the past one.
	await expect(detail).toContainText(T.dialog.pastNote);
});

test('Esc tanca només el diàleg de dalt i el focus torna a qui l’ha obert', async ({ page }) => {
	await openAgenda(page);
	const link = detailLink(page, 'accio-1');
	await link.click();
	const detail = detailDialog(page);
	const participate = detail.getByRole('button', { name: T.participate });
	await participate.click();
	await expect(signupDialog(page)).toBeVisible();
	await expect(detail).toBeVisible();

	await page.keyboard.press('Escape');
	await expect(signupDialog(page)).toBeHidden();
	await expect(detail).toBeVisible();
	await expect(participate).toBeFocused();

	await page.keyboard.press('Escape');
	await expect(detail).toBeHidden();
	await expect(link).toBeFocused();
});

test('obert amb ?e=, en tancar el focus va al títol de la pàgina', async ({ page }) => {
	await openAgenda(page, { query: 'e=accio-1' });
	await detailDialog(page).getByRole('button', { name: T.detail.close }).click();
	await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
});

test('«Comparteix» és un botó (sense enllaç wa.me de principi)', async ({ page }) => {
	await openAgenda(page, { query: 'admin&e=accio-1' });
	const detail = detailDialog(page);

	await expect(detail.getByRole('button', { name: T.share.share, exact: true })).toBeEnabled();
	await expect(detail.getByRole('button', { name: T.share.customImage, exact: true })).toBeEnabled();
	await expect(detail.getByRole('link', { name: new RegExp(T.share.waLink) })).toHaveCount(0);
});

test('tancat per B1 = NO: el detall mostra «Les inscripcions estan tancades» i manté compartir', async ({
	page
}) => {
	await openAgenda(page, { query: 'e=accio-1', options: { closed: true } });
	const detail = detailDialog(page);
	await expect(detail).toContainText(T.dialog.closed);
	await expect(detail.getByRole('button', { name: T.participate })).toHaveCount(0);
	await expect(detail.getByRole('button', { name: T.share.share, exact: true })).toBeVisible();
	await expect(detail.getByRole('button', { name: T.share.customImage, exact: true })).toBeVisible();
});

test('un esdeveniment amb inscripció externa també ofereix les dues accions d’imatge', async ({ page }) => {
	await openAgenda(page, { query: 'e=ext-1' });
	const detail = detailDialog(page);
	await expect(detail.getByRole('button', { name: T.share.share, exact: true })).toBeVisible();
	await expect(detail.getByRole('button', { name: T.share.customImage, exact: true })).toBeVisible();
});

for (const width of [390, 1024, 1280, 1920]) {
	test(`${width} px: «detall» és tocable, no hi ha desbordament i el detall té la mida prevista`, async ({
		page,
		isMobile
	}) => {
		test.skip(isMobile && width !== 390, 'el perfil mòbil només prova 390 px');
		await page.setViewportSize({ width, height: 900 });
		await openAgenda(page);

		const overflow = () =>
			page.evaluate(() => ({
				page: document.documentElement.scrollWidth - window.innerWidth,
				cards: [...document.querySelectorAll('article.event, article.event .tags')].filter(
					(el) => el.scrollWidth > el.clientWidth
				).length
			}));
		expect(await overflow()).toEqual({ page: 0, cards: 0 });

		// The cancelled card has the longest tag line: type, status and the link.
		const link = detailLink(page, 'cancel-1');
		const box = await link.boundingBox();
		expect(box?.width).toBeGreaterThanOrEqual(24);
		expect(box?.height).toBeGreaterThanOrEqual(24);
		const style = await link.evaluate((el) => {
			const s = getComputedStyle(el);
			return {
				fontSize: s.fontSize,
				fontWeight: s.fontWeight,
				letterSpacing: s.letterSpacing,
				textTransform: s.textTransform
			};
		});
		expect(style).toEqual({ fontSize: '11.52px', fontWeight: '700', letterSpacing: '0.6912px', textTransform: 'uppercase' });

		await detailLink(page, 'accio-1').click();
		const dialog = detailDialog(page);
		await expect(dialog).toBeVisible();
		const panel = await dialog.boundingBox();
		const viewport = page.viewportSize();
		expect(await overflow()).toEqual({ page: 0, cards: 0 });
		if (width < 1024) {
			expect(panel).toMatchObject({ x: 0, y: 0, width, height: viewport?.height });
		} else {
			expect(panel?.width).toBeLessThan(width - 100);
			expect(Math.abs((panel?.x ?? 0) * 2 + (panel?.width ?? 0) - width)).toBeLessThanOrEqual(1);
			expect(panel?.height).toBeLessThan((viewport?.height ?? 0) - 20);
			// The list is a centred column of at most 720 px, with no weekday row.
			await expect(page.locator('ul.weekdays')).toHaveCount(0);
			const calendar = await page.locator('.calendar').boundingBox();
			expect(calendar?.width).toBeLessThanOrEqual(720);
			expect(Math.abs((calendar?.x ?? 0) * 2 + (calendar?.width ?? 0) - width)).toBeLessThanOrEqual(1);
		}
	});
}
