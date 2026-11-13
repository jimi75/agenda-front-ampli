import { expect, test } from '@playwright/test';
import { T } from '../src/lib/texts.js';
import {
	card,
	detailDialog,
	mockShare,
	openAgenda,
	postersRendered,
	pendingShareCalls,
	sameShareFile,
	settleShare,
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
 * @param {{ behaviour?: string[], files?: boolean, pending?: number[], query?: string }} [config]
 */
async function openDetail(page, { behaviour = ['ok'], files = true, pending = [], query = `e=${ID}` } = {}) {
	await trackPosters(page);
	await mockShare(page, behaviour, { files, pending });
	await page.addInitScript(() => {
		document.addEventListener(
			'change',
			(event) => {
				const input = event.target;
				if (input instanceof HTMLInputElement && input.classList.contains('custom-file-input')) {
					/** @type {any} */ (window).__customSelectedFile = input.files?.[0] ?? null;
				}
			},
			true
		);
	});
	const downloads = /** @type {string[]} */ ([]);
	page.on('download', (download) => downloads.push(download.suggestedFilename()));
	const agenda = await openAgenda(page, { query });
	const detail = detailDialog(page);
	await expect(detail).toBeVisible();
	return {
		...agenda,
		detail,
		downloads,
		share: detail.getByRole('button', { name: T.share.share, exact: true }),
		ready: detail.getByRole('button', { name: T.share.ready }),
		custom: detail.getByRole('button', { name: T.share.customImage, exact: true }),
		waLink: detail.getByRole('link', { name: new RegExp(T.share.waLink) }),
		live: detail.locator('.live')
	};
}

/** Waits until the mocked `navigator.share` has been called `count` times. @param {import('@playwright/test').Page} page @param {number} count */
const sharedTimes = (page, count) => expect.poll(async () => (await shareCalls(page)).length).toBe(count);

/**
 * Selects an in-memory image through the real file input.
 * @param {import('@playwright/test').Page} page @param {import('@playwright/test').Locator} button
 * @param {{ name: string, mimeType: string, buffer: Buffer }} file
 */
async function selectFile(page, button, file) {
	const chooserPromise = page.waitForEvent('filechooser');
	await button.click();
	const chooser = await chooserPromise;
	await chooser.setFiles(file);
}

/**
 * Injects a test-created File after the real picker has opened, to preserve exact MIME values.
 * @param {import('@playwright/test').Page} page @param {import('@playwright/test').Locator} button
 * @param {{ name: string, type: string, bytes: number[] }} file
 */
async function selectConstructedFile(page, button, file) {
	const chooserPromise = page.waitForEvent('filechooser');
	await button.click();
	await chooserPromise;
	await page.locator('.custom-file-input').evaluate(
		(input, selected) => {
			const data = new DataTransfer();
			data.items.add(new File([new Uint8Array(selected.bytes)], selected.name, { type: selected.type }));
			input.files = data.files;
			input.dispatchEvent(new Event('change', { bubbles: true }));
		},
		file
	);
}

/** @param {import('@playwright/test').Page} page */
function capturedCustomFile(page) {
	return page.evaluate(async () => {
		const file = /** @type {any} */ (window).__customSelectedFile;
		return file
			? {
					name: file.name,
					type: file.type,
					size: file.size,
					bytes: [...new Uint8Array(await file.arrayBuffer())],
					isShareFile: /** @type {any} */ (window).__shareCalls.some((call) => call.files[0] === file)
				}
			: null;
	});
}

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
	await expect(detail.getByRole('button', { name: T.share.customImage, exact: true })).toBeDisabled();
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

test('la nova acció és secundària, accessible amb teclat i obre un selector d’una sola imatge', async ({
	page
}) => {
	const { share, custom } = await openDetail(page);
	await share.click();
	await sharedTimes(page, 1);
	await expect(page.locator('.custom-file-input')).toHaveCount(0);

	await share.focus();
	await page.keyboard.press('Tab');
	await expect(custom).toBeFocused();
	await custom.evaluate((button) => {
		button.addEventListener(
			'click',
			(event) => {
				event.stopImmediatePropagation();
				Object.assign(window, { __keyboardCustomActivated: true });
			},
			{ once: true }
		);
	});
	await page.keyboard.press('Enter');
	await expect.poll(() => page.evaluate(() => '__keyboardCustomActivated' in window)).toBe(true);
	const chooserPromise = page.waitForEvent('filechooser');
	await custom.click();
	const chooser = await chooserPromise;
	expect(await chooser.element().getAttribute('accept')).toBe('image/*,.jpg,.jpeg,.png,.gif,.webp');
	expect(chooser.isMultiple()).toBe(false);
	expect(await chooser.element().getAttribute('capture')).toBeNull();
	expect(await chooser.element().getAttribute('tabindex')).toBe('-1');
	expect(await chooser.element().getAttribute('aria-hidden')).toBe('true');
	expect((await custom.boundingBox())?.height).toBeGreaterThanOrEqual(44);
	await chooser.setFiles({
		name: 'keyboard.png',
		mimeType: 'image/png',
		buffer: Buffer.from([1, 2, 3])
	});
	await sharedTimes(page, 2);
});

for (const file of [
	{ name: 'original-photo.JPG', mimeType: 'image/jpeg', bytes: Buffer.from([0xff, 0xd8, 0xff, 1]) },
	{ name: 'untouched-image.png', mimeType: 'image/png', bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47, 2]) }
]) {
	test(`imatge pròpia: envia ${file.name} sense processar-la ni fer peticions d’aplicació`, async ({ page }) => {
		const { custom, downloads, waLink } = await openDetail(page);
		/** @type {string[]} */
		const appRequests = [];
		page.on('request', (request) => {
			if (request.url().includes('localhost:5301/exec')) appRequests.push(request.url());
		});

		await selectFile(page, custom, { name: file.name, mimeType: file.mimeType, buffer: file.bytes });
		await sharedTimes(page, 1);
		const [call] = await shareCalls(page);
		expect(call).toEqual({
			files: [{ name: file.name, type: file.mimeType, size: file.bytes.length }],
			text: EXPECTED_TEXT
		});
		expect(await capturedCustomFile(page)).toEqual({
			name: file.name,
			type: file.mimeType,
			size: file.bytes.length,
			bytes: [...file.bytes],
			isShareFile: true
		});
		await expect(page.locator('.poster')).toHaveCount(0);
		await expect(waLink).toHaveCount(0);
		expect(downloads).toEqual([]);
		expect(appRequests).toEqual([]);
		expect(await postersRendered(page)).toBe(0);
	});
}

