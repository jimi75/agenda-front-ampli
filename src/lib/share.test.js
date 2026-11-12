import assert from 'node:assert/strict';
import { test } from 'node:test';
import { detailUrl, copyText, downloadFile, shareText, waLink } from './share.js';
import { T } from './texts.js';

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

test('shareText: el text del marcador de posició amb l’enllaç', () => {
	assert.equal(shareText('https://example.test/?e=a1'), T.share.text('https://example.test/?e=a1'));
	assert.ok(shareText('https://example.test/?e=a1').endsWith('https://example.test/?e=a1'));
});

test('waLink: codifica accents i l’apòstrof tipogràfic', () => {
	const text = 'Apunta’t a l’activitat aquí: https://example.test/?e=a1&x=2';
	const link = waLink(text);
	assert.ok(link.startsWith('https://wa.me/?text='));
	assert.equal(decodeURIComponent(link.slice('https://wa.me/?text='.length)), text);
	assert.ok(!/[^\x21-\x7e]/.test(link), 'només ASCII imprimible');
	assert.ok(link.includes('%E2%80%99'), 'apòstrof tipogràfic');
	assert.ok(link.includes('aqu%C3%AD'), 'accent');
	assert.ok(!link.slice('https://wa.me/?text='.length).includes('&'), 'el & de l’enllaç no trenca el paràmetre');
});

test('copyText: èxit, error i sense portaretalls', async () => {
	/** @type {string[]} */
	const copied = [];
	const ok = { clipboard: { writeText: async (/** @type {string} */ t) => void copied.push(t) } };
	assert.equal(await copyText('https://example.test/?e=a1', ok), true);
	assert.deepEqual(copied, ['https://example.test/?e=a1']);

	const failing = {
		clipboard: {
			writeText: async () => {
				throw new DOMException('denied', 'NotAllowedError');
			}
		}
	};
	assert.equal(await copyText('x', failing), false);
	assert.equal(await copyText('x', {}), false);
	assert.equal(await copyText('x', /** @type {any} */ (null)), false);
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
