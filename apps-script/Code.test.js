import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createScript, EVENT_HEADER, SIGNUP_HEADER } from './fake-google.js';

const eventRow = (id, extra = {}) => {
	const base = { id, data: '2026-11-12', inici: '10:00', fi: '14:00', tipus: 'Acció', nom: 'Paradeta', lloc: 'Sants', mapa: '', estat: '' };
	return EVENT_HEADER.map((key) => ({ ...base, ...extra })[key]);
};

const setup = (options = {}) =>
	createScript({
		events: [EVENT_HEADER, eventRow('a1'), eventRow('b2', { data: '2026-11-14' })],
		signups: [SIGNUP_HEADER, ['2026-11-01T10:00:00', 'a1', 'Eva', 'req-00000001']],
		...options
	});

let counter = 0;
const request = (eventId, name, extra = {}) => ({
	action: 'signup',
	eventId,
	name,
	requestId: `req-${String(++counter).padStart(8, '0')}`,
	...extra
});

test('doGet: events, row numbers, sign-ups grouped by event and the open switch', () => {
	const script = setup();
	const agenda = script.get({ action: 'agenda' });
	assert.equal(agenda.ok, true);
	assert.equal(agenda.v, 1);
	assert.equal(agenda.signupsOpen, true);
	assert.deepEqual(agenda.events.map((e) => [e.id, e.row, e.data]), [['a1', 2, '2026-11-12'], ['b2', 3, '2026-11-14']]);
	assert.deepEqual(agenda.signups, { a1: ['Eva'] });
});

test('doGet: sign-ups of events that do not exist are not published', () => {
	const script = setup({ signups: [SIGNUP_HEADER, ['x', 'ghost', 'Fantasma', 'req-00000009']] });
	assert.deepEqual(script.get({ action: 'agenda' }).signups, {});
});

test('doGet: anything but action=agenda is a bad request', () => {
	const script = setup();
	assert.deepEqual(script.get({}), { ok: false, v: 1, error: 'bad_request' });
	assert.deepEqual(script.get({ action: 'dump' }), { ok: false, v: 1, error: 'bad_request' });
});

test('doGet: dates and times that Sheets converted are given back as YYYY-MM-DD and HH:MM', () => {
	const script = setup({
		events: [
			EVENT_HEADER,
			eventRow('a1', {
				data: new Date('2026-11-13T23:00:00Z'), // 14/11/2026 00:00 in Madrid
				inici: new Date('2026-11-14T08:00:00Z'), // 09:00 in Madrid
				fi: new Date('2026-11-14T10:30:00Z') // 11:30 in Madrid
			})
		]
	});
	const [event] = script.get({ action: 'agenda' }).events;
	assert.equal(event.data, '2026-11-14');
	assert.equal(event.inici, '09:00');
	assert.equal(event.fi, '11:30');
});

test('doGet: columns are read by header name, in any order, and empty rows are skipped', () => {
	const header = ['nom', 'id', 'estat', 'inici', 'data'];
	const script = setup({
		events: [header, ['Paradeta', 'a1', '', '10:00', '2026-11-12'], ['', '', '', '', ''], ['Acte', 'b2', 'Modificat', '19:00', '2026-11-13']]
	});
	const events = script.get({ action: 'agenda' }).events;
	assert.deepEqual(events.map((e) => [e.id, e.nom, e.estat, e.row]), [['a1', 'Paradeta', '', 2], ['b2', 'Acte', 'Modificat', 4]]);
});

test('doGet: the switch Config!B1 = NO closes sign-ups', () => {
	assert.equal(setup({ config: 'NO' }).get({ action: 'agenda' }).signupsOpen, false);
	assert.equal(setup({ config: ' no ' }).get({ action: 'agenda' }).signupsOpen, false);
	assert.equal(setup({ config: null }).get({ action: 'agenda' }).signupsOpen, true);
});