test('imatge pròpia en una inscripció externa: conserva el text i l’URL externs', async ({ page }) => {
	const externalUrl = 'https://example.org/inscripcio';
	const expectedText =
		'📢 *Jornada amb inscripció externa* 📢\n\n🗓️ Dijous 19 de novembre\n⏰ 10h-14h\n📍 Mercat de Sants\n\n🔗 Més detalls i inscripcions: ' +
		externalUrl;
	const { custom, downloads, waLink } = await openDetail(page, { query: 'e=ext-1' });
	await selectFile(page, custom, {
		name: 'external.png',
		mimeType: 'image/png',
		buffer: Buffer.from([9, 8, 7])
	});
	await sharedTimes(page, 1);
	const [call] = await shareCalls(page);
	expect(call.text).toBe(expectedText);
	expect(call.files).toEqual([{ name: 'external.png', type: 'image/png', size: 3 }]);
	expect(await postersRendered(page)).toBe(0);
	expect(downloads).toEqual([]);
	await expect(waLink).toHaveCount(0);
});

for (const primaryAction of ['share', 'download']) {
	test(`usar «${primaryAction === 'share' ? 'Comparteix' : 'Descarrega la imatge'}» descarta la preparació pròpia`, async ({
		page
	}) => {
		const { detail, custom, share, downloads } = await openDetail(page, {
			behaviour: primaryAction === 'share' ? ['NotAllowedError', 'ok'] : ['NotAllowedError']
		});
		await selectFile(page, custom, {
			name: 'selected.png',
			mimeType: 'image/png',
			buffer: Buffer.from([1, 2])
		});
		await expect(detail.getByRole('button', { name: T.share.customRetry })).toBeVisible();

		if (primaryAction === 'share') {
			await share.click();
			await sharedTimes(page, 2);
		} else {
			const [download] = await Promise.all([
				page.waitForEvent('download'),
				detail.getByRole('button', { name: T.share.download }).click()
			]);
			expect(download.suggestedFilename()).toBe(`agenda-${ID}.png`);
		}
		await expect(detail.getByRole('button', { name: T.share.customImage, exact: true })).toBeVisible();
		expect(await postersRendered(page)).toBe(1);
		expect(downloads).toEqual(primaryAction === 'download' ? [`agenda-${ID}.png`] : []);
	});
}

