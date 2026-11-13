import assert from 'node:assert/strict';
import { test } from 'node:test';
import { detailUrl, downloadFile, isImageFile, shareImage, shareText, waLink } from './share.js';

test('detailUrl: origen + ruta + ?e=, sense arrossegar ?admin ni altres paràmetres', () => {
	const location = { origin: 'https://jimi75.github.io', pathname: '/agenda-front-ampli/', search: '?admin&e=altre', hash: '#x' };
	assert.equal(detailUrl(location, 'paradeta-1'), 'https://jimi75.github.io/agenda-front-ampli/?e=paradeta-1');
});

test('detailUrl: funciona amb una ruta sense barra final i amb l’arrel', () => {
	assert.equal(
		detailUrl({ origin: 'https://example.test', pathname: '/agenda-front-ampli' }, 'a1'),
		'https://example.test/agenda-front-ampli?e=a1'
	);
	assert.equal(detailUrl({ origin: 'http://localhost:5300', pathname: '/' }, 'a1'), 'http://localhost:5300/?e=a1');
});

test('detailUrl: codifica l’id', () => {
	assert.equal(detailUrl({ origin: 'https://example.test', pathname: '/' }, 'a b&c'), 'https://example.test/?e=a%20b%26c');
});

const EVENT = {
	name: 'Paradeta al mercat',
	start: '18:30',
	end: '20:00',
	place: 'Mercat de Sants',
	externalUrl: ''
};
const DATE_LABEL = 'dijous 12 de novembre';
const DETAIL_URL = 'https://example.test/?e=a1';
const FULL_TEXT =
	'📢 *Paradeta al mercat* 📢\n\n🗓️ Dijous 12 de novembre\n⏰ 18.30h-20h\n📍 Mercat de Sants\n\n🔗 Més detalls i inscripcions: https://example.test/?e=a1';

/** @param {string} text */
function assertWellFormedShareText(text) {
	assert.ok(!text.includes('\n\n\n'), 'no hi ha més d’una línia en blanc entre blocs');
	assert.ok(!text.includes('\r'), 'no hi ha retorns de carro');
	assert.equal(text.trim(), text, 'no hi ha espais ni salts de línia als extrems');
}

test('shareText: plantilla completa amb data, hora, lloc i enllaç del detall', () => {
	const text = shareText(EVENT, DATE_LABEL, DETAIL_URL);
	assert.equal(text, FULL_TEXT);
	assertWellFormedShareText(text);
});

test('shareText: l’enllaç extern substitueix el del detall', () => {
	const text = shareText({ ...EVENT, externalUrl: 'https://example.org/inscripcio' }, DATE_LABEL, DETAIL_URL);
	assert.ok(text.endsWith('🔗 Més detalls i inscripcions: https://example.org/inscripcio'));
	assert.ok(!text.includes(DETAIL_URL));
	assertWellFormedShareText(text);
});

test('shareText: omet el lloc buit sense afegir línies en blanc', () => {
	const text = shareText({ ...EVENT, place: '' }, DATE_LABEL, DETAIL_URL);
	assert.ok(!text.includes('📍'));
	assert.equal(text, FULL_TEXT.replace('\n📍 Mercat de Sants', ''));
	assertWellFormedShareText(text);
});

test('shareText: mostra només l’hora d’inici si no hi ha hora de final', () => {
	const text = shareText({ ...EVENT, start: '23:45', end: '' }, DATE_LABEL, DETAIL_URL);
	assert.ok(text.includes('\n⏰ 23.45h\n'));
	assertWellFormedShareText(text);
});

test('shareText: omet una data buida', () => {
	const text = shareText(EVENT, '', DETAIL_URL);
	assert.ok(!text.includes('🗓️'));
	assertWellFormedShareText(text);
});

test('shareText: substitueix salts de línia dins del títol i el lloc per un espai', () => {
	const text = shareText({ ...EVENT, name: 'A\r\nB', place: 'Mercat\r\nCentral' }, DATE_LABEL, DETAIL_URL);
	assert.ok(text.includes('📢 *A B* 📢'));
	assert.ok(text.includes('📍 Mercat Central'));
	assertWellFormedShareText(text);
});

test('shareText: no escapa els asteriscs del títol', () => {
	const text = shareText({ ...EVENT, name: 'A*B' }, DATE_LABEL, DETAIL_URL);
	assert.ok(text.includes('📢 *A*B* 📢'));
	assertWellFormedShareText(text);
});

test('shareText: omet el títol buit i manté el bloc de data i el d’enllaç', () => {
	const text = shareText({ ...EVENT, name: '' }, DATE_LABEL, DETAIL_URL);
	assert.ok(!text.includes('📢'));
	assert.ok(text.startsWith('🗓️ Dijous 12 de novembre'));
	assertWellFormedShareText(text);
});

