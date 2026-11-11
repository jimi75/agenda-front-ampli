import { validateName } from './names.js';

/** Development-only stand-in for the Apps Script, with the same contract as apps-script/Code.gs. */
const EVENTS = [
	['presentacio', '2026-11-03', '19:00', '21:00', 'Acte', 'Presentació Front Ampli', 'Plaça de Sants, Barcelona', ''],
	['paradeta-1', '2026-11-07', '10:00', '14:00', 'Acció', 'Paradeta', 'Mercat de la Bordeta, Barcelona', ''],
	['paradeta-2', '2026-11-12', '10:00', '14:00', 'Acció', 'Paradeta al mercat', 'Mercat de Sants, Barcelona', ''],
	['repartiment', '2026-11-12', '17:30', '19:00', 'Acció', 'Repartiment de fulletons', 'Plaça d’Osca, Barcelona', ''],
	['xerrada', '2026-11-12', '20:00', '22:00', 'Acte', 'Xerrada oberta amb veïnat', 'Centre Cívic Cotxeres de Sants', '', 'Marta'],
	['assemblea', '2026-11-14', '11:00', '13:00', 'Acte', 'Assemblea del districte', 'Local de l’Ateneu, Barcelona', 'Cancel·lat'],
	['enganxada', '2026-11-18', '22:00', '', 'Acció', 'Enganxada de cartells', 'Plaça d’Espanya, Barcelona', ''],
	['mati-parc', '2026-11-21', '09:30', '12:00', 'Acció', 'Esmorzar i conversa al parc', 'Parc de Joan Miró, Barcelona', '', '', 'https://example.org/inscripcio'],
	['concert', '2026-11-21', '19:00', '21:30', 'Acte', 'Concert i festa', 'Plaça del Sortidor, Barcelona', ''],
	['mitin', '2026-11-28', '18:00', '20:00', 'Acte', 'Acte central de campanya', 'Auditori de la Zona Franca', 'Modificat'],
	['tancament', '2026-11-29', '10:00', '13:00', 'Acció', 'Paradeta de tancament', 'Plaça de Sants, Barcelona', '']
];

const KEYS = ['id', 'data', 'inici', 'fi', 'tipus', 'nom', 'lloc', 'estat', 'responsable', 'inscripcio_url'];

/** @returns {import('./api.js').AgendaApi} */
export function createMockApi({ delay = 250 } = {}) {
	const wait = () => new Promise((resolve) => setTimeout(resolve, delay));
	const events = EVENTS.map((row) => Object.fromEntries(KEYS.map((key, i) => [key, row[i] ?? ''])));
	/** @type {Map<string, string[]>} */
	const signups = new Map([
		['presentacio', ['Núria', 'Jordi', 'Àlex', 'Marta', 'Pau']],
		['paradeta-2', ['Laia', 'Joan']],
		['xerrada', ['Carme', 'Biel', 'Eva']]
	]);

	return {
		async loadAgenda() {
			await wait();
			return { signupsOpen: true, missingColumns: [], features: [], events, signups: new Map(signups), staleSince: null };
		},
		async signup(eventId, name) {
			await wait();
			const valid = validateName(name);
			if (!valid.ok) return { ok: false, error: 'invalid_name' };
			if (!events.some((event) => event.id === eventId)) return { ok: false, error: 'unknown_event' };
			const names = [...(signups.get(eventId) ?? []), valid.name];
			signups.set(eventId, names);
			return { ok: true, names, requestId: globalThis.crypto.randomUUID() };
		}
	};
}