test('un error propi no emmascara l’error i el respatller posterior de l’acció principal', async ({ page }) => {
	const { custom, share, live, waLink } = await openDetail(page, { behaviour: ['DataError', 'DataError'] });
	await selectFile(page, custom, {
		name: 'selected.png',
		mimeType: 'image/png',
		buffer: Buffer.from([1])
	});
	await expect(live).toHaveText(T.share.customFailed);
	const [download] = await Promise.all([page.waitForEvent('download'), share.click()]);
	expect(download.suggestedFilename()).toBe(`agenda-${ID}.png`);
	await expect(live).toHaveText(T.share.fallbackNote);
	await expect(waLink).toHaveAttribute('href', WA_LINK);
});

test('cancel·lar el selector és silenciós i manté disponible l’acció pròpia', async ({ page }) => {
	const { custom, live, downloads } = await openDetail(page);
	const chooserPromise = page.waitForEvent('filechooser');
	await custom.click();
	const chooser = await chooserPromise;
	await chooser.setFiles([]);
	await expect(custom).toBeEnabled();
	await expect(custom).toHaveText(T.share.customImage);
	await expect(live).toHaveText('');
	expect(await shareCalls(page)).toHaveLength(0);
	expect(downloads).toEqual([]);
	await selectFile(page, custom, {
		name: 'same-after-picker-cancel.jpg',
		mimeType: 'image/jpeg',
		buffer: Buffer.from([1, 2])
	});
	await sharedTimes(page, 1);
});

test('un esdeveniment cancel del selector no mostra error i retorna el focus', async ({ page }) => {
	const { custom, detail, live } = await openDetail(page);
	const chooserPromise = page.waitForEvent('filechooser');
	await custom.click();
	await chooserPromise;
	await page.locator('.custom-file-input').dispatchEvent('cancel');
	await expect(custom).toBeFocused();
	await expect(live).toHaveText('');
	await expect(detail.getByRole('button', { name: T.share.share, exact: true })).toBeEnabled();
});

test('cancel·lar el selector conserva la preparació prèvia de la imatge generada', async ({ page }) => {
	const { custom, ready, live } = await openDetail(page, { behaviour: ['NotAllowedError', 'ok'] });
	await page.getByRole('button', { name: T.share.share, exact: true }).click();
	await expect(ready).toBeVisible();

	const chooserPromise = page.waitForEvent('filechooser');
	await custom.click();
	const chooser = await chooserPromise;
	await chooser.setFiles([]);
	await expect(ready).toBeVisible();
	await expect(live).toHaveText(T.share.ready);
});

test('un fitxer rebutjat conserva la preparació principal i la seva acció continua funcionant', async ({ page }) => {
	const { detail, custom, ready, live } = await openDetail(page, { behaviour: ['NotAllowedError', 'ok'] });
	await detail.getByRole('button', { name: T.share.share, exact: true }).click();
	await expect(ready).toBeVisible();

	await selectConstructedFile(page, custom, {
		name: 'wrong-type.jpg',
		type: 'text/plain',
		bytes: [1]
	});
	await expect(live).toHaveText(T.share.customFailed);
	await expect(ready).toBeVisible();
	await ready.click();
	await sharedTimes(page, 2);
	await expect(live).toHaveText('');
});

