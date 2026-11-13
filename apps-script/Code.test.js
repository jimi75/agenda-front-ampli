import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createScript, EVENT_HEADER, EVENT_HEADER_OPTIONAL, SIGNUP_HEADER } from './fake-google.js';

const eventRowFor = (header) => (id, extra = {}) => {
	const base = {
		id, data: '2026-11-12', inici: '10:00', fi: '14:00', tipus: 'Acció', nom: 'Paradeta', lloc: 'Sants', mapa: '', estat: '',
		responsable: '', inscripcio_url: ''
	};
	return header.map((key) => ({ ...base, ...extra })[key]);
};
const eventRow = eventRowFor(EVENT_HEADER);
const eventRowOptional = eventRowFor(EVENT_HEADER_OPTIONAL);

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

test('doGet: una full d’11 columnes torna responsable i inscripcio_url de cada esdeveniment', () => {
	const script = setup({
		events: [
			EVENT_HEADER_OPTIONAL,
			eventRowOptional('a1', { responsable: ' Marta ', inscripcio_url: 'https://example.org/inscripcio' }),
			eventRowOptional('b2', { data: '2026-11-14' })
		]
	});
	const agenda = script.get({ action: 'agenda' });
	assert.deepEqual(agenda.missingColumns, []);
	assert.deepEqual(
		agenda.events.map((e) => [e.id, e.responsable, e.inscripcio_url]),
		[['a1', 'Marta', 'https://example.org/inscripcio'], ['b2', '', '']]
	);
	assert.equal(agenda.events[0].nom, 'Paradeta', 'les columnes de sempre es llegeixen igual');
	assert.deepEqual(agenda.features, ['unsignup']);
	assert.equal(script.post(request('a1', 'Eva')).ok, true, 'signup funciona amb les columnes noves');
});

test('doGet: les columnes opcionals es llegeixen per capçalera, també desordenades o si només n’hi ha una', () => {
	const header = ['inscripcio_url', ...EVENT_HEADER];
	const row = eventRow('a1', { mapa: 'https://maps.app.goo.gl/x' });
	const only = setup({ events: [header, ['https://example.org/x', ...row]] }).get({ action: 'agenda' });
	assert.deepEqual(only.events.map((e) => [e.id, e.mapa, e.inscripcio_url, e.responsable]), [
		['a1', 'https://maps.app.goo.gl/x', 'https://example.org/x', '']
	]);
});

test('doGet: una full de 9 columnes segueix funcionant i els camps nous surten buits', () => {
	const agenda = setup().get({ action: 'agenda' });
	assert.equal(agenda.ok, true);
	assert.deepEqual(agenda.missingColumns, []);
	assert.deepEqual(
		agenda.events.map((e) => [e.id, e.responsable, e.inscripcio_url]),
		[['a1', '', ''], ['b2', '', '']]
	);
});

test('doGet: missingColumns avisa de les capçaleres que no es troben (columna renomenada o capçalera desplaçada)', () => {
	const ok = setup().get({ action: 'agenda' });
	assert.deepEqual(ok.missingColumns, []);

	const renamed = EVENT_HEADER.map((h) => (h === 'data' ? 'fecha' : h));
	const script = setup({ events: [renamed, eventRow('a1')] });
	const agenda = script.get({ action: 'agenda' });
	assert.deepEqual(agenda.missingColumns, ['data']);
	assert.equal(agenda.events[0].data, '', 'sense la capçalera «data» la data surt buida');
	assert.equal(agenda.events[0].nom, 'Paradeta', 'la resta de columnes es llegeixen igualment');

	// Header sorted into the middle of the data: row 1 is now an event, not the header.
	const sorted = setup({ events: [eventRow('a1'), EVENT_HEADER] });
	assert.deepEqual(sorted.get({ action: 'agenda' }).missingColumns, ['id', 'data', 'inici', 'tipus', 'nom']);

	const noTab = createScript({ signups: [SIGNUP_HEADER] });
	assert.equal(noTab.get({ action: 'agenda' }).missingColumns.length, 5);
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
	assert.equal(dates.length, 1 + 28);
	assert.equal(dates[1], '2026-11-02');
	assert.equal(dates.at(-1), '2026-11-29');
	assert.ok(!dates.includes('2026-11-01') && !dates.includes('2026-11-30'));
	assert.equal(times[0], 'hores_valides');
	assert.equal(times[1], '08:00');
	assert.equal(times.at(-1), '22:00');
	assert.equal(times.length, 1 + 14 * 12 + 1, 'de 08:00 a 22:00 inclosos, de 5 en 5 minuts');
	assert.ok([...dates.slice(1), ...times.slice(1)].every((v) => typeof v === 'string'));
	assert.ok(times.slice(1).every((t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t)));
	assert.equal(config[0][1], 'SI', 'the open/closed switch is not touched by the lists');
});