test('doPost: stores the name with a server timestamp and answers with the updated list', () => {
	const script = setup();
	const answer = script.post(request('a1', '  Núria   Pons '));
	assert.deepEqual(answer, { ok: true, v: 1, eventId: 'a1', names: ['Eva', 'Núria Pons'] });
	const row = script.sheets.get('Inscripcions').rows.at(-1);
	assert.match(row[0], /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
	assert.equal(row[0], '2026-11-10T10:30:00'); // 09:30Z in Madrid (CET)
	assert.deepEqual(row.slice(1, 3), ['a1', 'Núria Pons']);
	assert.equal(script.state.lockReleased, 1);
});

test('doPost: duplicate names are allowed and counted (different requests)', () => {
	const script = setup();
	script.post(request('a1', 'Eva'));
	const answer = script.post(request('a1', 'Eva'));
	assert.deepEqual(answer.names, ['Eva', 'Eva', 'Eva']);
});

test('doPost: the same requestId is written once (lost answer, request sent again)', () => {
	const script = setup();
	const body = request('a1', 'Pau');
	const first = script.post(body);
	const second = script.post(body);
	assert.deepEqual(first.names, ['Eva', 'Pau']);
	assert.deepEqual(second.names, ['Eva', 'Pau']);
	assert.equal(script.sheets.get('Inscripcions').rows.length, 3);
});

test('doPost: names that could be formulas, symbols or too long are rejected and nothing is written', () => {
	const script = setup();
	for (const name of ['=IMPORTDATA("http://x")', '+34123', '-1', '@SUM(A1)', '<script>', '', '   ', 'a'.repeat(31), 'a\u0000b', undefined, 42, {}]) {
		const answer = script.post(request('a1', name));
		assert.deepEqual(answer, { ok: false, v: 1, error: 'invalid_name' }, String(name));
	}
	assert.equal(script.sheets.get('Inscripcions').rows.length, 2);
	assert.equal(script.state.lockAttempts, 0, 'invalid input is rejected before taking the lock');
});

test('doPost: a name starting with a digit or accent is fine; a formula can never be stored as formula', () => {
	const script = setup();
	assert.equal(script.post(request('a1', 'Àlex 2')).ok, true);
	const stored = script.sheets.get('Inscripcions').rows.flat();
	assert.ok(stored.every((cell) => typeof cell === 'string'));
});

test('doPost: unknown event, bad JSON, wrong action and bad requestId', () => {
	const script = setup();
	assert.deepEqual(script.post(request('nope', 'Eva')), { ok: false, v: 1, error: 'unknown_event' });
	assert.equal(script.post('{no json').error, 'bad_request');
	assert.equal(script.post({ action: 'delete', eventId: 'a1' }).error, 'bad_request');
	assert.equal(script.post(request('a1', 'Eva', { requestId: 'x' })).error, 'bad_request');
	assert.equal(script.post(request('a1', 'Eva', { requestId: undefined })).error, 'bad_request');
	assert.equal(script.post(request('', 'Eva')).error, 'bad_request');
	assert.equal(script.post('x'.repeat(2001)).error, 'bad_request');
	assert.equal(script.sheets.get('Inscripcions').rows.length, 2);
});

test('doPost: closed switch', () => {
	const script = setup({ config: 'NO' });
	assert.deepEqual(script.post(request('a1', 'Eva')), { ok: false, v: 1, error: 'closed' });
	assert.equal(script.sheets.get('Inscripcions').rows.length, 2);
	assert.equal(script.state.lockReleased, 1);
});

test('doPost: cap of 150 per event, other events still open', () => {
	const rows = Array.from({ length: 150 }, (_, i) => ['t', 'a1', `Nom${i}`, `req-full-${i}`]);
	const script = setup({ signups: [SIGNUP_HEADER, ...rows] });
	assert.deepEqual(script.post(request('a1', 'Un més')), { ok: false, v: 1, error: 'event_full' });
	assert.equal(script.post(request('b2', 'Un més')).ok, true);
});

test('doPost: busy when the lock cannot be taken, and the lock is not released', () => {
	const script = setup({ lockFails: true });
	assert.deepEqual(script.post(request('a1', 'Eva')), { ok: false, v: 1, error: 'busy' });
	assert.equal(script.state.lockReleased, 0);
	assert.equal(script.sheets.get('Inscripcions').rows.length, 2);
});

test('doPost: an unexpected error answers "server" (HTTP 200 JSON) and always releases the lock', () => {
	const script = setup();
	script.state.failSpreadsheet = true;
	const quiet = console.error;
	console.error = () => {};
	try {
		assert.deepEqual(script.post(request('a1', 'Eva')), { ok: false, v: 1, error: 'server' });
	} finally {
		console.error = quiet;
	}
	assert.equal(script.state.lockReleased, 1);
});

test('answers are JSON text', () => {
	const script = setup();
	assert.equal(script.context.doGet({ parameter: { action: 'agenda' } }).mime, 'JSON');
});

test('setup(): validations are drop-down lists only (no locale-dependent formulas) and the lists are complete', () => {
	const script = createScript({ config: null });
	script.context.setup();

	const methods = script.state.validationCalls.map((c) => c.method);
	assert.ok(!methods.includes('requireFormulaSatisfied'), 'custom formulas are rejected by Sheets in es/ca locales');
	assert.equal(methods.filter((m) => m === 'requireValueInList').length, 2);
	assert.equal(methods.filter((m) => m === 'requireValueInRange').length, 2);

	const config = script.sheets.get('Config').rows;
	const column = (index) => config.map((row) => row[index]).filter((v) => v !== undefined && v !== '');
	const dates = column(4);
	const times = column(5);
	assert.equal(dates[0], 'dates_valides');
	assert.equal(dates.length, 31);
	assert.equal(dates[1], '2026-11-01');
	assert.equal(dates.at(-1), '2026-11-30');
	assert.equal(times[0], 'hores_valides');
	assert.equal(times[1], '06:00');
	assert.equal(times.at(-1), '23:55');
	assert.equal(times.length, 1 + (24 - 6) * 12);
	assert.ok([...dates.slice(1), ...times.slice(1)].every((v) => typeof v === 'string'));
	assert.ok(times.slice(1).every((t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t)));
	assert.equal(config[0][1], 'SI', 'the open/closed switch is not touched by the lists');
});

test('setup(): creates the three tabs with headers and never overwrites existing data', () => {
	const script = createScript({ config: null });
	script.context.setup();
	assert.deepEqual(script.sheets.get('Esdeveniments').rows[0], EVENT_HEADER);
	assert.deepEqual(script.sheets.get('Inscripcions').rows[0], SIGNUP_HEADER);
	assert.equal(script.sheets.get('Config').rows[0][1], 'SI');
	assert.equal(script.sheets.get('Esdeveniments').frozenRows, 1);

	script.sheets.get('Esdeveniments').rows.push(eventRow('a1'));
	script.sheets.get('Config').rows[0][1] = 'NO';
	script.context.setup();
	assert.equal(script.sheets.get('Esdeveniments').rows.length, 2);
	assert.equal(script.sheets.get('Config').rows[0][1], 'NO');
});
