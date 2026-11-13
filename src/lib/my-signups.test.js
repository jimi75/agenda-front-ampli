import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MY_SIGNUPS_KEY, STORAGE_KEY } from './config.js';
import { addMine, mineForEvent, readMine, removeMine } from './my-signups.js';

function memoryStorage(/** @type {Record<string, string>} */ initial = {}) {
	const data = new Map(Object.entries(initial));
	return {
		getItem: (/** @type {string} */ k) => data.get(k) ?? null,
		setItem: (/** @type {string} */ k, /** @type {string} */ v) => void data.set(k, v),
		data
	};
}

test('la clau del registre és pròpia i diferent de la còpia de l’agenda', () => {
	assert.notEqual(MY_SIGNUPS_KEY, STORAGE_KEY);
});

test('alta i lectura, amb el format {v:1, items}', () => {
	const storage = memoryStorage();
	assert.deepEqual(readMine(storage), []);
	addMine(storage, { eventId: 'a1', requestId: 'r-1', name: 'Eva' });
	assert.deepEqual(readMine(storage), [{ eventId: 'a1', requestId: 'r-1', name: 'Eva' }]);
	assert.deepEqual(JSON.parse(/** @type {string} */ (storage.data.get(MY_SIGNUPS_KEY))), {
		v: 1,
		items: [{ eventId: 'a1', requestId: 'r-1', name: 'Eva' }]
	});
});

test('JSON corrupte o d’una altra forma es llegeix com a buit i l’alta el repara', () => {
	for (const raw of ['{no json', 'null', '42', '{"v":1}', '{"v":1,"items":"x"}', '{"v":2,"items":[]}']) {
		const storage = memoryStorage({ [MY_SIGNUPS_KEY]: raw });
		assert.deepEqual(readMine(storage), [], raw);
	}
	const storage = memoryStorage({ [MY_SIGNUPS_KEY]: '{no json' });
	addMine(storage, { eventId: 'a1', requestId: 'r-1', name: 'Eva' });
	assert.equal(readMine(storage).length, 1);
});

test('storage nul o que llança, sense excepcions', () => {
	assert.deepEqual(readMine(null), []);
	assert.deepEqual(readMine(undefined), []);
	assert.doesNotThrow(() => addMine(null, { eventId: 'a1', requestId: 'r-1', name: 'Eva' }));
	assert.doesNotThrow(() => removeMine(null, 'a1', 'r-1'));
	const broken = {
		getItem: () => {
			throw new Error('denied');
		},
		setItem: () => {
			throw new Error('quota');
		}
	};
	assert.deepEqual(readMine(broken), []);
	assert.doesNotThrow(() => addMine(broken, { eventId: 'a1', requestId: 'r-1', name: 'Eva' }));
	assert.doesNotThrow(() => removeMine(broken, 'a1', 'r-1'));
	const readOnly = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
	assert.doesNotThrow(() => addMine(readOnly, { eventId: 'a1', requestId: 'r-1', name: 'Eva' }));
});

test('ignora elements d’un altre tipus o incomplets', () => {
	const storage = memoryStorage({
		[MY_SIGNUPS_KEY]: JSON.stringify({
			v: 1,
			items: [
				{ eventId: 'a1', requestId: 'r-1', name: 'Eva', extra: 'x' },
				{ eventId: 'a1', requestId: 5, name: 'Pau' },
				{ eventId: 'a1', name: 'Pau' },
				null,
				'a1',
				42
			]
		})
	});
	assert.deepEqual(readMine(storage), [{ eventId: 'a1', requestId: 'r-1', name: 'Eva' }]);
});

test('diversos registres per a un mateix esdeveniment i baixa per requestId', () => {
	const storage = memoryStorage();
	addMine(storage, { eventId: 'a1', requestId: 'r-1', name: 'Eva' });
	addMine(storage, { eventId: 'a1', requestId: 'r-2', name: 'Eva' });
	addMine(storage, { eventId: 'b2', requestId: 'r-3', name: 'Pau' });
	assert.deepEqual(mineForEvent(storage, 'a1').map((i) => i.requestId), ['r-1', 'r-2']);
	assert.deepEqual(mineForEvent(storage, 'b2').map((i) => i.requestId), ['r-3']);
	assert.deepEqual(mineForEvent(storage, 'zz'), []);

	removeMine(storage, 'a1', 'r-1');
	assert.deepEqual(readMine(storage).map((i) => i.requestId), ['r-2', 'r-3']);
	removeMine(storage, 'b2', 'r-2');
	assert.equal(readMine(storage).length, 2, 'cal que coincideixin esdeveniment i requestId');
	removeMine(storage, 'a1', 'inexistent');
	assert.equal(readMine(storage).length, 2);
});

test('amb una clau pròpia només es llegeix i s’escriu aquesta clau', () => {
	const old = { v: 1, items: [{ eventId: 'a1', requestId: 'r-0', name: 'Eva' }] };
	const storage = memoryStorage({ [MY_SIGNUPS_KEY]: JSON.stringify(old) });
	addMine(storage, { eventId: 'e1', requestId: 'r-1', name: 'Pau' }, 'k');
	assert.deepEqual(readMine(storage, 'k'), [{ eventId: 'e1', requestId: 'r-1', name: 'Pau' }]);
	assert.deepEqual(JSON.parse(/** @type {string} */ (storage.data.get(MY_SIGNUPS_KEY))), old);

	addMine(storage, { eventId: 'e1', requestId: 'r-2', name: 'Bea' }, 'k');
	assert.equal(mineForEvent(storage, 'e1', 'k').length, 2);
	assert.equal(mineForEvent(storage, 'e1').length, 0);
	removeMine(storage, 'e1', 'r-1', 'k');
	assert.deepEqual(readMine(storage, 'k').map((i) => i.requestId), ['r-2']);
	assert.deepEqual(JSON.parse(/** @type {string} */ (storage.data.get(MY_SIGNUPS_KEY))), old);
	assert.deepEqual(readMine(storage), old.items);
});