test('setup(): una nova execució esborra les hores sobrants d’una llista anterior més llarga (06:00–23:55)', () => {
	const script = createScript({ config: null });
	script.context.setup();
	const config = script.sheets.get('Config').rows;
	// Previous version: 216 times from 06:00 to 23:55, i.e. column F up to row 217.
	for (let row = 1; row <= 216; row++) {
		config[row] = config[row] ?? [];
		config[row][5] = `old-${row}`;
	}
	script.context.setup();
	const times = config.map((row) => row?.[5]).filter((v) => v !== undefined && v !== '');
	assert.equal(times.length, 170);
	assert.equal(times[1], '08:00');
	assert.equal(times.at(-1), '22:00');
	assert.ok(times.slice(1).every((t) => t >= '08:00' && t <= '22:00' && Number(t.slice(3)) % 5 === 0));
	assert.ok(!times.some((t) => t.startsWith('old-')));
});

test('setup(): una nova execució esborra les dates sobrants d’una llista anterior més llarga', () => {
	const script = createScript({ config: null });
	script.context.setup();
	const config = script.sheets.get('Config').rows;
	// Run of the previous version: 30 days (1 to 30) in column E, i.e. rows 2 to 31.
	config[29] = config[29] ?? [];
	config[30] = config[30] ?? [];
	config[29][4] = '2026-11-29';
	config[30][4] = '2026-11-30';
	script.context.setup();
	const dates = config.map((row) => row[4]).filter((v) => v !== undefined && v !== '');
	assert.equal(dates.length, 1 + 28);
	assert.equal(dates.at(-1), '2026-11-29');
	assert.ok(!dates.includes('2026-11-30'));
	assert.ok(config[30]?.[4] === undefined || config[30][4] === '');
});

test('setup(): protege les capçaleres amb avís de confirmació (no bloqueig dur) i no apila duplicats', () => {
	const script = createScript({ config: null });
	script.context.setup();
	const summary = () =>
		['Esdeveniments', 'Inscripcions', 'Config'].map((name) =>
			script.sheets.get(name).protections.map((p) => [p.range, p.warningOnly, p.api.getDescription().slice(0, 9)])
		);
	assert.deepEqual(summary(), [
		[['A1:I1', true, 'Capçalera']],
		[['A1:D1', true, 'Capçalera']],
		[['E1:F170', true, 'Llistes d']]
	]);

	script.context.setup();
	script.context.setup();
	assert.deepEqual(summary().map((list) => list.length), [1, 1, 1], 'tres execucions, una sola protecció per rang');

	// A protection that the owner added by hand (different description) is left alone.
	script.sheets.get('Esdeveniments').getRange('K1').protect().setDescription('meva');
	script.context.setup();
	assert.equal(script.sheets.get('Esdeveniments').protections.length, 2);
	// The switch Config!B1 stays editable: it is outside the protected range E1:F170.
	assert.ok(!script.sheets.get('Config').protections.some((p) => p.range.startsWith('A') || p.range.startsWith('B')));
});

test('setup(): creates the three tabs with headers and never overwrites existing data', () => {
	const script = createScript({ config: null });
	script.context.setup();
	assert.deepEqual(script.sheets.get('Esdeveniments').rows[0], EVENT_HEADER);
	assert.deepEqual(script.sheets.get('Inscripcions').rows[0], SIGNUP_HEADER);
	assert.equal(script.sheets.get('Config').rows[0][1], 'SI');
	assert.equal(script.sheets.get('Esdeveniments').frozenRows, 1);
	assert.equal(script.sheets.get('Inscripcions').frozenRows, 1);

	script.sheets.get('Esdeveniments').frozenRows = 0;
	script.context.setup();
	assert.equal(script.sheets.get('Esdeveniments').frozenRows, 1, 'setup torna a fixar la capçalera');

	script.sheets.get('Esdeveniments').rows.push(eventRow('a1'));
	script.sheets.get('Config').rows[0][1] = 'NO';
	script.context.setup();
	assert.equal(script.sheets.get('Esdeveniments').rows.length, 2);
	assert.equal(script.sheets.get('Config').rows[0][1], 'NO');
});

