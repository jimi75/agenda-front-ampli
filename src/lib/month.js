import { MONTH, TIME_ZONE } from './config.js';

/**
 * @typedef {{ date: string, day: number, weekday: number }} Day
 * weekday: 0 = dilluns ... 6 = diumenge
 */

/** @param {number} year @param {number} month 1-12 @param {number} day */
export function isoDate(year, month, day) {
	return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * @param {number} [year]
 * @param {number} [month]
 * @returns {{ year: number, month: number, days: Day[], firstWeekday: number, rows: number }}
 */
export function buildMonth(year = MONTH.year, month = MONTH.month) {
	const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
	const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
	const days = Array.from({ length: count }, (_, i) => ({
		date: isoDate(year, month, i + 1),
		day: i + 1,
		weekday: (firstWeekday + i) % 7
	}));
	return { year, month, days, firstWeekday, rows: Math.ceil((firstWeekday + count) / 7) };
}

/** Today in the campaign time zone as YYYY-MM-DD, whatever the device time zone is. */
export function todayIso(now = new Date()) {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: TIME_ZONE,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).formatToParts(now);
	const get = (/** @type {string} */ type) => parts.find((p) => p.type === type)?.value ?? '';
	return `${get('year')}-${get('month')}-${get('day')}`;
}