test('si no es pot obrir el selector, mostra només l’error propi', async ({ page }) => {
	const { custom, live, downloads, waLink } = await openDetail(page);
	await page.evaluate(() => {
		const click = HTMLInputElement.prototype.click;
		HTMLInputElement.prototype.click = function () {
			if (this.classList.contains('custom-file-input')) throw new Error('picker blocked');
			click.call(this);
		};
	});
	await custom.click();
	await expect(live).toHaveText(T.share.customFailed);
	expect(await shareCalls(page)).toHaveLength(0);
	expect(await postersRendered(page)).toBe(0);
	expect(downloads).toEqual([]);
	await expect(waLink).toHaveCount(0);
});

test('AbortError del panell és silenciós en el primer i el segon intent', async ({ page }) => {
	const { custom, live } = await openDetail(page, { behaviour: ['AbortError', 'NotAllowedError', 'AbortError'] });
	await selectFile(page, custom, {
		name: 'cancelled.png',
		mimeType: 'image/png',
		buffer: Buffer.from([1])
	});
	await sharedTimes(page, 1);
	await expect(custom).toHaveText(T.share.customImage);
	await expect(live).toHaveText('');

	await selectFile(page, custom, {
		name: 'cancelled.png',
		mimeType: 'image/png',
		buffer: Buffer.from([1])
	});
	await expect(page.getByRole('button', { name: T.share.customRetry })).toBeVisible();
	await page.getByRole('button', { name: T.share.customRetry }).click();
	await sharedTimes(page, 3);
	await expect(custom).toHaveText(T.share.customImage);
	await expect(live).toHaveText('');
});

test('un nou toc substitueix un selector sense cancel: els esdeveniments tardans del vell no afecten el nou', async ({
	page
}) => {
	const { custom, live } = await openDetail(page);
	const firstChooser = page.waitForEvent('filechooser');
	await custom.click();
	await firstChooser;
	await page.evaluate(() => {
		/** @type {any} */ (window).__oldPicker = document.querySelector('.custom-file-input');
	});

	await selectFile(page, custom, {
		name: 'replacement.png',
		mimeType: 'image/png',
		buffer: Buffer.from([3, 4])
	});
	await sharedTimes(page, 1);
	await page.evaluate(() => {
		const old = /** @type {HTMLInputElement} */ (/** @type {any} */ (window).__oldPicker);
		const data = new DataTransfer();
		data.items.add(new File(['stale'], 'stale.png', { type: 'image/png' }));
		old.files = data.files;
		old.dispatchEvent(new Event('change', { bubbles: true }));
		old.dispatchEvent(new Event('cancel'));
	});
	expect(await shareCalls(page)).toHaveLength(1);
	await expect(custom).toHaveText(T.share.customImage);
	await expect(live).toHaveText('');
});

for (const firstOutcome of ['success', 'failure', 'cancel']) {
	test(`es pot tornar a triar el mateix nom després de ${firstOutcome}`, async ({ page }) => {
		const behaviour = firstOutcome === 'failure' ? ['DataError', 'ok'] : firstOutcome === 'cancel' ? ['AbortError', 'ok'] : ['ok', 'ok'];
		const { custom } = await openDetail(page, { behaviour });
		const payload = {
			name: 'same-local-name.jpg',
			mimeType: 'image/jpeg',
			buffer: Buffer.from([1, 2, 3])
		};
		await selectFile(page, custom, payload);
		if (firstOutcome === 'cancel') {
			await expect(custom).toHaveText(T.share.customImage);
		} else {
			await sharedTimes(page, 1);
			if (firstOutcome === 'failure') {
				await expect(page.locator('.live')).toHaveText(T.share.customFailed);
			}
		}
		await selectFile(page, custom, payload);
		await sharedTimes(page, 2);
		expect((await shareCalls(page)).at(-1)?.files[0].name).toBe(payload.name);
	});
}

test('els tipus buits només passen amb les cinc extensions acordades, sense afegir-ne cap', async ({ page }) => {
	const { custom } = await openDetail(page);
	const accepted = ['photo.jpg', 'photo.jpeg', 'photo.png', 'photo.gif', 'photo.webp', 'photo.JPG'];
	for (const name of accepted) {
		await selectConstructedFile(page, custom, { name, type: '', bytes: [1, 2] });
		await sharedTimes(page, accepted.indexOf(name) + 1);
		const call = (await shareCalls(page)).at(-1);
		expect(call?.files).toEqual([{ name, type: '', size: 2 }]);
	}
});

