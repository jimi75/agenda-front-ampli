import { T } from '#lib/texts.js';

/** @typedef {'unknown' | 'granted' | 'denied'} ConsentState */
/**
 * @typedef {{
 *   enabled: boolean, consent: () => ConsentState,
 *   accept: (districte: string) => void, reject: () => void,
 *   load: (districte: string) => void,
 *   track: (name: string, params?: Record<string, string>) => void
 * }} Analytics
 */
export const CONSENT_KEY = 'agenda-front-ampli:consent';
export const CONSENT_MAX_AGE_MS = 395 * 86_400_000;
/** @type {Record<string, readonly string[]>} */
export const CATALOG = {
	event_detail_view: ['activitat_id', 'activitat_tipus', 'origen'],
	map_click: ['activitat_id', 'origen'],
	signup_start: ['activitat_id', 'activitat_tipus', 'externa'],
	signup_success: ['activitat_id', 'activitat_tipus', 'externa'],
	signup_error: ['activitat_id', 'activitat_tipus', 'externa', 'error_type'],
	external_link_click: ['activitat_id'],
	unsignup: ['activitat_id', 'resultat'],
	share: ['method', 'content_type', 'item_id', 'imatge', 'resultat']
};
export const ERROR_TYPES = [...Object.keys(T.signupErrors).filter((key) => key !== 'empty'), 'exception', 'other'];
export const RESULTS = ['ok', 'error', 'shared', 'aborted', 'unsupported', 'generation_failed', 'opened', 'other'];

/** @param {Storage | null | undefined} storage @param {number} nowMs @returns {ConsentState} */
export function readConsent(storage, nowMs) {
	try {
		const value = JSON.parse(storage?.getItem(CONSENT_KEY) ?? 'null');
		if (
			value?.v === 1 && ['granted', 'denied'].includes(value.analytics) &&
			typeof value.at === 'number' && Number.isFinite(value.at) &&
			value.at <= nowMs && nowMs - value.at < CONSENT_MAX_AGE_MS
		) return value.analytics;
	} catch {
		// Unavailable storage and invalid JSON both require a new decision.
	}
	return 'unknown';
}

/** @param {Storage | null | undefined} storage @param {'granted' | 'denied'} value @param {number} nowMs */
export function writeConsent(storage, value, nowMs) {
	try {
		storage?.setItem(CONSENT_KEY, JSON.stringify({ v: 1, analytics: value, at: nowMs }));
	} catch {
		// Without storage, the decision only applies to this page.
	}
}

/** @param {string} href */
export function isAdmin(href) {
	return new URL(href).searchParams.has('admin');
}

/** @param {string} href */
export function landingLocation(href) {
	const hashAt = href.indexOf('#');
	const fragment = hashAt < 0 ? '' : href.slice(hashAt);
	const address = hashAt < 0 ? href : href.slice(0, hashAt);
	const queryAt = address.indexOf('?');
	if (queryAt < 0) return href;
	const query = address.slice(queryAt + 1).split('&').filter((part) => part.split('=')[0] !== 'ga_debug').join('&');
	return `${address.slice(0, queryAt)}${query ? `?${query}` : ''}${fragment}`;
}

/** @param {string} name @param {Record<string, string>} [params] @returns {Record<string, string>} */
export function cleanParams(name, params = {}) {
	/** @type {Record<string, string>} */
	const clean = {};
	for (const [key, original] of Object.entries(params)) {
		if (!Object.hasOwn(CATALOG, name) || !CATALOG[name].includes(key)) continue;
		let value = original;
		if (key === 'error_type' && !ERROR_TYPES.includes(value)) value = 'other';
		if (key === 'resultat' && !RESULTS.includes(value)) value = 'other';
		clean[key] = value.slice(0, 100);
	}
	return clean;
}

/**
 * @typedef {Pick<Window, 'addEventListener'> & { dataLayer?: unknown[], gtag?: (...args: unknown[]) => void }} AnalyticsWindow
 * @typedef {Pick<Document, 'title' | 'cookie'> & {
 *   createElement: (tag: 'script') => HTMLScriptElement,
 *   head: { append: (element: HTMLScriptElement) => void }
 * }} AnalyticsDocument
 * @param {{
 *   id: string, storage?: Storage | null, doc?: AnalyticsDocument, win?: AnalyticsWindow,
 *   href?: string, cookiePath?: string, dev?: boolean, now?: () => number, reload?: () => void
 * }} deps
 * @returns {Analytics}
 */
export function createAnalytics(deps) {
	if (deps.id === '') {
		return { enabled: false, consent: () => 'unknown', accept() {}, reject() {}, load() {}, track() {} };
	}
	const { id, storage, doc, win, href = '', cookiePath = '/', dev = false, now = Date.now, reload = () => {} } = deps;
	if (!doc || !win || !href) throw new Error('Analytics requires document, window and landing URL');
	const blocked = isAdmin(href);
	let loaded = false;
	let district = '';
	const consent = () => readConsent(storage, now());
	/** @param {unknown[]} args */
	const gtag = (...args) => win.gtag?.(...args);

	return {
		enabled: true,
		consent,
		accept(districte) {
			writeConsent(storage, 'granted', now());
			this.load(districte);
		},
		reject() {
			for (const name of ['_ga', `_ga_${id.slice(2)}`]) doc.cookie = `${name}=; max-age=0; path=${cookiePath}`;
			writeConsent(storage, 'denied', now());
			if (!loaded) return;
			Reflect.set(win, `ga-disable-${id}`, true);
			gtag('consent', 'update', { analytics_storage: 'denied' });
			reload();
		},
		load(districte) {
			if (blocked || loaded) return;
			loaded = true;
			district = districte;
			win.dataLayer = win.dataLayer || [];
			win.gtag = function () { win.dataLayer?.push(arguments); };
			gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
			gtag('js', new Date());
			gtag('set', { districte });
			gtag('config', id, {
				send_page_view: false, cookie_domain: 'none', cookie_path: cookiePath,
				cookie_expires: 34128000, allow_google_signals: false, allow_ad_personalization_signals: false,
				...(dev || new URL(href).searchParams.has('ga_debug') ? { debug_mode: true } : {})
			});
			const script = doc.createElement('script');
			script.async = true;
			script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
			doc.head.append(script);
			gtag('event', 'page_view', { page_location: landingLocation(href), page_title: doc.title });
			win.addEventListener('storage', (event) => {
				if (event.key === CONSENT_KEY && consent() !== 'granted') reload();
			});
			win.addEventListener('pageshow', (event) => {
				if (event.persisted && consent() !== 'granted') reload();
			});
		},
		track(name, params = {}) {
			if (blocked || !loaded) return;
			if (!Object.hasOwn(CATALOG, name)) {
				if (dev) console.warn('Analytics: unknown event', name);
				return;
			}
			if (dev && Object.keys(params).some((key) => !CATALOG[name].includes(key))) console.warn('Analytics: unknown parameter', name);
			gtag('event', name, { ...cleanParams(name, params), districte: district });
		}
	};
}
