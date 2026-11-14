// The agenda shows the 2nd to the 29th: four full weeks.
// apps-script/Code.gs (validDates_) has the same range for the drop-down of dates.
export const MONTH = Object.freeze({
	year: 2026,
	month: 11,
	name: 'novembre',
	firstDay: 2,
	lastDay: 29
});

export const TIME_ZONE = 'Europe/Madrid';

export const MAX_NAME_LENGTH = 30;

export const MAX_MANAGER_LENGTH = 60;

export const REQUEST_TIMEOUT_MS = 15000;

export const STORAGE_KEY = 'agenda-sants-montjuic-2026-11';

export const MY_SIGNUPS_KEY = 'agenda-sants-montjuic-2026-11:mine';

// The poster is drawn at exactly this size, in CSS pixels, with `pixelRatio: 1`.
export const POSTER = Object.freeze({ width: 2048, height: 1346 });