// ---- R4: signup is unchanged, unsignup is new ----

test('doPost: el reenviament amb el mateix requestId al topall de 150 dona el mateix resultat de sempre', () => {
	const rows = Array.from({ length: 149 }, (_, i) => ['t', 'a1', `Nom${i}`, `req-full-${i}`]);
	const script = setup({ signups: [SIGNUP_HEADER, ...rows] });
	const body = request('a1', 'El cent cinquanta');
	const first = script.post(body);
	assert.equal(first.ok, true);
	assert.equal(first.names.length, 150);
	// The request already reached the sheet: it is not counted against the cap again.
	assert.deepEqual(script.post(body), first);
	assert.equal(script.sheets.get('Inscripcions').rows.length, 151);
	assert.deepEqual(script.post(request('a1', 'Un més')), { ok: false, v: 1, error: 'event_full' });
	assert.equal(script.sheets.get('Inscripcions').rows.length, 151);
});

test('doPost: una acció desconeguda és bad_request i no pren el lock ni escriu res', () => {
	const script = setup();
	for (const action of ['delete', 'unsign', 'UNSIGNUP', 'Signup', '', undefined, 1, null, {}]) {
		const answer = script.post({ action, eventId: 'a1', requestId: 'req-00000001', name: 'Eva' });
		assert.deepEqual(answer, { ok: false, v: 1, error: 'bad_request' }, String(action));
	}
	assert.equal(script.post('null').error, 'bad_request');
	assert.equal(script.post('[]').error, 'bad_request');
	assert.equal(script.state.lockAttempts, 0);
	assert.equal(script.sheets.get('Inscripcions').rows.length, 2);
	assert.equal(script.sheets.has('Baixes'), false);
});

const R_EVA = 'req-eva-0001';
const R_PAU = 'req-pau-0002';
const R_ANNA = 'req-anna-0003';
const R_BEA = 'req-bea-0004';
const stamp = (n) => `2026-11-0${n}T10:00:00`;
const signupRows = () => [
	SIGNUP_HEADER,
	[stamp(1), 'a1', 'Eva', R_EVA],
	[stamp(2), 'a1', 'Pau', R_PAU],
	[stamp(3), 'b2', 'Anna', R_ANNA],
	[stamp(4), 'a1', 'Bea', R_BEA]
];
const setupR4 = (options = {}) => setup({ signups: signupRows(), ...options });
const unsign = (eventId, requestId, extra = {}) => ({ action: 'unsignup', eventId, requestId, ...extra });
const inscripcions = (script) => script.sheets.get('Inscripcions').rows;

test('doGet: torna features i mai cap request_id (ni a events ni a signups)', () => {
	const agenda = setupR4().get({ action: 'agenda' });
	assert.deepEqual(agenda.features, ['unsignup']);
	assert.deepEqual(agenda.signups, { a1: ['Eva', 'Pau', 'Bea'], b2: ['Anna'] });
	const text = JSON.stringify(agenda);
	assert.ok(!text.includes('request_id'));
	for (const id of [R_EVA, R_PAU, R_ANNA, R_BEA]) assert.ok(!text.includes(id), id);
});

test('unsignup: esborra només la fila amb aquest event_id i request_id i torna names i removed:true', () => {
	const script = setupR4();
	const answer = script.post(unsign('a1', R_PAU));
	assert.deepEqual(answer, { ok: true, v: 1, eventId: 'a1', names: ['Eva', 'Bea'], removed: true });
	assert.deepEqual(inscripcions(script), [
		SIGNUP_HEADER,
		[stamp(1), 'a1', 'Eva', R_EVA],
		[stamp(3), 'b2', 'Anna', R_ANNA],
		[stamp(4), 'a1', 'Bea', R_BEA]
	]);
	assert.equal(script.state.lockReleased, 1);
	assert.deepEqual(script.get({ action: 'agenda' }).signups, { a1: ['Eva', 'Bea'], b2: ['Anna'] });
});