test('waLink: codifica accents sense perdre el text', () => {
	const text = FULL_TEXT;
	const link = waLink(text);
	assert.ok(link.startsWith('https://wa.me/?text='));
	assert.equal(new URL(link).searchParams.get('text'), text);
	assert.ok(!/[^\x21-\x7e]/.test(link), 'només ASCII imprimible');
	assert.ok(link.includes('M%C3%A9s'), 'accent');
	assert.ok(!link.slice('https://wa.me/?text='.length).includes('&'), 'el & de l’enllaç no trenca el paràmetre');
});

/** A document, URL and timers that record what downloadFile does. @param {boolean} supportsDownload */
function fakeEnv(supportsDownload) {
	/** @type {string[]} */
	const log = [];
	/** @type {Array<() => void>} */
	const timers = [];
	/** @type {Record<string, any>} */
	const link = {
		click: () => log.push(`click ${link.href} ${link.download}`),
		remove: () => log.push('remove')
	};
	if (supportsDownload) link.download = '';
	const env = {
		document: {
			createElement: () => link,
			body: { append: (/** @type {unknown} */ node) => log.push(node === link ? 'append' : 'append?') }
		},
		URL: {
			createObjectURL: () => 'blob:fake-1',
			revokeObjectURL: (/** @type {string} */ url) => void log.push(`revoke ${url}`)
		},
		open: (/** @type {string} */ url, /** @type {string} */ target, /** @type {string} */ features) =>
			void log.push(`open ${url} ${target} ${features}`),
		setTimeout: (/** @type {() => void} */ callback) => void timers.push(callback)
	};
	return { env: /** @type {any} */ (env), log, timers };
}

test('downloadFile: <a download> temporal sobre una URL d’objecte, revocada després', () => {
	const { env, log, timers } = fakeEnv(true);
	downloadFile(new File(['x'], 'agenda-a1.png', { type: 'image/png' }), env);
	assert.deepEqual(log, ['append', 'click blob:fake-1 agenda-a1.png', 'remove']);
	assert.equal(timers.length, 1);
	timers[0]();
	assert.equal(log.at(-1), 'revoke blob:fake-1');
});

test('downloadFile: sense suport de download obre la URL en una pestanya nova', () => {
	const { env, log, timers } = fakeEnv(false);
	downloadFile(new File(['x'], 'agenda-a1.png', { type: 'image/png' }), env);
	assert.deepEqual(log, ['open blob:fake-1 _blank noopener']);
	timers[0]();
	assert.equal(log.at(-1), 'revoke blob:fake-1');
});

const IMAGE = new File(['x'], 'agenda-a1.png', { type: 'image/png' });
const TEXT = FULL_TEXT;

/**
 * A navigator that records what `share` receives. `outcome` is what `share` does: resolve (`undefined`)
 * or reject with a DOMException of that name.
 * @param {string | undefined} [outcome] @param {{ canShare?: boolean }} [options]
 */
function fakeNav(outcome, { canShare = true } = {}) {
	/** @type {ShareData[]} */
	const calls = [];
	return {
		calls,
		nav: {
			canShare: () => canShare,
			share: async (/** @type {ShareData} */ data) => {
				calls.push(data);
				if (outcome) throw new DOMException('refused', outcome);
			}
		}
	};
}

test('shareImage: shared, i envia un sol share amb l’arxiu i el text', async () => {
	const { nav, calls } = fakeNav();
	assert.equal(await shareImage(IMAGE, TEXT, { nav }), 'shared');
	assert.equal(calls.length, 1);
	assert.deepEqual(calls[0], { files: [IMAGE], text: TEXT });
});

test('shareImage: envia els JPEG i PNG originals sense canviar-ne la identitat ni el text', async () => {
	for (const file of [
		new File(['jpeg-original-bytes'], 'original-photo.JPG', { type: 'image/jpeg' }),
		new File(['png-original-bytes'], 'poster-free.png', { type: 'image/png' })
	]) {
		const { nav, calls } = fakeNav();
		assert.equal(await shareImage(file, TEXT, { nav }), 'shared');
		const call = calls.at(0);
		assert.ok(call);
		assert.equal(call.files?.at(0), file);
		assert.equal(call.text, TEXT);
	}
});

test('isImageFile: accepta tipus image vàlids sense limitar-ne l’extensió', () => {
	for (const [name, type] of [
		['photo.bin', 'image/jpeg'],
		['photo.bin', 'IMAGE/PNG'],
		['vector.svg', 'image/svg+xml'],
		['photo.bin', 'image/vnd.microsoft.icon']
	]) {
		assert.equal(isImageFile(new File(['unchanged'], name, { type })), true, `${type} ${name}`);
	}
});

