import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApi, parseAgenda } from './api.js';
import { ROUTED_DISTRICTS } from './districts.js';
import { readMine } from './my-signups.js';

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
		signupsOpen: false,
		missingColumns: ['data', 7]
	});
	assert.deepEqual(agenda.missingColumns, ['data']);
	assert.deepEqual(parseAgenda(agendaJson()).missingColumns, [], 'una resposta antiga sense el camp també val');
	assert.equal(agenda.signupsOpen, false);
	assert.deepEqual(agenda.signups.get('a1'), ['Eva', 'Pau']);
});

test('parseAgenda: features amb i sense el camp (un script antic no en té cap)', () => {
	assert.deepEqual(parseAgenda(agendaJson()).features, []);
	assert.deepEqual(parseAgenda({ ...agendaJson(), features: ['unsignup'] }).features, ['unsignup']);
	assert.deepEqual(parseAgenda({ ...agendaJson(), features: ['unsignup', 3, null] }).features, ['unsignup']);
	assert.deepEqual(parseAgenda({ ...agendaJson(), features: 'unsignup' }).features, []);
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
	assert.deepEqual(result, { ok: true, names: ['Eva', 'Pau'], requestId: 'uuid-1' });
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
		uuid: () => 'uuid-2',
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
		requestId: 'uuid-2',
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

test('signup: desa el registre local només quan hi ha èxit, també per la via de recuperació', async () => {
	const storage = memoryStorage();
	const okApi = createApi({
		url: 'https://example.test/exec',
		storage,
		uuid: () => 'uuid-ok',
		fetchFn: /** @type {any} */ (async () => reply({ ok: true, v: 1, eventId: 'a1', names: ['Pau'] }))
	});
	assert.equal((await okApi.signup('a1', 'Pau', 0)).ok, true);
	assert.deepEqual(readMine(storage), [{ eventId: 'a1', requestId: 'uuid-ok', name: 'Pau' }]);

	const recovered = createApi({
		url: 'https://example.test/exec',
		storage,
		uuid: () => 'uuid-rec',
		fetchFn: /** @type {any} */ (
			async (/** @type {string} */ _url, /** @type {RequestInit} */ init) => {
				if (init.method === 'POST') throw new TypeError('Failed to fetch');
				return reply(agendaJson({ a1: ['Pau', 'Eva'] }));
			}
		)
	});
	const result = await recovered.signup('b2', 'Eva', 0);
	assert.deepEqual(result, { ok: false, error: 'network' }, 'el nom no és a la llista de b2');
	assert.equal(readMine(storage).length, 1, 'sense èxit no es desa res');
	const second = await recovered.signup('a1', 'Eva', 1);
	assert.deepEqual(second, { ok: true, names: ['Pau', 'Eva'], requestId: 'uuid-rec', recovered: true });
	assert.deepEqual(
		readMine(storage).map((i) => [i.eventId, i.requestId, i.name]),
		[
			['a1', 'uuid-ok', 'Pau'],
			['a1', 'uuid-rec', 'Eva']
		]
	);
});

test('signup: un error del servidor, de xarxa o sense confirmar no desa cap registre', async () => {
	const storage = memoryStorage();
	const server = createApi({
		url: 'https://example.test/exec',
		storage,
		fetchFn: /** @type {any} */ (async () => reply({ ok: false, v: 1, error: 'event_full' }))
	});
	assert.deepEqual(await server.signup('a1', 'Pau', 0), { ok: false, error: 'event_full' });
	const offline = createApi({
		url: 'https://example.test/exec',
		storage,
		fetchFn: /** @type {any} */ (async () => {
			throw new TypeError('Failed to fetch');
		})
	});
	assert.deepEqual(await offline.signup('a1', 'Pau', 0), { ok: false, error: 'unconfirmed' });
	assert.deepEqual(readMine(storage), []);
});

/** A storage that already has two records of a1 and one of b2. */
function storageWithRecords() {
	const storage = memoryStorage();
	storage.setItem(
		'agenda-sants-montjuic-2026-11:mine',
		JSON.stringify({
			v: 1,
			items: [
				{ eventId: 'a1', requestId: 'req-pau-0001', name: 'Pau' },
				{ eventId: 'a1', requestId: 'req-pau-0002', name: 'Pau' },
				{ eventId: 'b2', requestId: 'req-eva-0003', name: 'Eva' }
			]
		})
	);
	return storage;
}
const recordIds = (/** @type {ReturnType<typeof memoryStorage>} */ storage) => readMine(storage).map((i) => i.requestId);

test('unsignup: POST simple (text/plain, sense altres capçaleres) i quin cos envia', async () => {
	/** @type {any} */
	let sent;
	/** @type {string} */
	let target = '';
	const api = createApi({
		url: 'https://example.test/exec',
		storage: storageWithRecords(),
		fetchFn: /** @type {any} */ (
			async (/** @type {string} */ url, /** @type {RequestInit} */ init) => {
				target = url;
				sent = init;
				return reply({ ok: true, v: 1, eventId: 'a1', names: ['Pau'], removed: true });
			}
		)
	});
	await api.unsignup('a1', 'req-pau-0001');
	assert.equal(target, 'https://example.test/exec');
	assert.equal(sent.method, 'POST');
	assert.deepEqual(Object.keys(sent.headers), ['Content-Type']);
	assert.equal(sent.headers['Content-Type'], 'text/plain;charset=utf-8');
	assert.deepEqual(JSON.parse(sent.body), { action: 'unsignup', eventId: 'a1', requestId: 'req-pau-0001' });
});

test('unsignup: removed true i removed false treuen el registre local i tornen els noms', async () => {
	const storage = storageWithRecords();
	const answers = [
		{ ok: true, v: 1, eventId: 'a1', names: ['Pau'], removed: true },
		{ ok: true, v: 1, eventId: 'a1', names: [], removed: false }
	];
	const api = createApi({
		url: 'https://example.test/exec',
		storage,
		fetchFn: /** @type {any} */ (async () => reply(answers.shift()))
	});
	assert.deepEqual(await api.unsignup('a1', 'req-pau-0001'), { ok: true, names: ['Pau'], removed: true });
	assert.deepEqual(recordIds(storage), ['req-pau-0002', 'req-eva-0003'], 'només cau el registre d’aquesta baixa');
	assert.deepEqual(await api.unsignup('a1', 'req-pau-0002'), { ok: true, names: [], removed: false });
	assert.deepEqual(recordIds(storage), ['req-eva-0003'], 'també amb removed:false (ja no hi era)');
});

test('unsignup: filtra els noms que no són text', async () => {
	const api = createApi({
		url: 'https://example.test/exec',
		storage: storageWithRecords(),
		fetchFn: /** @type {any} */ (
			async () => reply({ ok: true, v: 1, eventId: 'a1', names: ['Eva', 5, null, 'Pau'], removed: true })
		)
	});
	assert.deepEqual(await api.unsignup('a1', 'req-pau-0001'), { ok: true, names: ['Eva', 'Pau'], removed: true });
});

test('unsignup: un error del servidor es transmet tal qual i el registre es conserva', async () => {
	for (const error of ['busy', 'server', 'bad_request']) {
		const storage = storageWithRecords();
		const api = createApi({
			url: 'https://example.test/exec',
			storage,
			fetchFn: /** @type {any} */ (async () => reply({ ok: false, v: 1, error }))
		});
		assert.deepEqual(await api.unsignup('a1', 'req-pau-0001'), { ok: false, error });
		assert.equal(readMine(storage).length, 3, error);
	}
});

test('unsignup: xarxa caiguda, HTTP no 200, JSON il·legible o timeout donen network i conserven el registre', async () => {
	const failures = {
		fetch: async () => {
			throw new TypeError('Failed to fetch');
		},
		http: async () => reply({}, false),
		json: async () => ({
			ok: true,
			json: async () => {
				throw new SyntaxError('Unexpected token <');
			}
		}),
		timeout: (/** @type {string} */ _url, /** @type {RequestInit} */ init) =>
			new Promise((_resolve, reject) => {
				init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
			})
	};
	for (const [label, fetchFn] of Object.entries(failures)) {
		const storage = storageWithRecords();
		let posts = 0;
		const api = createApi({
			url: 'https://example.test/exec',
			storage,
			timeoutMs: 20,
			fetchFn: /** @type {any} */ (
				(/** @type {string} */ url, /** @type {RequestInit} */ init) => (posts++, fetchFn(url, init))
			)
		});
		assert.deepEqual(await api.unsignup('a1', 'req-pau-0001'), { ok: false, error: 'network' }, label);
		assert.equal(readMine(storage).length, 3, label);
		assert.equal(posts, 1, `${label}: sense recover, no es llegeix l’agenda ni es reenvia`);
	}
});

test('unsignup: una resposta amb una forma que no és del contracte és server i conserva el registre', async () => {
	const shapes = [
		null,
		'text',
		{},
		{ ok: true },
		{ ok: true, names: 'Pau', removed: true },
		{ ok: true, names: ['Pau'] },
		{ ok: true, names: ['Pau'], removed: 'true' },
		{ ok: false },
		{ ok: false, error: 7 }
	];
	for (const shape of shapes) {
		const storage = storageWithRecords();
		const api = createApi({
			url: 'https://example.test/exec',
			storage,
			fetchFn: /** @type {any} */ (async () => reply(shape))
		});
		assert.deepEqual(await api.unsignup('a1', 'req-pau-0001'), { ok: false, error: 'server' }, JSON.stringify(shape));
		assert.equal(readMine(storage).length, 3, JSON.stringify(shape));
	}
});

test('unsignup: sense storage també respon (no hi ha registre per treure)', async () => {
	const api = createApi({
		url: 'https://example.test/exec',
		storage: null,
		fetchFn: /** @type {any} */ (async () => reply({ ok: true, v: 1, eventId: 'a1', names: [], removed: false }))
	});
	assert.deepEqual(await api.unsignup('a1', 'req-pau-0001'), { ok: true, names: [], removed: false });
});

// ---- districts ----

const EIXAMPLE = ROUTED_DISTRICTS[0];
const eixampleJson = () => ({ ...agendaJson(), district: 'eixample' });

test('Eixample afegeix &d=eixample al GET i desa la còpia amb la seva clau', async () => {
	const storage = memoryStorage();
	/** @type {string[]} */
	const urls = [];
	const api = createApi({
		url: 'https://example.test/exec',
		district: EIXAMPLE,
		storage,
		fetchFn: /** @type {any} */ ((/** @type {string} */ url) => (urls.push(url), Promise.resolve(reply(eixampleJson()))))
	});
	await api.loadAgenda();
	assert.deepEqual(urls, ['https://example.test/exec?action=agenda&d=eixample']);
	assert.ok(storage.getItem('agenda-eixample-2026-11'));
	assert.equal(storage.getItem('agenda-sants-montjuic-2026-11'), null);
});

test('el POST de signup d’Eixample porta d i el de Sants no', async () => {
	/** @type {any[]} */
	const bodies = [];
	const fetchFn = /** @type {any} */ (
		async (/** @type {string} */ _url, /** @type {RequestInit} */ init) => (
			bodies.push(JSON.parse(/** @type {string} */ (init.body))), reply({ ok: true, names: ['Eva'] })
		)
	);
	const storage = memoryStorage();
	await createApi({ url: 'u', district: EIXAMPLE, storage, fetchFn, uuid: () => 'req-1' }).signup('eix-a', 'Eva', 0);
	await createApi({ url: 'u', storage, fetchFn, uuid: () => 'req-2' }).signup('a1', 'Eva', 0);
	assert.equal(bodies[0].d, 'eixample');
	assert.ok(!('d' in bodies[1]));
	assert.equal(readMine(storage, 'agenda-eixample-2026-11:mine').length, 1);
	assert.equal(readMine(storage).length, 1);
});

test('parseAgenda: la raíz rebutja district i Eixample exigeix el seu', () => {
	assert.throws(() => parseAgenda(eixampleJson()), /bad_response/);
	assert.doesNotThrow(() => parseAgenda(agendaJson()));
	assert.throws(() => parseAgenda(agendaJson(), EIXAMPLE), /bad_response/);
	assert.throws(() => parseAgenda({ ...agendaJson(), district: 'altre' }, EIXAMPLE), /bad_response/);
	assert.doesNotThrow(() => parseAgenda(eixampleJson(), EIXAMPLE));
});

test('Eixample amb un script antic (sense district) falla i no mostra la còpia de Sants', async () => {
	const storage = memoryStorage();
	storage.setItem('agenda-sants-montjuic-2026-11', JSON.stringify({ at: 1, json: agendaJson() }));
	const api = createApi({
		url: 'u',
		district: EIXAMPLE,
		storage,
		fetchFn: /** @type {any} */ (async () => reply(agendaJson()))
	});
	await assert.rejects(api.loadAgenda(), /bad_response/);
});

test('loadCopy: només torna una còpia vàlida i prou jove', async () => {
	const storage = memoryStorage();
	let time = 1_000_000;
	const api = createApi({
		url: 'https://example.test/exec',
		storage,
		now: () => time,
		fetchFn: /** @type {any} */ (async () => reply(agendaJson({ a1: ['Eva'] })))
	});
	assert.equal(api.loadCopy?.(), null, 'sense còpia');
	await api.loadAgenda();
	const key = 'agenda-sants-montjuic-2026-11';
	assert.deepEqual(api.loadCopy?.()?.agenda.signups.get('a1'), ['Eva']);
	assert.equal(api.loadCopy?.()?.at, 1_000_000);

	time += 3_600_000;
	assert.ok(api.loadCopy?.(), 'just al límit encara val');
	time += 1;
	assert.equal(api.loadCopy?.(), null, 'passada una hora ja no es mostra primer');

	time = 999_999;
	assert.equal(api.loadCopy?.(), null, 'una còpia del futur no val');

	time = 1_000_000;
	storage.setItem(key, '{no és json');
	assert.equal(api.loadCopy?.(), null, 'còpia corrompuda');
	storage.setItem(key, JSON.stringify({ json: agendaJson() }));
	assert.equal(api.loadCopy?.(), null, 'sense at');
	storage.setItem(key, JSON.stringify({ at: 'ahir', json: agendaJson() }));
	assert.equal(api.loadCopy?.(), null, 'at que no és un número');
});