test('unsignup: la primera i l’última fila de dades també es poden esborrar', () => {
	const script = setupR4();
	assert.equal(script.post(unsign('a1', R_EVA)).removed, true);
	assert.equal(script.post(unsign('a1', R_BEA)).removed, true);
	assert.deepEqual(inscripcions(script).map((r) => r[2]), ['nom', 'Pau', 'Anna']);
});

test('unsignup: arxiva el nom a Baixes, que es crea al vol amb capçalera, i en text', () => {
	const script = setupR4();
	assert.equal(script.sheets.has('Baixes'), false);
	script.post(unsign('a1', R_PAU));
	const archive = script.sheets.get('Baixes').rows;
	assert.deepEqual(archive[0], ['data_hora_baixa', 'event_id', 'nom', 'request_id']);
	assert.deepEqual(archive.slice(1), [['2026-11-10T10:30:00', 'a1', 'Pau', R_PAU]]);
	assert.ok(archive.flat().every((cell) => typeof cell === 'string'));
	assert.equal(script.sheets.get('Baixes').frozenRows, 1);

	script.post(unsign('b2', R_ANNA));
	const again = script.sheets.get('Baixes').rows;
	assert.equal(again.length, 3, 'una sola capçalera i una fila per baixa');
	assert.deepEqual(again[2].slice(1), ['b2', 'Anna', R_ANNA]);
});

test('unsignup: usa la pestanya Baixes que ja existeix sense tocar-ne el contingut', () => {
	const script = setupR4();
	script.post(unsign('a1', R_PAU));
	const before = structuredClone(script.sheets.get('Baixes').rows);
	script.post(unsign('a1', R_EVA));
	assert.deepEqual(script.sheets.get('Baixes').rows.slice(0, before.length), before);
});

test('unsignup: un request_id buit no esborra res (ni per doPost ni per la funció directa)', () => {
	const script = setupR4({
		signups: [...signupRows(), [stamp(5), 'a1', 'Sense id', ''], [stamp(6), 'a1', 'Altre sense id', '']]
	});
	const before = structuredClone(inscripcions(script));
	for (const requestId of ['', '   ', undefined, null, 7, 'x', 'a b c d e f g h', 'x'.repeat(65)]) {
		assert.deepEqual(script.post(unsign('a1', requestId)), { ok: false, v: 1, error: 'bad_request' }, String(requestId));
	}
	assert.deepEqual(inscripcions(script), before);
	assert.equal(script.state.lockAttempts, 0, 'les peticions invàlides es rebutgen abans del lock');

	// Defence in depth: even if an empty id got past doPost, rows without request_id never match.
	const ss = script.context.SpreadsheetApp.getActiveSpreadsheet();
	const answer = JSON.parse(script.context.unsignup_({ eventId: 'a1', requestId: '' }, ss, 'Europe/Madrid').getContent());
	assert.equal(answer.removed, false);
	assert.deepEqual(answer.names, ['Eva', 'Pau', 'Bea', 'Sense id', 'Altre sense id']);
	assert.deepEqual(inscripcions(script), before);
	assert.equal(script.sheets.has('Baixes'), false);
});

test('unsignup: un eventId inexistent o massa llarg i un request_id d’un altre esdeveniment no esborren res', () => {
	const script = setupR4();
	const before = structuredClone(inscripcions(script));
	// R_ANNA belongs to b2: asking for it with a1 (or any other event) finds nothing.
	assert.deepEqual(script.post(unsign('a1', R_ANNA)), {
		ok: true, v: 1, eventId: 'a1', names: ['Eva', 'Pau', 'Bea'], removed: false
	});
	assert.equal(script.post(unsign('b2', R_EVA)).removed, false);
	assert.equal(script.post(unsign('a1', 'req-no-existeix')).removed, false);
	assert.equal(script.post(unsign('x'.repeat(21), R_EVA)).error, 'bad_request');
	assert.equal(script.post(unsign('', R_EVA)).error, 'bad_request');
	assert.equal(script.post(unsign(undefined, R_EVA)).error, 'bad_request');
	assert.deepEqual(inscripcions(script), before);
	assert.equal(script.sheets.has('Baixes'), false);
});

