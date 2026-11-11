// The agenda shows the 2nd to the 29th only: with those days, November 2026 is exactly four
// full weeks (Monday 2 to Sunday 29), so the large-screen grid has no empty cells.
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

export const REQUEST_TIMEOUT_MS = 15000;

export const STORAGE_KEY = 'agenda-sants-montjuic-2026-11';

export const MY_SIGNUPS_KEY = 'agenda-sants-montjuic-2026-11:mine';
