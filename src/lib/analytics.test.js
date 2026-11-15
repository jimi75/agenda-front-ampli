import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CATALOG, CONSENT_KEY, CONSENT_MAX_AGE_MS, ERROR_TYPES, cleanParams, createAnalytics, isAdmin, landingLocation, readConsent, writeConsent } from '#lib/analytics.js';
import { T } from '#lib/texts.js';

const NOW = Date.parse('2026-11-15T12:00:00Z');

function fixture({ href = 'https://example.test/base?e=x&ga_debug&utm_source=y', dev = false } = {}) {
	const values = new Map(/** @type {[string, string][]} */ ([]));
	/** @type {Storage} */
	const storage = {
		get length() { return values.size; },
		clear: () => values.clear(),
		key: (index) => [...values.keys()][index] ?? null,
		getItem: (key) => values.get(key) ?? null,
		setItem: (key, value) => values.set(key, value),
		removeItem: (key) => values.delete(key)
	};
	const doc = {
		title: 'Agenda',
		cookies: /** @type {string[]} */ ([]),
		set cookie(/** @type {string} */ value) { this.cookies.push(value); },
		head: { children: /** @type {HTMLScriptElement[]} */ ([]), append(/** @type {HTMLScriptElement} */ el) { this.children.push(el); } },
		createElement: (/** @type {string} */ tag) => /** @type {HTMLScriptElement} */ ({ tagName: tag })
	};
	/** @typedef {{ key?: string, persisted?: boolean }} TestEvent */
	const win = {
		listeners: /** @type {Record<string, (event: TestEvent) => void>} */ ({}),
		dataLayer: /** @type {IArguments[]} */ ([]),
		addEventListener: /** @type {Window['addEventListener']} */ (function (/** @type {string} */ type, /** @type {(event: TestEvent) => void} */ fn) { win.listeners[type] = fn; }),
		'ga-disable-G-X': false
	};
	let reloads = 0;
	const analytics = createAnalytics({ id: 'G-X', storage, doc, win, href, cookiePath: '/base', dev, now: () => NOW, reload: () => reloads++ });
	return { analytics, storage, doc, win, reloads: () => reloads, entries: () => (win.dataLayer ?? []).map((entry) => Array.from(entry)) };
}

test('readConsent validates every field and expiry, including unavailable storage', () => {
	const { storage } = fixture();
	for (const value of [
		null, '{', JSON.stringify({ v: 2, analytics: 'granted', at: NOW }),
		JSON.stringify({ v: 1, analytics: 'maybe', at: NOW }),
		JSON.stringify({ v: 1, analytics: 'granted', at: NOW + 1 }),
		JSON.stringify({ v: 1, analytics: 'granted', at: NOW - 396 * 86_400_000 }),
		JSON.stringify({ v: 1, analytics: 'granted', at: NOW - CONSENT_MAX_AGE_MS }),
		JSON.stringify({ v: 1, analytics: 'granted', at: 'now' })
	]) {
		if (value === null) storage.removeItem(CONSENT_KEY);
		else storage.setItem(CONSENT_KEY, value);
		assert.equal(readConsent(storage, NOW), 'unknown');
	}
	assert.equal(readConsent(null, NOW), 'unknown');
	assert.equal(readConsent({ ...storage, getItem() { throw new Error('denied'); } }, NOW), 'unknown');
	assert.doesNotThrow(() => writeConsent({ ...storage, setItem() { throw new Error('denied'); } }, 'granted', NOW));
	for (const value of /** @type {const} */ (['granted', 'denied'])) {
		writeConsent(storage, value, NOW - 394 * 86_400_000);
		assert.equal(readConsent(storage, NOW), value);
	}
});

test('isAdmin only matches the query parameter', () => {
	assert.equal(isAdmin('https://example.test/?admin'), true);
	assert.equal(isAdmin('https://example.test/?e=x&admin=1'), true);
	assert.equal(isAdmin('https://example.test/?e=admin-1'), false);
});

test('landingLocation removes only ga_debug, retaining original encoding and fragments', () => {
	for (const query of ['?ga_debug', '?ga_debug=1']) {
		assert.equal(landingLocation(`https://example.test/${query}`), 'https://example.test/');
	}
	assert.equal(landingLocation('https://example.test/?e=x&ga_debug&utm_source=y#fragment'), 'https://example.test/?e=x&utm_source=y#fragment');
	assert.equal(landingLocation('https://example.test/?e=a%20b&admin'), 'https://example.test/?e=a%20b&admin');
	assert.equal(landingLocation('https://example.test/?ga_debug#fragment'), 'https://example.test/#fragment');
	assert.equal(landingLocation('https://example.test/#fragment'), 'https://example.test/#fragment');
});