test('unsignup: és idempotent (la segona vegada removed:false i una sola fila a Baixes)', () => {
	const script = setupR4();
	assert.equal(script.post(unsign('a1', R_PAU)).removed, true);
	const second = script.post(unsign('a1', R_PAU));
	assert.deepEqual(second, { ok: true, v: 1, eventId: 'a1', names: ['Eva', 'Bea'], removed: false });
	assert.equal(inscripcions(script).length, 4);
	assert.equal(script.sheets.get('Baixes').rows.length, 2);
	assert.equal(script.state.lockReleased, 2);
});

test('unsignup: funciona amb les inscripcions tancades (B1 = NO)', () => {
	const script = setupR4({ config: 'NO' });
	assert.equal(script.post(unsign('a1', R_PAU)).removed, true);
	assert.deepEqual(script.post(request('a1', 'Nou')), { ok: false, v: 1, error: 'closed' });
	assert.deepEqual(inscripcions(script).map((r) => r[2]), ['nom', 'Eva', 'Anna', 'Bea']);
});

test('unsignup: funciona amb un esdeveniment que ja no és a la fulla Esdeveniments', () => {
	const script = setupR4({ signups: [...signupRows(), [stamp(7), 'esborrat', 'Fantasma', 'req-fantasma-1']] });
	assert.equal(script.get({ action: 'agenda' }).signups.esborrat, undefined);
	const answer = script.post(unsign('esborrat', 'req-fantasma-1'));
	assert.deepEqual(answer, { ok: true, v: 1, eventId: 'esborrat', names: [], removed: true });
	assert.equal(script.sheets.get('Baixes').rows[1][2], 'Fantasma');
	assert.equal(inscripcions(script).length, 5);
});

test('unsignup: busy si el lock està agafat i res no canvia; el lock s’allibera sempre si es va agafar', () => {
	const busy = setupR4({ lockFails: true });
	const before = structuredClone(inscripcions(busy));
	assert.deepEqual(busy.post(unsign('a1', R_PAU)), { ok: false, v: 1, error: 'busy' });
	assert.deepEqual(inscripcions(busy), before);
	assert.equal(busy.sheets.has('Baixes'), false);
	assert.equal(busy.state.lockReleased, 0);

	const ok = setupR4();
	ok.post(unsign('a1', R_PAU));
	ok.post(unsign('a1', R_PAU));
	assert.equal(ok.state.lockReleased, 2, 'també quan removed és false');

	const broken = setupR4();
	broken.state.failSpreadsheet = true;
	const quiet = console.error;
	console.error = () => {};
	try {
		assert.deepEqual(broken.post(unsign('a1', R_PAU)), { ok: false, v: 1, error: 'server' });
	} finally {
		console.error = quiet;
	}
	assert.equal(broken.state.lockReleased, 1);
});

test('unsignup: si el borrat falla (error del servidor) el lock s’allibera i la inscripció continua a Inscripcions', () => {
	const script = setupR4();
	script.sheets.get('Inscripcions').deleteRow = () => {
		throw new Error('boom');
	};
	const quiet = console.error;
	console.error = () => {};
	try {
		assert.deepEqual(script.post(unsign('a1', R_PAU)), { ok: false, v: 1, error: 'server' });
	} finally {
		console.error = quiet;
	}
	assert.equal(script.state.lockReleased, 1);
	assert.equal(inscripcions(script).length, 5, 'la inscripció continua a Inscripcions');
});

