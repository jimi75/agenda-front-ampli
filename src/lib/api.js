import { REQUEST_TIMEOUT_MS, STORAGE_KEY } from './config.js';

/**
 * @typedef {{ signupsOpen: boolean, events: unknown[], signups: Map<string, string[]> }} Agenda
 * @typedef {Agenda & { staleSince: number | null }} LoadedAgenda
 * @typedef {{ ok: true, names: string[], recovered?: boolean } | { ok: false, error: string }} SignupResult
 * @typedef {{ loadAgenda: () => Promise<LoadedAgenda>, signup: (eventId: string, name: string, knownCount: number) => Promise<SignupResult> }} AgendaApi
 */

const isString = (/** @type {unknown} */ v) => typeof v === 'string';

/** @param {any} json @returns {Agenda} */
export function parseAgenda(json) {
	if (!json || json.ok !== true || json.v !== 1 || !Array.isArray(json.events)) {
		throw new Error('bad_response');
	}
	const signups = new Map();
	const source = json.signups && typeof json.signups === 'object' ? json.signups : {};
	for (const [id, names] of Object.entries(source)) {
		signups.set(id, Array.isArray(names) ? names.filter(isString) : []);
	}
	return { signupsOpen: json.signupsOpen !== false, events: json.events, signups };
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

	async function fetchAgenda() {
		const json = await request(`${url}?action=agenda`, { cache: 'no-store' });
		const agenda = parseAgenda(json);
		try {
			storage?.setItem(STORAGE_KEY, JSON.stringify({ at: now(), json }));
		} catch {
			// A full or blocked storage only loses the offline copy.
		}
		return agenda;
	}

	function readCopy() {
		try {
			const stored = JSON.parse(storage?.getItem(STORAGE_KEY) ?? 'null');
			if (stored && typeof stored.at === 'number') {
				return { agenda: parseAgenda(stored.json), at: /** @type {number} */ (stored.at) };
			}
		} catch {
			// Corrupt copy: behave as if there was none.
		}
		return null;
	}

	return {
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
			let json;
			try {
				json = await request(url, {
					method: 'POST',
					headers: { 'Content-Type': 'text/plain;charset=utf-8' },
					body: JSON.stringify({ action: 'signup', eventId, name, requestId: uuid() })
				});
			} catch {
				return recover(eventId, name, knownCount);
			}
			if (json?.ok === true && Array.isArray(json.names)) {
				return { ok: true, names: json.names.filter(isString) };
			}
			if (json?.ok === false && isString(json.error)) return { ok: false, error: json.error };
			return recover(eventId, name, knownCount);
		}
	};

	/**
	 * The POST may have reached the sheet even though the answer did not come back.
	 * Never resend blindly: read the list and check whether the name is there.
	 * @param {string} eventId @param {string} name @param {number} knownCount
	 * @returns {Promise<SignupResult>}
	 */
	async function recover(eventId, name, knownCount) {
		try {
			const names = (await fetchAgenda()).signups.get(eventId) ?? [];
			if (names.length > knownCount && names.includes(name)) {
				return { ok: true, names, recovered: true };
			}
			return { ok: false, error: 'network' };
		} catch {
			return { ok: false, error: 'unconfirmed' };
		}
	}
}
