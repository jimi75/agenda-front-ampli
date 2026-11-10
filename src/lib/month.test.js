import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildMonth, todayIso } from './month.js';

test('novembre 2026: 30 dies, el dia 1 és diumenge (7a columna) i hi ha 6 files', () => {
	const month = buildMonth(2026, 11);
	assert.equal(month.days.length, 30);
	assert.equal(month.days[0].date, '2026-11-01');
	assert.equal(month.firstWeekday + 1, 7);
	assert.equal(month.days[0].weekday, 6);
	assert.equal(month.days[29].date, '2026-11-30');
	assert.equal(month.days[29].weekday, 0);
	assert.equal(month.rows, 6);
});

test('un mes que comença en dilluns i té 28 dies ocupa 4 files', () => {
	const month = buildMonth(2027, 2);
	assert.equal(month.firstWeekday, 0);
	assert.equal(month.rows, 4);
});

test('todayIso usa la zona horària Europe/Madrid, no la del dispositiu', () => {
	assert.equal(todayIso(new Date('2026-11-10T23:30:00Z')), '2026-11-11');
	assert.equal(todayIso(new Date('2026-11-10T22:30:00Z')), '2026-11-10');
});