test('unsignup: si el propietari reordena les files entre les dues lectures no esborra una altra fila', () => {
	// Between the first and the second read of Inscripcions the owner sorts by name: the row that
	// held Pau (row 3) now holds somebody else.
	const script = setupR4({
		beforeRead(sheetName, readNumber) {
			if (sheetName !== 'Inscripcions' || readNumber !== 2) return;
			const rows = script.sheets.get('Inscripcions').rows;
			[rows[2], rows[4]] = [rows[4], rows[2]];
		}
	});
	const answer = script.post(unsign('a1', R_PAU));
	assert.equal(answer.removed, false);
	assert.deepEqual(answer.names, ['Eva', 'Bea', 'Pau'], 'els noms són els de la segona lectura');
	assert.equal(inscripcions(script).length, 5, 'no s’ha esborrat cap fila');
	assert.deepEqual(inscripcions(script).map((r) => r[2]).sort(), ['Anna', 'Bea', 'Eva', 'Pau', 'nom'].sort());
	assert.equal(script.sheets.has('Baixes'), false, 'res no s’arxiva');
	assert.equal(script.sheets.get('Inscripcions').reads, 2, 'no es torna a buscar');
	assert.equal(script.state.lockReleased, 1);
	assert.deepEqual(script.logs, ['unsignup a1 removed=false']);
});

test('unsignup: si el propietari insereix una fila a sobre entre les lectures, la fila que pujava no s’esborra', () => {
	const script = setupR4({
		beforeRead(sheetName, readNumber) {
			if (sheetName === 'Inscripcions' && readNumber === 2) {
				script.sheets.get('Inscripcions').rows.splice(1, 0, [stamp(8), 'b2', 'Nova', 'req-nova-0009']);
			}
		}
	});
	const answer = script.post(unsign('a1', R_PAU));
	assert.equal(answer.removed, false);
	assert.deepEqual(answer.names, ['Eva', 'Pau', 'Bea']);
	assert.equal(inscripcions(script).length, 6);
	assert.ok(inscripcions(script).some((r) => r[2] === 'Pau'));
	assert.equal(script.sheets.has('Baixes'), false);
});

test('unsignup: si la mateixa fila canvia de dades entre les lectures (mateix request_id d’un altre esdeveniment) no s’esborra', () => {
	const script = setupR4({
		beforeRead(sheetName, readNumber) {
			if (sheetName === 'Inscripcions' && readNumber === 2) script.sheets.get('Inscripcions').rows[2][1] = 'b2';
		}
	});
	assert.equal(script.post(unsign('a1', R_PAU)).removed, false);
	assert.equal(inscripcions(script).length, 5);
});

test('unsignup: sense reordenació la relectura no canvia res (beforeRead es crida a cada lectura)', () => {
	const calls = [];
	const script = setupR4({ beforeRead: (sheetName, n) => calls.push([sheetName, n]) });
	assert.equal(script.post(unsign('a1', R_PAU)).removed, true);
	assert.deepEqual(calls.filter(([name]) => name === 'Inscripcions'), [['Inscripcions', 1], ['Inscripcions', 2]]);
});

test('unsignup: escriu un console.log amb removed també quan és false', () => {
	const script = setupR4();
	script.post(unsign('a1', R_PAU));
	script.post(unsign('a1', R_PAU));
	assert.deepEqual(script.logs, ['unsignup a1 removed=true', 'unsignup a1 removed=false']);
	assert.ok(script.logs.every((line) => !line.includes(R_PAU)), 'el requestId no va al registre');
});

test('unsignup: dues persones amb el mateix nom a l’esdeveniment: només cau la fila del requestId', () => {
	const script = setupR4({ signups: [...signupRows(), [stamp(9), 'a1', 'Eva', 'req-eva-0002']] });
	const answer = script.post(unsign('a1', 'req-eva-0002'));
	assert.deepEqual(answer.names, ['Eva', 'Pau', 'Bea']);
	assert.ok(inscripcions(script).some((r) => r[3] === R_EVA));
	assert.ok(!inscripcions(script).some((r) => r[3] === 'req-eva-0002'));
});

// ---- Multi-district: parameter d ----

const EIX = 'Esdeveniments eixample';
const setupD = (options = {}) =>
	setup({
		extraSheets: { [EIX]: [EVENT_HEADER, eventRow('eix-a'), eventRow('eix-b', { data: '2026-11-20' })] },
		...options
	});

