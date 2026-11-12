import assert from 'node:assert/strict';
import { test } from 'node:test';
import { posterScale } from './poster-scale.js';

const s = (/** @type {number} */ name, /** @type {number} */ place) => posterScale('a'.repeat(name), 'b'.repeat(place));

test('posterScale: límits del nom a cada escaló', () => {
	assert.equal(s(17, 0), 1.9);
	assert.equal(s(18, 0), 1.5);
	assert.equal(s(40, 0), 1.5);
	assert.equal(s(41, 0), 1.15);
	assert.equal(s(70, 0), 1.15);
	assert.equal(s(71, 0), 1);
});

test('posterScale: límits del lloc a cada escaló', () => {
	assert.equal(s(5, 40), 1.9);
	assert.equal(s(5, 41), 1.5);
	assert.equal(s(5, 50), 1.5);
	assert.equal(s(5, 51), 1.15);
	assert.equal(s(5, 110), 1.15);
	assert.equal(s(5, 111), 1);
});

test('posterScale: un nom curt amb un lloc llarg cau a l’escaló que admet el lloc', () => {
	assert.equal(s(10, 45), 1.5);
	assert.equal(s(10, 100), 1.15);
});

test('posterScale: sense lloc només compta el nom', () => {
	assert.equal(posterScale('Paradeta', ''), 1.9);
});

test('posterScale: el cas de referència', () => {
	assert.equal(posterScale('Paradeta', 'Plaça Olivareta'), 1.9);
});

test('posterScale: 120 i 120 caràcters → 1, i mai menys d’1', () => {
	assert.equal(s(120, 120), 1);
	for (const name of [0, 17, 18, 40, 41, 70, 71, 120]) {
		for (const place of [0, 40, 41, 50, 51, 110, 111, 120]) assert.ok(s(name, place) >= 1);
	}
});

test('posterScale: compta la longitud de la cadena original', () => {
	assert.equal(posterScale('ß'.repeat(17), ''), 1.9);
});
