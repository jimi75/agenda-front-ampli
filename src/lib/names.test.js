import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cleanName, validateName } from './names.js';

test('accepta noms de pila i àlies amb accents, punts i guions', () => {
	for (const name of ['Núria', 'Àlex', 'Jordi M.', 'Joan-Pau', 'M·Carme', "L'Arnau", 'Pau 2']) {
		assert.deepEqual(validateName(name), { ok: true, name });
	}
});

test('recorta i col·lapsa espais', () => {
	assert.equal(cleanName('  Maria   del  Mar '), 'Maria del Mar');
	assert.deepEqual(validateName('  Eva  '), { ok: true, name: 'Eva' });
});

test('rebutja buit i espais', () => {
	assert.deepEqual(validateName(''), { ok: false, error: 'empty' });
	assert.deepEqual(validateName('   '), { ok: false, error: 'empty' });
	assert.deepEqual(validateName(undefined), { ok: false, error: 'empty' });
});

test('rebutja noms que començarien una fórmula de full de càlcul', () => {
	for (const name of ['=IMPORTDATA("x")', '+1', '-1', '@SUM(A1)', '-Joan']) {
		assert.deepEqual(validateName(name), { ok: false, error: 'invalid_name' }, name);
	}
});

test('rebutja caràcters de control, símbols i més de 30 caràcters', () => {
	assert.equal(validateName('a\u0000b').ok, false);
	assert.equal(validateName('<b>Hola</b>').ok, false);
	assert.equal(validateName('Joan\nPere').ok, true); // el salt de línia es converteix en espai
	assert.equal(validateName('a'.repeat(30)).ok, true);
	assert.equal(validateName('a'.repeat(31)).ok, false);
});
