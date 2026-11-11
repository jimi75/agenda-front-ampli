import assert from 'node:assert/strict';
import { test } from 'node:test';
import { participationState } from './state.js';

const today = '2026-11-10';
const event = (/** @type {Record<string, string>} */ extra = {}) => ({
	date: '2026-11-12',
	status: '',
	...extra
});

test('un esdeveniment obert és open', () => {
	assert.equal(participationState(event(), { today, signupsOpen: true }), 'open');
	assert.equal(participationState(event({ status: 'modified' }), { today, signupsOpen: true }), 'open');
});

test('closed quan B1 és NO', () => {
	assert.equal(participationState(event(), { today, signupsOpen: false }), 'closed');
});

test('external ignora signupsOpen', () => {
	const external = event({ externalUrl: 'https://example.org/inscripcio' });
	assert.equal(participationState(external, { today, signupsOpen: true }), 'external');
	assert.equal(participationState(external, { today, signupsOpen: false }), 'external');
});

test('cancel·lat guanya a extern i a tancat', () => {
	const cancelled = event({ status: 'cancelled', externalUrl: 'https://example.org/inscripcio' });
	assert.equal(participationState(cancelled, { today, signupsOpen: true }), 'cancelled');
	assert.equal(participationState(event({ status: 'cancelled' }), { today, signupsOpen: false }), 'cancelled');
});

test('passat guanya a tot', () => {
	const past = event({ date: '2026-11-05', status: 'cancelled', externalUrl: 'https://example.org/inscripcio' });
	assert.equal(participationState(past, { today, signupsOpen: false }), 'past');
});

test('un esdeveniment d’avui no és passat', () => {
	assert.equal(participationState(event({ date: today }), { today, signupsOpen: true }), 'open');
	assert.equal(participationState(event({ date: '2026-11-09' }), { today, signupsOpen: true }), 'past');
});

test('sense el camp externalUrl (R1) no és external', () => {
	const plain = { date: '2026-11-12', status: '' };
	assert.equal(participationState(plain, { today, signupsOpen: true }), 'open');
	assert.equal(participationState(event({ externalUrl: '' }), { today, signupsOpen: true }), 'open');
});

test('abans que s’hagi establert today (cadena buida), res no és passat', () => {
	assert.equal(participationState(event(), { today: '', signupsOpen: true }), 'open');
});
