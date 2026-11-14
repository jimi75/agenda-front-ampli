import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildMonth, todayIso } from './month.js';

test('agenda de novembre 2026: del 2 (dilluns) al 29 (diumenge), 28 dies i 4 setmanes completes', () => {
	const month = buildMonth();
	assert.equal(month.days.length, 28);
	assert.equal(month.days[0].date, '2026-11-02');
	assert.equal(month.days[0].weekday, 0);
	assert.equal(month.firstWeekday, 0);
	assert.equal(month.days[27].date, '2026-11-29');
	assert.equal(month.days[27].weekday, 6);
	assert.equal(month.days.length % 7, 0, 'quatre setmanes completes');
	assert.ok(!month.days.some((d) => d.date === '2026-11-01' || d.date === '2026-11-30'));
});

test('sense límits, buildMonth dona el mes sencer (novembre 2026: 30 dies, el dia 1 és diumenge)', () => {
	const month = buildMonth({ year: 2026, month: 11 });
	assert.equal(month.days.length, 30);
	assert.equal(month.days[0].date, '2026-11-01');
	assert.equal(month.days[0].weekday, 6);
	assert.equal(month.days[29].date, '2026-11-30');
	assert.equal(month.days[29].weekday, 0);
});

test('un mes que comença en dilluns i té 28 dies: firstWeekday és 0', () => {
	const month = buildMonth({ year: 2027, month: 2 });
	assert.equal(month.firstWeekday, 0);
});

test('lastDay més enllà del final del mes es retalla', () => {
	assert.equal(buildMonth({ year: 2026, month: 11, firstDay: 25, lastDay: 99 }).days.length, 6);
});

test('todayIso usa la zona horària Europe/Madrid, no la del dispositiu', () => {
	assert.equal(todayIso(new Date('2026-11-10T23:30:00Z')), '2026-11-11');
	assert.equal(todayIso(new Date('2026-11-10T22:30:00Z')), '2026-11-10');
});