test('cleanParams filters private fields, normalizes codes and limits values', () => {
	assert.deepEqual(cleanParams('signup_error', { activitat_id: 'a'.repeat(150), nom: 'private', request_id: 'secret', error_type: 'xyz' }), { activitat_id: 'a'.repeat(100), error_type: 'other' });
	assert.deepEqual(cleanParams('share', { resultat: 'xyz' }), { resultat: 'other' });
	assert.deepEqual(cleanParams('unknown', { nom: 'private' }), {});
	assert.deepEqual(ERROR_TYPES, [...Object.keys(T.signupErrors).filter((key) => key !== 'empty'), 'exception', 'other']);
	for (const [name, params] of Object.entries(CATALOG)) {
		assert.match(name, /^(?!ga_|google_|firebase_)[a-z][a-z0-9_]{0,39}$/);
		for (const param of params) assert.match(param, /^(?!ga_|google_|firebase_)[a-z][a-z0-9_]{0,39}$/);
	}
});

test('empty ID reads no other dependency and is entirely inactive', () => {
	const analytics = createAnalytics(new Proxy({ id: '' }, { get(target, key) {
		if (key === 'id') return target.id;
		throw new Error('must not read');
	} }));
	assert.equal(analytics.enabled, false);
	assert.equal(analytics.consent(), 'unknown');
	assert.doesNotThrow(() => { analytics.load('cap'); analytics.track('share'); analytics.accept('cap'); analytics.reject(); });
});

test('load uses official arguments objects, correct order and one script/page_view', () => {
	const f = fixture();
	f.analytics.load('eixample');
	f.analytics.load('other');
	assert.equal(f.doc.head.children.length, 1);
	assert.equal(f.doc.head.children[0].async, true);
	assert.equal(f.doc.head.children[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-X');
	for (const entry of f.win.dataLayer) assert.equal(Object.prototype.toString.call(entry), '[object Arguments]');
	const entries = f.entries();
	assert.deepEqual(entries[0], ['consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' }]);
	assert.equal(entries[1][0], 'js');
	assert.ok(entries[1][1] instanceof Date);
	assert.deepEqual(entries[2], ['set', { districte: 'eixample' }]);
	assert.deepEqual(entries[3], ['config', 'G-X', { send_page_view: false, cookie_domain: 'none', cookie_path: '/base', cookie_expires: 34128000, allow_google_signals: false, allow_ad_personalization_signals: false, debug_mode: true }]);
	assert.deepEqual(entries[4], ['event', 'page_view', { page_location: 'https://example.test/base?e=x&utm_source=y', page_title: 'Agenda' }]);
	assert.equal(entries.length, 5);
	assert.deepEqual(Object.keys(f.win.listeners), ['storage', 'pageshow']);
});

test('debug_mode is only present with ga_debug or development', () => {
	for (const dev of [false, true]) {
		const f = fixture({ href: 'https://example.test/base', dev });
		f.analytics.load('cap');
		assert.equal(f.entries()[3][2].debug_mode, dev ? true : undefined);
	}
});

test('track only sends loaded catalog events with district and filtered parameters', () => {
	const f = fixture();
	f.analytics.track('map_click', { activitat_id: 'x' });
	assert.deepEqual(f.entries(), []);
	f.analytics.accept('eixample');
	assert.equal(f.analytics.consent(), 'granted');
	f.analytics.track('map_click', { activitat_id: 'x', origen: 'card', nom: 'private' });
	assert.deepEqual(f.entries().at(-1), ['event', 'map_click', { activitat_id: 'x', origen: 'card', districte: 'eixample' }]);
	const count = f.entries().length;
	f.analytics.track('unknown', { nom: 'private' });
	assert.equal(f.entries().length, count);
});

test('admin never loads or tracks but can save consent', () => {
	const f = fixture({ href: 'https://example.test/?admin' });
	f.analytics.accept('cap');
	f.analytics.load('cap');
	f.analytics.track('map_click');
	assert.equal(f.analytics.consent(), 'granted');
	assert.equal(f.doc.head.children.length, 0);
	assert.deepEqual(f.entries(), []);
});

test('reject always deletes exactly two scoped cookies and only reloads when loaded', () => {
	for (const loaded of [false, true]) {
		const f = fixture();
		if (loaded) f.analytics.accept('eixample');
		f.analytics.reject();
		assert.deepEqual(f.doc.cookies, ['_ga=; max-age=0; path=/base', '_ga_X=; max-age=0; path=/base']);
		assert.equal(f.analytics.consent(), 'denied');
		assert.equal(f.reloads(), loaded ? 1 : 0);
		if (loaded) {
			assert.equal(f.win['ga-disable-G-X'], true);
			assert.deepEqual(f.entries().at(-1), ['consent', 'update', { analytics_storage: 'denied' }]);
		}
	}
});

test('storage and persisted pageshow reload only when consent is no longer granted', () => {
	const f = fixture();
	f.analytics.accept('cap');
	f.win.listeners.storage({ key: CONSENT_KEY });
	assert.equal(f.reloads(), 0);
	writeConsent(f.storage, 'denied', NOW);
	f.win.listeners.storage({ key: 'other' });
	f.win.listeners.pageshow({ persisted: false });
	assert.equal(f.reloads(), 0);
	f.win.listeners.storage({ key: CONSENT_KEY });
	f.win.listeners.pageshow({ persisted: true });
	assert.equal(f.reloads(), 2);
});
