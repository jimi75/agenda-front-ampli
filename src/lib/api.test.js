import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApi, parseAgenda } from './api.js';

const agendaJson = (/** @type {Record<string, string[]>} */ signups = {}) => ({
	ok: true,
	v: 1,
	signupsOpen: true,
	events: [{ id: 'a1' }],
	signups
});

const reply = (/** @type {unknown} */ body, ok = true) => ({ ok, json: async () => body });

function memoryStorage() {
	const data = new Map();
	return {
		getItem: (/** @type {string} */ k) => data.get(k) ?? null,
		setItem: (/** @type {string} */ k, /** @type {string} */ v) => void data.set(k, v)
	};
}

test('parseAgenda valida la forma de la resposta', () => {
	assert.throws(() => parseAgenda(null));
	assert.throws(() => parseAgenda({ ok: false }));
	assert.throws(() => parseAgenda({ ok: true, v: 2, events: [] }));
	assert.throws(() => parseAgenda({ ok: true, v: 1 }));
	const agenda = parseAgenda({
		...agendaJson({ a1: /** @type {any} */ (['Eva', 5, 'Pau']) }),
		signupsOpen: false
	});
	assert.equal(agenda.signupsOpen, false);
	assert.deepEqual(agenda.signups.get('a1'), ['Eva', 'Pau']);
});

test('loadAgenda: demana ?action=agenda i desa una còpia', async () => {
	const storage = memoryStorage();
	/** @type {string[]} */
	const urls = [];
	const api = createApi({
		url: 'https://example.test/exec',
		storage,
		fetchFn: /** @type {any} */ (
			async (/** @type {string} */ url) => (urls.push(url), reply(agendaJson({ a1: ['Eva'] })))
		)
	});
	const agenda = await api.loadAgenda();
	assert.deepEqual(urls, ['https://example.test/exec?action=agenda']);
	assert.equal(agenda.staleSince, null);
	assert.deepEqual(agenda.signups.get('a1'), ['Eva']);
	assert.ok(storage.getItem('agenda-sants-montjuic-2026-11'));
});

test('loadAgenda: si falla, usa la còpia i diu des de quan és', async () => {
	const storage = memoryStorage();
	let fail = false;
	const api = createApi({
		url: 'https://example.test/exec',
		storage,
		now: () => 1000,
		fetchFn: /** @type {any} */ (
			async () => {
				if (fail) throw new TypeError('Failed to fetch');
				return reply(agendaJson());
			}
		)
	});
	await api.loadAgenda();
	fail = true;
	const agenda = await api.loadAgenda();
	assert.equal(agenda.staleSince, 1000);
});

test('loadAgenda: sense còpia, l’error es propaga (no es pinta com a buit)', async () => {
	const api = createApi({
		url: 'https://example.test/exec',
		storage: memoryStorage(),
		fetchFn: /** @type {any} */ (async () => reply({}, false))
	});
	await assert.rejects(() => api.loadAgenda());
});

test('loadAgenda: una còpia corrompuda es tracta com si no n’hi hagués', async () => {
	const storage = memoryStorage();
	storage.setItem('agenda-sants-montjuic-2026-11', '{no json');
	const api = createApi({
		url: 'https://example.test/exec',
		storage,
		fetchFn: /** @type {any} */ (async () => {
			throw new TypeError('Failed to fetch');
		})
	});
	await assert.rejects(() => api.loadAgenda());
});

test('loadAgenda: el timeout cancel·la la petició', async () => {
	const api = createApi({
		url: 'https://example.test/exec',
		storage: null,
		timeoutMs: 20,
		fetchFn: /** @type {any} */ (
			(/** @type {string} */ _url, /** @type {RequestInit} */ init) =>
				new Promise((_resolve, reject) => {
					init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
				})
		)
	});
	await assert.rejects(() => api.loadAgenda(), { name: 'AbortError' });
});

test('signup: POST simple (text/plain, sense altres capçaleres) amb requestId', async () => {
	/** @type {any} */
	let sent;
	const api = createApi({
		url: 'https://example.test/exec',
		storage: null,
		uuid: () => 'uuid-1',
		fetchFn: /** @type {any} */ (
			async (/** @type {string} */ _url, /** @type {RequestInit} */ init) => {
				sent = init;
				return reply({ ok: true, v: 1, eventId: 'a1', names: ['Eva', 'Pau'] });
			}
		)
	});
	const result = await api.signup('a1', 'Pau', 1);
	assert.deepEqual(result, { ok: true, names: ['Eva', 'Pau'] });
	assert.equal(sent.method, 'POST');
	assert.deepEqual(Object.keys(sent.headers), ['Content-Type']);
	assert.equal(sent.headers['Content-Type'], 'text/plain;charset=utf-8');
	assert.deepEqual(JSON.parse(sent.body), {
		action: 'signup',
		eventId: 'a1',
		name: 'Pau',
		requestId: 'uuid-1'
	});
});

test('signup: transmet l’error del servidor tal qual', async () => {
	const api = createApi({
		url: 'https://example.test/exec',
		storage: null,
		fetchFn: /** @type {any} */ (async () => reply({ ok: false, v: 1, error: 'event_full' }))
	});
	assert.deepEqual(await api.signup('a1', 'Pau', 0), { ok: false, error: 'event_full' });
});

test('signup: si la resposta no arriba però el nom hi és, es dona per bo (sense reenviar)', async () => {
	let posts = 0;
	const api = createApi({
		url: 'https://example.test/exec',
		storage: null,
		fetchFn: /** @type {any} */ (
			async (/** @type {string} */ _url, /** @type {RequestInit} */ init) => {
				if (init.method === 'POST') {
					posts++;
					throw new TypeError('Failed to fetch');
				}
				return reply(agendaJson({ a1: ['Eva', 'Pau'] }));
			}
		)
	});
	assert.deepEqual(await api.signup('a1', 'Pau', 1), {
		ok: true,
		names: ['Eva', 'Pau'],
		recovered: true
	});
	assert.equal(posts, 1);
});

test('signup: si la resposta no arriba i el nom no hi és, error de xarxa; si tampoc es pot llegir, no confirmat', async () => {
	const lost = createApi({
		url: 'https://example.test/exec',
		storage: null,
		fetchFn: /** @type {any} */ (
			async (/** @type {string} */ _url, /** @type {RequestInit} */ init) => {
				if (init.method === 'POST') throw new TypeError('Failed to fetch');
				return reply(agendaJson({ a1: ['Eva'] }));
			}
		)
	});
	assert.deepEqual(await lost.signup('a1', 'Pau', 1), { ok: false, error: 'network' });

	const offline = createApi({
		url: 'https://example.test/exec',
		storage: null,
		fetchFn: /** @type {any} */ (async () => {
			throw new TypeError('Failed to fetch');
		})
	});
	assert.deepEqual(await offline.signup('a1', 'Pau', 1), { ok: false, error: 'unconfirmed' });
});
