// The Google script, running inside the test: the real apps-script/Code.gs against a fake sheet,
// answering the browser's requests to the script URL. No second server and no control endpoints.
import { createScript, EVENT_HEADER, SIGNUP_HEADER } from '../apps-script/fake-google.js';

export const SCRIPT_URL = 'http://localhost:5301/exec';

/** Same shape as `eventRow` in apps-script/Code.test.js. @param {string} id @param {Record<string, string>} [extra] */
const eventRow = (id, extra = {}) => {
	const base = {
		id,
		data: '2026-11-12',
		inici: '10:00',
		fi: '14:00',
		tipus: 'Acció',
		nom: 'Paradeta',
		lloc: 'Mercat de Sants',
		mapa: '',
		estat: ''
	};
	const row = /** @type {Record<string, string>} */ ({ ...base, ...extra });
	return EVENT_HEADER.map((key) => row[key]);
};

// With "today" fixed at 10 November: two open events, a cancelled one and a past one.
const seedEvents = () => [
	EVENT_HEADER,
	eventRow('accio-1', { nom: 'Paradeta al mercat' }),
	eventRow('acte-1', {
		tipus: 'Acte',
		data: '2026-11-14',
		inici: '19:00',
		fi: '21:00',
		nom: 'Xerrada oberta',
		lloc: 'Centre Cívic Cotxeres de Sants'
	}),
	eventRow('cancel-1', { data: '2026-11-16', estat: 'Cancel·lat', nom: 'Assemblea del districte' }),
	eventRow('pasat-1', { data: '2026-11-05', nom: 'Repartiment de fulletons' })
];

/**
 * @typedef {{
 *   closed?: boolean,
 *   busy?: boolean,
 *   down?: boolean,
 *   loseAnswer?: boolean,
 *   features?: string[]
 * }} ScriptOptions
 */

/**
 * Answers the requests to the script URL. The options are plain variables: a test changes them
 * on the object it passed in, and the next request sees the change.
 * @param {import('@playwright/test').Page} page
 * @param {ScriptOptions} [options]
 */
export async function installScript(page, options = {}) {
	const script = createScript({ events: seedEvents(), signups: [SIGNUP_HEADER] });

	/** @param {import('@playwright/test').Route} route @param {unknown} body */
	const answer = (route, body) =>
		route.fulfill({
			contentType: 'application/json',
			headers: { 'access-control-allow-origin': '*' },
			body: JSON.stringify(body)
		});

	await page.route(/^http:\/\/localhost:5301\/exec(\?.*)?$/, async (route) => {
		if (options.down) return route.abort();
		const request = route.request();
		if (request.method() === 'POST') {
			if (options.busy) return answer(route, { ok: false, v: 1, error: 'busy' });
			setClosed(script, options.closed);
			const result = script.post(request.postData() ?? '');
			return options.loseAnswer ? route.abort() : answer(route, result);
		}
		setClosed(script, options.closed);
		const result = script.get(Object.fromEntries(new URL(request.url()).searchParams));
		if (options.features) result.features = options.features;
		return answer(route, result);
	});

	return {
		script,
		/** Rows of `Inscripcions` without the header: [data_hora, event_id, nom, request_id]. */
		signups: () => script.sheets.get('Inscripcions')?.rows.slice(1) ?? [],
		/** Rows of `Baixes` without the header (the sheet only exists after the first unsignup). */
		baixes: () => script.sheets.get('Baixes')?.rows.slice(1) ?? []
	};
}

/** @param {ReturnType<typeof createScript>} script @param {boolean | undefined} closed */
function setClosed(script, closed) {
	const config = script.sheets.get('Config');
	if (config) config.rows[0][1] = closed ? 'NO' : 'SI';
}