test('isImageFile: només usa les cinc extensions acordades quan falta el tipus', () => {
	for (const extension of ['jpg', 'jpeg', 'png', 'gif', 'webp']) {
		assert.equal(isImageFile(new File(['x'], `photo.${extension}`)), true, extension);
	}
	for (const name of ['photo.JPG', 'photo.JpEg', 'photo.PNG', 'photo.GIF', 'photo.WEBP']) {
		assert.equal(isImageFile(new File(['x'], name)), true, name);
	}
	for (const name of ['photo', 'photo.', 'photo.heic', 'photo.bmp', 'photo.jpg.exe']) {
		assert.equal(isImageFile(new File(['x'], name)), false, name);
	}
});

test('isImageFile: rebutja tipus no vàlids encara que el nom tingui una extensió admesa', () => {
	for (const type of ['application/octet-stream', 'text/plain', 'image/', 'image//png', ' image/png ']) {
		assert.equal(isImageFile(new File(['x'], 'photo.jpg', { type })), false, type);
	}
});

test('isImageFile: no llegeix ni modifica el fitxer', () => {
	const file = new File(['original-bytes'], 'photo.JPG');
	Object.defineProperty(file, 'arrayBuffer', {
		value: () => {
			throw new Error('arrayBuffer must not be called');
		}
	});
	const original = { name: file.name, type: file.type, size: file.size };
	assert.equal(isImageFile(file), true);
	assert.deepEqual({ name: file.name, type: file.type, size: file.size }, original);
});

test('shareImage: AbortError és aborted', async () => {
	const { nav } = fakeNav('AbortError');
	assert.equal(await shareImage(IMAGE, TEXT, { nav }), 'aborted');
});

test('shareImage: NotAllowedError és needs-second-tap', async () => {
	const { nav } = fakeNav('NotAllowedError');
	assert.equal(await shareImage(IMAGE, TEXT, { nav }), 'needs-second-tap');
});

test('shareImage: qualsevol altre error és error', async () => {
	assert.equal(await shareImage(IMAGE, TEXT, { nav: fakeNav('DataError').nav }), 'error');
	const throwsPlain = { canShare: () => true, share: async () => Promise.reject('res') };
	assert.equal(await shareImage(IMAGE, TEXT, { nav: throwsPlain }), 'error');
});

test('shareImage: unsupported si no hi ha share, sense cridar-lo', async () => {
	assert.equal(await shareImage(IMAGE, TEXT, { nav: {} }), 'unsupported');
	assert.equal(await shareImage(IMAGE, TEXT, { nav: { canShare: () => true } }), 'unsupported');
	assert.equal(await shareImage(IMAGE, TEXT, { nav: /** @type {any} */ (null) }), 'unsupported');
});

test('shareImage: unsupported si canShare no accepta l’arxiu, sense cridar share', async () => {
	const { nav, calls } = fakeNav(undefined, { canShare: false });
	assert.equal(await shareImage(IMAGE, TEXT, { nav }), 'unsupported');
	assert.equal(calls.length, 0);
	// Without canShare the files cannot be known to work: also unsupported.
	assert.equal(await shareImage(IMAGE, TEXT, { nav: { share: async () => {} } }), 'unsupported');
});

test('shareImage: errors del probe són error i no criden share, també al segon intent', async () => {
	for (const name of ['AbortError', 'NotAllowedError', 'Error']) {
		for (const second of [false, true]) {
			let shareCalls = 0;
			const nav = {
				canShare: () => {
					if (name === 'Error') throw new Error('probe failed');
					throw new DOMException('probe failed', name);
				},
				share: async () => {
					shareCalls++;
				}
			};
			assert.equal(await shareImage(IMAGE, TEXT, { nav, second }), 'error', `${name}, second=${second}`);
			assert.equal(shareCalls, 0, `${name}, second=${second}`);
		}
	}
});

test('shareImage: amb second: true, NotAllowedError és error i no un altre segon toc', async () => {
	assert.equal(await shareImage(IMAGE, TEXT, { nav: fakeNav('NotAllowedError').nav, second: true }), 'error');
	assert.equal(await shareImage(IMAGE, TEXT, { nav: fakeNav().nav, second: true }), 'shared');
	assert.equal(await shareImage(IMAGE, TEXT, { nav: fakeNav('AbortError').nav, second: true }), 'aborted');
	assert.equal(await shareImage(IMAGE, TEXT, { nav: fakeNav(undefined, { canShare: false }).nav, second: true }), 'unsupported');
});

test('shareImage: share es crida de forma síncrona, sense cap await abans (també amb second: true)', () => {
	for (const second of [false, true]) {
		const { nav, calls } = fakeNav();
		const pending = shareImage(IMAGE, TEXT, { nav, second });
		assert.equal(calls.length, 1, 'share s’ha cridat abans que la funció torni el control');
		assert.ok(pending instanceof Promise);
	}
});