test('rebutja noms buits o enganyosos i tipus explícits no compatibles només amb l’avís breu', async ({ page }) => {
	const { custom, live, downloads, waLink } = await openDetail(page);
	const rejected = [
		{ name: 'no-extension', mimeType: '' },
		{ name: 'photo.heic', mimeType: '' },
		{ name: 'photo.jpg.exe', mimeType: '' },
		{ name: 'photo.jpg', mimeType: 'application/octet-stream' },
		{ name: 'photo.jpg', mimeType: 'text/plain' },
		{ name: 'photo.jpg', mimeType: 'image/' }
	];
	for (const file of rejected) {
		await selectConstructedFile(page, custom, {
			name: file.name,
			type: file.mimeType,
			bytes: [7]
		});
		await expect(live, `${file.name} (${file.mimeType})`).toHaveText(T.share.customFailed);
	}
	expect(await shareCalls(page)).toHaveLength(0);
	expect(await postersRendered(page)).toBe(0);
	expect(downloads).toEqual([]);
	await expect(waLink).toHaveCount(0);
});

test('un tipus buit acceptat pel nom però rebutjat per canShare mostra l’error sense substitució', async ({ page }) => {
	const { custom, live, downloads, waLink } = await openDetail(page, { files: false });
	await selectConstructedFile(page, custom, {
		name: 'original.JPG',
		type: '',
		bytes: [0, 1, 2]
	});
	await expect(live).toHaveText(T.share.customFailed);
	expect(await capturedCustomFile(page)).toMatchObject({
		name: 'original.JPG',
		type: '',
		bytes: [0, 1, 2],
		isShareFile: false
	});
	expect(await shareCalls(page)).toHaveLength(0);
	expect(await postersRendered(page)).toBe(0);
	expect(downloads).toEqual([]);
	await expect(waLink).toHaveCount(0);
});

for (const capability of ['missing-share', 'missing-can-share', 'throwing-probe', 'unsupported']) {
	test(`${capability}: falla només amb l’avís propi, sense camins de respatller`, async ({ page }) => {
		const { custom, live, downloads, waLink } = await openDetail(page, {
			files: capability !== 'unsupported'
		});
		const chooserPromise = page.waitForEvent('filechooser');
		await custom.click();
		await chooserPromise;
		if (capability !== 'unsupported') {
			await page.evaluate((name) => {
				if (name === 'missing-share') {
					Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
				} else if (name === 'missing-can-share') {
					Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined });
				} else {
					Object.defineProperty(navigator, 'canShare', {
						configurable: true,
						value: () => {
							throw new Error('probe failed');
						}
					});
				}
			}, capability);
		}
		await page.locator('.custom-file-input').evaluate((input) => {
			const data = new DataTransfer();
			data.items.add(new File(['same'], 'original.png', { type: 'image/png' }));
			input.files = data.files;
			input.dispatchEvent(new Event('change', { bubbles: true }));
		});
		await expect(live).toHaveText(T.share.customFailed);
		expect(await shareCalls(page)).toHaveLength(0);
		expect(await postersRendered(page)).toBe(0);
		expect(downloads).toEqual([]);
		await expect(waLink).toHaveCount(0);
	});
}

test('DataError de share propi només mostra l’error, sense generar ni descarregar cap imatge', async ({ page }) => {
	const { custom, live, downloads, waLink } = await openDetail(page, { behaviour: ['DataError'] });
	await selectFile(page, custom, {
		name: 'original.png',
		mimeType: 'image/png',
		buffer: Buffer.from([1])
	});
	await expect(live).toHaveText(T.share.customFailed);
	expect(await shareCalls(page)).toHaveLength(1);
	expect(await postersRendered(page)).toBe(0);
	expect(downloads).toEqual([]);
	await expect(waLink).toHaveCount(0);
});