test('doGet sense d: la resposta és exactament la d’abans i no porta district', () => {
	const script = setupD();
	const agenda = script.get({ action: 'agenda' });
	assert.deepEqual(agenda, {
		ok: true,
		v: 1,
		signupsOpen: true,
		missingColumns: [],
		events: [
			{ row: 2, id: 'a1', data: '2026-11-12', inici: '10:00', fi: '14:00', tipus: 'Acció', nom: 'Paradeta', lloc: 'Sants', mapa: '', estat: '', responsable: '', inscripcio_url: '' },
			{ row: 3, id: 'b2', data: '2026-11-14', inici: '10:00', fi: '14:00', tipus: 'Acció', nom: 'Paradeta', lloc: 'Sants', mapa: '', estat: '', responsable: '', inscripcio_url: '' }
		],
		signups: { a1: ['Eva'] },
		features: ['unsignup']
	});
	assert.ok(!('district' in agenda));
});

test('doGet amb d=eixample: llegeix només la seva pestanya i torna district', () => {
	const script = setupD({ signups: [SIGNUP_HEADER, ['x', 'eix-a', 'Anna', 'req-00000001'], ['x', 'a1', 'Eva', 'req-00000002']] });
	const agenda = script.get({ action: 'agenda', d: 'eixample' });
	assert.equal(agenda.district, 'eixample');
	assert.deepEqual(agenda.events.map((e) => e.id), ['eix-a', 'eix-b']);
	assert.deepEqual(agenda.signups, { 'eix-a': ['Anna'] });
});

test('doGet: un d no vàlid o sense pestanya torna unknown_district', () => {
	const script = setupD();
	for (const d of ['', 'Inscripcions', '../x', 'EIXAMPLE', 'a'.repeat(31), 'notes']) {
		assert.deepEqual(script.get({ action: 'agenda', d }), { ok: false, v: 1, error: 'unknown_district' }, JSON.stringify(d));
	}
});

test('doGet: una action incorrecta guanya a un d no vàlid', () => {
	assert.equal(setupD().get({ action: 'x', d: '../x' }).error, 'bad_request');
});

test('signup amb d=eixample accepta eix-… i rebutja un id de Sants', () => {
	const script = setupD();
	const ok = script.post(request('eix-a', 'Eva', { d: 'eixample' }));
	assert.equal(ok.ok, true);
	assert.deepEqual(ok.names, ['Eva']);
	assert.equal(script.post(request('a1', 'Eva', { d: 'eixample' })).error, 'unknown_event');
});

test('signup sense d rebutja eix-… i sense pestanya Esdeveniments dóna unknown_event', () => {
	assert.equal(setupD().post(request('eix-a', 'Eva')).error, 'unknown_event');
	const noTab = createScript({ signups: [SIGNUP_HEADER] });
	assert.equal(noTab.post(request('a1', 'Eva')).error, 'unknown_event');
});

test('signup amb d no vàlid es rebutja abans del lock', () => {
	for (const d of [null, 5, ['eixample'], '']) {
		const script = setupD();
		assert.equal(script.post(request('eix-a', 'Eva', { d })).error, 'unknown_district', JSON.stringify(d));
		assert.equal(script.state.lockAttempts, 0);
	}
});

test('signup amb d d’una pestanya inexistent dóna unknown_district', () => {
	const script = setupD();
	assert.equal(script.post(request('eix-a', 'Eva', { d: 'notes' })).error, 'unknown_district');
});

test('signup amb d=eixample i Config!B1 = NO dóna closed', () => {
	assert.equal(setupD({ config: 'NO' }).post(request('eix-a', 'Eva', { d: 'eixample' })).error, 'closed');
});

test('el topall de 3000 compta les inscripcions de tots els districtes', () => {
	const rows = Array.from({ length: 3000 }, (_, i) => ['x', 'a1', 'N', `req-${String(i).padStart(8, '0')}`]);
	const script = setupD({ signups: [SIGNUP_HEADER, ...rows] });
	assert.equal(script.post(request('eix-a', 'Eva', { d: 'eixample' })).error, 'closed');
});

test('unsignup funciona igual amb o sense d', () => {
	for (const extra of [{}, { d: 'eixample' }, { d: null }]) {
		const script = setupD({ signups: [SIGNUP_HEADER, ['x', 'eix-a', 'Anna', 'req-00000001']] });
		const answer = script.post({ action: 'unsignup', eventId: 'eix-a', requestId: 'req-00000001', ...extra });
		assert.equal(answer.removed, true);
	}
});
