import { MAX_MANAGER_LENGTH, MONTH } from './config.js';

/**
 * @typedef {'accio' | 'acte'} EventType
 * @typedef {{
 *   id: string, date: string, start: string, end: string, type: EventType,
 *   name: string, place: string, mapUrl: string, status: '' | 'cancelled' | 'modified', order: number,
 *   manager: string, externalUrl: string
 * }} AgendaEvent
 * @typedef {{ row: number, reason: string }} SkippedRow
 */

export const ID_RE = /^[a-z0-9-]{1,20}$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_TEXT = 120;

/** @param {unknown} value */
function plain(value) {
	return String(value ?? '').trim();
}

/** Lowercase without accents, so "Acció", "accio" and "ACCIO" compare equal. */
function fold(/** @type {unknown} */ value) {
	return plain(value).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** @param {unknown} value @returns {EventType} */
export function parseType(value) {
	const type = fold(value);
	return type.startsWith('acte') || type.startsWith('acto') ? 'acte' : 'accio';
}

/** @param {unknown} value @returns {'' | 'cancelled' | 'modified'} */
export function parseStatus(value) {
	const status = fold(value);
	if (status.startsWith('cancel')) return 'cancelled';
	if (status.startsWith('modif')) return 'modified';
	return '';
}

/** The value when it is an https:// link without spaces, and an empty string otherwise. @param {unknown} value */
export function httpsUrl(value) {
	const url = plain(value);
	return /^https:\/\/\S+$/i.test(url) ? url : '';
}

/** @param {string} place @param {unknown} custom */
export function mapsUrl(place, custom) {
	const url = httpsUrl(custom);
	if (url) return url;
	if (!place) return '';
	return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
}

/** The event id of a `?e=<id>` link, or null when it is absent or not a valid id. @param {string} search */
export function parseEventParam(search) {
	const id = new URLSearchParams(search).get('e');
	return id !== null && ID_RE.test(id) ? id : null;
}

/** @param {string} date @param {import('./month.js').MonthRange} month */
function isDateInMonth(date, month) {
	const match = DATE_RE.exec(date);
	if (!match) return false;
	const [year, mon, day] = match.slice(1).map(Number);
	const check = new Date(Date.UTC(year, mon - 1, day));
	return (
		year === month.year &&
		mon === month.month &&
		day >= (month.firstDay ?? 1) &&
		day <= (month.lastDay ?? 31) &&
		check.getUTCFullYear() === year &&
		check.getUTCMonth() === mon - 1 &&
		check.getUTCDate() === day
	);
}

/** "10:00" -> "10h", "18:30" -> "18.30h" */
export function formatHour(/** @type {string} */ time) {
	const [hours, minutes] = time.split(':');
	return minutes === '00' ? `${Number(hours)}h` : `${Number(hours)}.${minutes}h`;
}

export function formatRange(/** @type {string} */ start, /** @type {string} */ end) {
	return end ? `${formatHour(start)}-${formatHour(end)}` : formatHour(start);
}

/** @param {string} a @param {string} b */
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Turns raw sheet rows into valid events. Invalid rows are skipped and reported,
 * never thrown, so one typo in the sheet cannot blank the whole agenda.
 * @param {unknown} rows
 * @param {import('./month.js').MonthRange} [month]
 * @returns {{ events: AgendaEvent[], skipped: SkippedRow[] }}
 */
export function normalizeEvents(rows, month = MONTH) {
	/** @type {AgendaEvent[]} */
	const events = [];
	/** @type {SkippedRow[]} */
	const skipped = [];
	const seen = new Set();

	(Array.isArray(rows) ? rows : []).forEach((raw, index) => {
		const r = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {};
		const row = Number(r.row) > 0 ? Number(r.row) : index + 2; // sheet row: header is row 1
		const id = plain(r.id);
		const date = plain(r.data);
		const start = plain(r.inici);
		const name = plain(r.nom).slice(0, MAX_TEXT);

		let reason = '';
		if (!ID_RE.test(id)) reason = 'id no vàlid';
		else if (seen.has(id)) reason = 'id repetit';
		else if (!date) reason = 'falta la data';
		else if (!isDateInMonth(date, month)) {
			const from = month.firstDay ?? 1;
			const to = month.lastDay ?? 31;
			reason = `data fora de l’agenda (del ${from} al ${to}) o amb format incorrecte`;
		} else if (!TIME_RE.test(start)) reason = 'hora d’inici no vàlida';
		else if (!name) reason = 'falta el nom';
		if (reason) {
			skipped.push({ row, reason });
			return;
		}
		seen.add(id);

		const endRaw = plain(r.fi);
		const end = TIME_RE.test(endRaw) && endRaw > start ? endRaw : '';
		const place = plain(r.lloc).slice(0, MAX_TEXT);
		events.push({
			id,
			date,
			start,
			end,
			type: parseType(r.tipus),
			name,
			place,
			mapUrl: mapsUrl(place, r.mapa),
			status: parseStatus(r.estat),
			order: index,
			manager: plain(r.responsable).slice(0, MAX_MANAGER_LENGTH),
			externalUrl: httpsUrl(r.inscripcio_url)
		});
	});

	events.sort(
		(a, b) =>
			cmp(a.date, b.date) || cmp(a.start, b.start) || cmp(a.end, b.end) || a.order - b.order
	);
	return { events, skipped };
}

/** @param {AgendaEvent[]} events @returns {Map<string, AgendaEvent[]>} */
export function groupByDate(events) {
	const groups = new Map();
	for (const event of events) {
		const list = groups.get(event.date);
		if (list) list.push(event);
		else groups.set(event.date, [event]);
	}
	return groups;
}