test('NotAllowedError propi ofereix un sol segon toc amb el mateix File original', async ({ page }) => {
	const { custom, live } = await openDetail(page, { behaviour: ['NotAllowedError', 'ok'] });
	let pickerCount = 0;
	page.on('filechooser', () => pickerCount++);
	await selectFile(page, custom, {
		name: 'retry-original.png',
		mimeType: 'image/png',
		buffer: Buffer.from([5, 6, 7])
	});
	await expect(page.getByRole('button', { name: T.share.customRetry })).toBeVisible();
	await expect(live).toHaveText(T.share.ready);
	expect(await page.locator('.custom-file-input').count()).toBe(0);
	await page.getByRole('button', { name: T.share.customRetry }).click();
	await sharedTimes(page, 2);
	expect(pickerCount).toBe(1);
	expect(await sameShareFile(page)).toBe(true);
	expect(await capturedCustomFile(page)).toMatchObject({ name: 'retry-original.png', isShareFile: true });
	await expect(custom).toHaveText(T.share.customImage);
	await expect(live).toHaveText('');
});

test('dos NotAllowedError propisos: el segon falla, allibera el File i no ofereix un tercer intent', async ({
	page
}) => {
	const { custom, live } = await openDetail(page, {
		behaviour: ['NotAllowedError', 'NotAllowedError']
	});
	await selectFile(page, custom, {
		name: 'one-retry.png',
		mimeType: 'image/png',
		buffer: Buffer.from([1])
	});
	await expect(page.getByRole('button', { name: T.share.customRetry })).toBeVisible();
	await page.getByRole('button', { name: T.share.customRetry }).click();
	await sharedTimes(page, 2);
	await expect(live).toHaveText(T.share.customFailed);
	await expect(custom).toHaveText(T.share.customImage);
	await expect(page.getByRole('button', { name: T.share.customRetry })).toHaveCount(0);
	expect(await sameShareFile(page)).toBe(true);
});

test('les tres accions d’imatge es desactiven mentre el compartir propi està pendent', async ({ page }) => {
	const { detail, custom, downloads, share } = await openDetail(page, { pending: [0] });
	await selectFile(page, custom, {
		name: 'pending.png',
		mimeType: 'image/png',
		buffer: Buffer.from([1])
	});
	await expect.poll(() => pendingShareCalls(page)).toEqual([0]);
	await expect(detail.getByRole('button', { name: T.share.download })).toBeDisabled();
	await expect(share).toBeDisabled();
	await expect(custom).toBeDisabled();
	await custom.evaluate((button) => {
		button.click();
		button.click();
	});
	expect(await shareCalls(page)).toHaveLength(1);
	await settleShare(page, 0);
	await expect(custom).toBeEnabled();
	await expect(share).toBeEnabled();
	expect(downloads).toEqual([]);
});

test('una preparació pròpia no sobreviu a tancar i reobrir el detall', async ({ page }) => {
	const { detail, custom } = await openDetail(page, { behaviour: ['NotAllowedError', 'ok'] });
	await selectFile(page, custom, {
		name: 'ready-before-close.png',
		mimeType: 'image/png',
		buffer: Buffer.from([1])
	});
	await expect(page.getByRole('button', { name: T.share.customRetry })).toBeVisible();
	await detail.getByRole('button', { name: T.detail.close }).click();
	await expect(detail).toBeHidden();
	await card(page, ID).getByRole('link', { name: /^Veure el detall de/ }).click();
	await expect(detail).toBeVisible();
	await expect(detail.getByRole('button', { name: T.share.customImage, exact: true })).toBeVisible();
	await expect(detail.getByRole('button', { name: T.share.customRetry })).toHaveCount(0);
});

test('una resposta tardana d’un detall anterior no allibera el nou share ni en canvia els missatges', async ({
	page
}) => {
	const { detail, custom } = await openDetail(page, { pending: [0, 1] });
	await selectFile(page, custom, {
		name: 'old-event.png',
		mimeType: 'image/png',
		buffer: Buffer.from([1])
	});
	await expect.poll(() => pendingShareCalls(page)).toEqual([0]);
	await detail.getByRole('button', { name: T.detail.close }).click();
	await card(page, 'acte-1').getByRole('link', { name: /^Veure el detall de/ }).click();
	const newDetail = detailDialog(page);
	const newCustom = newDetail.getByRole('button', { name: T.share.customImage, exact: true });
	await selectFile(page, newCustom, {
		name: 'new-event.png',
		mimeType: 'image/png',
		buffer: Buffer.from([2])
	});
	await expect.poll(() => pendingShareCalls(page)).toEqual([0, 1]);
	await settleShare(page, 0, 'NotAllowedError');
	await expect(newCustom).toBeDisabled();
	await expect(newCustom).toHaveText(T.share.customImage);
	await expect(newDetail.locator('.live')).toHaveText('');
	await settleShare(page, 1);
	await expect(newCustom).toBeEnabled();
	await expect(newDetail.locator('.live')).toHaveText('');
});

