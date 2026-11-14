import { MAX_COPY_AGE_MS, REQUEST_TIMEOUT_MS } from './config.js';
import { mineKey, ROOT_DISTRICT, storageKey } from './districts.js';
import { addMine, removeMine } from './my-signups.js';

/**
 * @typedef {{
 *   signupsOpen: boolean, missingColumns: string[], features: string[],
 *   events: unknown[], signups: Map<string, string[]>
 * }} Agenda
 * @typedef {Agenda & { staleSince: number | null }} LoadedAgenda
 * @typedef {{ ok: true, names: string[], requestId: string, recovered?: boolean } | { ok: false, error: string }} SignupResult
 * @typedef {{ ok: true, names: string[], removed: boolean } | { ok: false, error: string }} UnsignResult
 * @typedef {{
 *   loadAgenda: () => Promise<LoadedAgenda>,
 *   loadCopy?: () => { agenda: Agenda, at: number } | null,
 *   signup: (eventId: string, name: string, knownCount: number) => Promise<SignupResult>,
 *   unsignup: (eventId: string, requestId: string) => Promise<UnsignResult>
 * }} AgendaApi
 */

const isString = (/** @type {unknown} */ v) => typeof v === 'string';

/**
 * A district page needs `json.district` to be its slug; the root needs it absent. Otherwise the
 * answer (or the saved copy) belongs to another district, or comes from an older script.
 * @param {any} json @param {import('./districts.js').District} [district] @returns {Agenda}
 */
export function parseAgenda(json, district = ROOT_DISTRICT) {
	if (!json || json.ok !== true || json.v !== 1 || !Array.isArray(json.events)) {
		throw new Error('bad_response');
	}
	if (district === ROOT_DISTRICT ? json.district !== undefined : json.district !== district.slug) {
		throw new Error('bad_response');
	}
	const signups = new Map();
	const source = json.signups && typeof json.signups === 'object' ? json.signups : {};
	for (const [id, names] of Object.entries(source)) {
		signups.set(id, Array.isArray(names) ? names.filter(isString) : []);
	}
	const missingColumns = Array.isArray(json.missingColumns) ? json.missingColumns.filter(isString) : [];
	// An older script has no `features`: it supports none of them.
	const features = Array.isArray(json.features) ? json.features.filter(isString) : [];
	return { signupsOpen: json.signupsOpen !== false, missingColumns, features, events: json.events, signups };
}

/** localStorage can throw (private mode, embedded browsers), so every access is guarded. */
export function browserStorage() {
	try {
		return globalThis.localStorage ?? null;
	} catch {
		return null;
	}
}

/**
 * Apps Script cannot answer CORS preflights, so the POST must be a "simple" request:
 * text/plain with the JSON as a string and no custom headers.
 * @param {{
 *   url: string,
 *   district?: import('./districts.js').District,
 *   fetchFn?: typeof fetch,
 *   storage?: Pick<Storage, 'getItem' | 'setItem'> | null,
 *   now?: () => number,
 *   timeoutMs?: number,
 *   uuid?: () => string
 * }} options
 * @returns {AgendaApi}
 */
