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
 * @typedef {{ year: number, month: number, firstDay?: number, lastDay?: number }} MonthRange
 * `firstDay` and `lastDay` default to the whole month.
 */

/**
 * @param {MonthRange} [range]
 * @returns {{ year: number, month: number, days: Day[], firstWeekday: number }}
 */
export function buildMonth(range = MONTH) {
	const { year, month } = range;
	const length = new Date(Date.UTC(year, month, 0)).getUTCDate();
	const firstDay = range.firstDay ?? 1;
	const lastDay = Math.min(range.lastDay ?? length, length);
	const firstWeekday = (new Date(Date.UTC(year, month - 1, firstDay)).getUTCDay() + 6) % 7;
	const days = Array.from({ length: lastDay - firstDay + 1 }, (_, i) => ({
		date: isoDate(year, month, firstDay + i),
		day: firstDay + i,
		weekday: (firstWeekday + i) % 7
	}));
	return { year, month, days, firstWeekday };
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