test('canvi d’esdeveniment invalida els esdeveniments tardans del selector i no roba el focus', async ({ page }) => {
	const { custom } = await openDetail(page);
	const chooserPromise = page.waitForEvent('filechooser');
	await custom.click();
	await chooserPromise;
	await page.evaluate(() => {
		/** @type {any} */ (window).__oldPicker = document.querySelector('.custom-file-input');
	});
	await detailDialog(page).getByRole('button', { name: T.detail.close }).click();
	await card(page, 'acte-1').getByRole('link', { name: /^Veure el detall de/ }).click();
	const newerDetail = detailDialog(page);
	const newClose = newerDetail.getByRole('button', { name: T.detail.close });
	await newClose.focus();
	await page.evaluate(() => {
		const old = /** @type {HTMLInputElement} */ (/** @type {any} */ (window).__oldPicker);
		old.dispatchEvent(new Event('cancel'));
		old.dispatchEvent(new Event('change', { bubbles: true }));
	});
	await expect(newClose).toBeFocused();
	expect(await shareCalls(page)).toHaveLength(0);
});

test('perdre elegibilitat invalida un picker pendent i no comparteix una selecció tardana', async ({ page }) => {
	const { detail, custom, script } = await openDetail(page);
	const eventRow = script.sheets.get('Esdeveniments').rows.find((row) => row[0] === ID);
	if (!eventRow) throw new Error(`Missing event ${ID}`);

	const chooserPromise = page.waitForEvent('filechooser');
	await custom.click();
	await chooserPromise;
	await page.evaluate(() => {
		/** @type {any} */ (window).__oldPicker = document.querySelector('.custom-file-input');
	});
	eventRow[1] = '2026-11-05';
	await detail.getByRole('button', { name: T.participate }).click();
	await expect(detail.getByRole('button', { name: T.share.customImage, exact: true })).toHaveCount(0);
	await page.evaluate(() => {
		const input = /** @type {HTMLInputElement} */ (/** @type {any} */ (window).__oldPicker);
		const data = new DataTransfer();
		data.items.add(new File(['late'], 'late.png', { type: 'image/png' }));
		input.files = data.files;
		input.dispatchEvent(new Event('change', { bubbles: true }));
	});
	expect(await shareCalls(page)).toHaveLength(0);
});

test('perdre i recuperar elegibilitat no mostra un resultat tardà i manté el busy fins a settlement', async ({
	page
}) => {
	const { detail, custom, script } = await openDetail(page, { pending: [0] });
	await selectFile(page, custom, {
		name: 'eligibility-pending.png',
		mimeType: 'image/png',
		buffer: Buffer.from([1])
	});
	await expect.poll(() => pendingShareCalls(page)).toEqual([0]);
	const eventRow = script.sheets.get('Esdeveniments').rows.find((row) => row[0] === ID);
	if (!eventRow) throw new Error(`Missing event ${ID}`);
	eventRow[1] = '2026-11-05';
	await detail.getByRole('button', { name: T.participate }).click();
	await expect(detail.getByRole('button', { name: T.share.customImage, exact: true })).toHaveCount(0);

	eventRow[1] = '2026-11-12';
	await card(page, 'acte-1')
		.getByRole('button', { name: T.participate })
		.evaluate((button) => button.click());
	const restoredCustom = detail.getByRole('button', { name: T.share.customImage, exact: true });
	await expect(restoredCustom).toBeVisible();
	await expect(restoredCustom).toBeDisabled();
	await settleShare(page, 0, 'NotAllowedError');
	await expect(restoredCustom).toBeEnabled();
	await expect(detail.locator('.live')).toHaveText('');
	await expect(detail.getByRole('button', { name: T.share.customRetry })).toHaveCount(0);
});