export function createApi({
	url,
	district = ROOT_DISTRICT,
	fetchFn = (...args) => globalThis.fetch(...args),
	storage = browserStorage(),
	now = () => Date.now(),
	timeoutMs = REQUEST_TIMEOUT_MS,
	uuid = () => globalThis.crypto.randomUUID()
}) {
	/** @param {string} target @param {RequestInit} init */
	async function request(target, init) {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), timeoutMs);
		try {
			const response = await fetchFn(target, { ...init, signal: controller.signal });
			if (!response.ok) throw new Error(`http_${response.status}`);
			return await response.json();
		} finally {
			clearTimeout(timer);
		}
	}

	const isRoot = district === ROOT_DISTRICT;
	const agendaUrl = isRoot ? `${url}?action=agenda` : `${url}?action=agenda&d=${encodeURIComponent(district.slug)}`;

	async function fetchAgenda() {
		const json = await request(agendaUrl, { cache: 'no-store' });
		const agenda = parseAgenda(json, district);
		try {
			storage?.setItem(storageKey(district), JSON.stringify({ at: now(), json }));
		} catch {
			// A full or blocked storage only loses the offline copy.
		}
		return agenda;
	}

	function readCopy() {
		try {
			const stored = JSON.parse(storage?.getItem(storageKey(district)) ?? 'null');
			if (stored && typeof stored.at === 'number') {
				return { agenda: parseAgenda(stored.json, district), at: /** @type {number} */ (stored.at) };
			}
		} catch {
			// Corrupt copy: behave as if there was none.
		}
		return null;
	}

	return {
		/** The stored copy, only if it is young enough to be shown before the live data arrives. */
		loadCopy() {
			const copy = readCopy();
			if (!copy || !Number.isFinite(copy.at)) return null;
			const age = now() - copy.at;
			return age < 0 || age > MAX_COPY_AGE_MS ? null : copy;
		},

		async loadAgenda() {
			try {
				return { ...(await fetchAgenda()), staleSince: null };
			} catch (error) {
				const copy = readCopy();
				if (copy) return { ...copy.agenda, staleSince: copy.at };
				throw error;
			}
		},

		async signup(eventId, name, knownCount) {
			const requestId = uuid();
			const result = await send(eventId, name, knownCount, requestId);
			if (result.ok) addMine(storage, { eventId, requestId, name }, mineKey(district));
			return result;
		},

		/**
		 * Idempotent on the server, so a network failure is not recovered: the caller just repeats it
		 * with the same requestId. The local record only goes away when the server answers ok.
		 */
		async unsignup(eventId, requestId) {
			let json;
			try {
				json = await request(url, {
					method: 'POST',
					headers: { 'Content-Type': 'text/plain;charset=utf-8' },
					body: JSON.stringify({ action: 'unsignup', eventId, requestId })
				});
			} catch {
				return { ok: false, error: 'network' };
			}
			if (json?.ok === true && Array.isArray(json.names) && typeof json.removed === 'boolean') {
				removeMine(storage, eventId, requestId, mineKey(district));
				return { ok: true, names: json.names.filter(isString), removed: json.removed };
			}
			if (json?.ok === false && isString(json.error)) return { ok: false, error: json.error };
			return { ok: false, error: 'server' };
		}
	};

	/** @param {string} eventId @param {string} name @param {number} knownCount @param {string} requestId @returns {Promise<SignupResult>} */
	async function send(eventId, name, knownCount, requestId) {
		let json;
		try {
			json = await request(url, {
				method: 'POST',
				headers: { 'Content-Type': 'text/plain;charset=utf-8' },
				body: JSON.stringify(isRoot ? { action: 'signup', eventId, name, requestId } : { action: 'signup', eventId, name, requestId, d: district.slug })
			});
		} catch {
			return recover(eventId, name, knownCount, requestId);
		}
		if (json?.ok === true && Array.isArray(json.names)) {
			return { ok: true, names: json.names.filter(isString), requestId };
		}
		if (json?.ok === false && isString(json.error)) return { ok: false, error: json.error };
		return recover(eventId, name, knownCount, requestId);
	}

	/**
	 * The POST may have reached the sheet even though the answer did not come back.
	 * Never resend blindly: read the list and check whether the name is there.
	 * @param {string} eventId @param {string} name @param {number} knownCount @param {string} requestId
	 * @returns {Promise<SignupResult>}
	 */
	async function recover(eventId, name, knownCount, requestId) {
		try {
			const names = (await fetchAgenda()).signups.get(eventId) ?? [];
			if (names.length > knownCount && names.includes(name)) {
				return { ok: true, names, requestId, recovered: true };
			}
			return { ok: false, error: 'network' };
		} catch {
			return { ok: false, error: 'unconfirmed' };
		}
	}
}
