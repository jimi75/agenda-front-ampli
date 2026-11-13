import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MY_SIGNUPS_KEY, STORAGE_KEY } from './config.js';
import {
	eventsTabName,
	findDistrict,
	missingPrefix,
	mineKey,
	ROOT_DISTRICT,
	ROUTED_DISTRICTS,
	storageKey
} from './districts.js';

const all = [ROOT_DISTRICT, ...ROUTED_DISTRICTS];

test('every slug follows the slug rule and none repeats', () => {
	for (const { slug } of all) assert.match(slug, /^[a-z0-9-]{1,30}$/);
	assert.equal(new Set(all.map((d) => d.slug)).size, all.length);
});

test('the root is Sants-Montjuïc without prefix', () => {
	assert.equal(ROOT_DISTRICT.slug, 'sants-montjuic');
	assert.equal(ROOT_DISTRICT.prefix, null);
});

test('routed prefixes follow the rule and none starts another', () => {
	for (const { prefix } of ROUTED_DISTRICTS) assert.match(prefix ?? '', /^[a-z0-9]+-$/);
	for (const a of ROUTED_DISTRICTS) {
		for (const b of ROUTED_DISTRICTS) {
			if (a !== b) assert.ok(!(a.prefix ?? '').startsWith(b.prefix ?? ''), `${a.prefix} / ${b.prefix}`);
		}
	}
});

test('the root keeps the browser keys of always', () => {
	assert.equal(storageKey(ROOT_DISTRICT), STORAGE_KEY);
	assert.equal(mineKey(ROOT_DISTRICT), MY_SIGNUPS_KEY);
});

test('findDistrict only finds routed districts', () => {
	assert.equal(findDistrict('eixample'), ROUTED_DISTRICTS[0]);
	assert.equal(findDistrict('sants-montjuic'), null);
	assert.equal(findDistrict('nope'), null);
});

test('keys and tab names per district', () => {
	const eixample = ROUTED_DISTRICTS[0];
	assert.equal(storageKey(eixample), 'agenda-eixample-2026-11');
	assert.equal(mineKey(eixample), 'agenda-eixample-2026-11:mine');
	assert.equal(eventsTabName(ROOT_DISTRICT), 'Esdeveniments');
	assert.equal(eventsTabName(eixample), 'Esdeveniments eixample');
});

test('missingPrefix lists ids without the prefix; empty for the root and for no events', () => {
	const eixample = ROUTED_DISTRICTS[0];
	const events = [{ id: 'eix-a' }, { id: 'paradeta-1' }, { id: 'eix-b' }, { id: 'x' }];
	assert.deepEqual(missingPrefix(events, eixample), ['paradeta-1', 'x']);
	assert.deepEqual(missingPrefix(events, ROOT_DISTRICT), []);
	assert.deepEqual(missingPrefix([], eixample), []);
});
