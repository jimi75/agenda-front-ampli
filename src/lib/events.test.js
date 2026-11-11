import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	formatHour,
	formatRange,
	groupByDate,
	httpsUrl,
	mapsUrl,
	normalizeEvents,
	parseEventParam,
	parseStatus,
	parseType
} from './events.js';

const row = (/** @type {Record<string, string>} */ extra) => ({
	id: 'a1',
	data: '2026-11-10',
	inici: '10:00',
	fi: '14:00',
	tipus: 'Acció',
	nom: 'Paradeta',
	lloc: 'Plaça de Sants',
	mapa: '',
	estat: '',
	...extra
});

test('formatRange: hores soles, amb minuts i sense hora de fi', () => {
	assert.equal(formatRange('10:00', '14:00'), '10h-14h');
	assert.equal(formatRange('09:00', '12:30'), '9h-12.30h');
	assert.equal(formatRange('18:30', ''), '18.30h');
	assert.equal(formatHour('00:00'), '0h');
});

test('parseType: Acció per defecte, Acte només si ho diu (també en castellà)', () => {
	assert.equal(parseType('Acte'), 'acte');
	assert.equal(parseType('Actes'), 'acte');
	assert.equal(parseType('actos'), 'acte');
	assert.equal(parseType('Acció'), 'accio');
	assert.equal(parseType('ACCIONES'), 'accio');
	assert.equal(parseType('qualsevol altra cosa'), 'accio');
	assert.equal(parseType(undefined), 'accio');
});

test('parseStatus', () => {
	assert.equal(parseStatus('Cancel·lat'), 'cancelled');
	assert.equal(parseStatus('cancelado'), 'cancelled');
	assert.equal(parseStatus('Modificat'), 'modified');
	assert.equal(parseStatus(''), '');
});

test('mapsUrl: enllaç propi només si és https; si no, cerca a Google Maps', () => {
	assert.equal(mapsUrl('x', 'https://maps.app.goo.gl/abc'), 'https://maps.app.goo.gl/abc');
	assert.equal(
		mapsUrl('Plaça de Sants', 'javascript:alert(1)'),
		'https://www.google.com/maps/search/?api=1&query=Pla%C3%A7a%20de%20Sants'
	);
	assert.equal(mapsUrl('', ''), '');
});

test('ordena per dia, hora d’inici, hora de fi i ordre de fila', () => {
	const { events } = normalizeEvents([
		row({ id: 'c', data: '2026-11-11', inici: '09:00' }),
		row({ id: 'b', inici: '17:30', fi: '19:00' }),
		row({ id: 'a', inici: '10:00', fi: '14:00' }),
		row({ id: 'd', inici: '10:00', fi: '14:00' }),
		row({ id: 'e', inici: '10:00', fi: '12:00' })
	]);
	assert.deepEqual(
		events.map((e) => e.id),
		['e', 'a', 'd', 'b', 'c']
	);
});

test('manté els 4 esdeveniments d’un mateix dia (no s’amaga cap)', () => {
	const rows = ['a', 'b', 'c', 'd'].map((id, i) => row({ id, inici: `1${i}:00` }));
	const { events, skipped } = normalizeEvents(rows);
	assert.equal(skipped.length, 0);
	assert.equal(groupByDate(events).get('2026-11-10')?.length, 4);
});

test('salta files invàlides i diu quina fila és, sense llençar errors', () => {
	const { events, skipped } = normalizeEvents([
		row({ id: 'ok' }),
		row({ id: 'Mal Id' }),
		row({ id: 'dup', data: '2026-11-11' }),
		row({ id: 'dup', data: '2026-11-12' }),
		row({ id: 'oct', data: '2026-10-31' }),
		row({ id: 'f31', data: '2026-11-31' }),
		row({ id: 'fmt', data: '10/11/2026' }),
		row({ id: 'h', inici: '25:00' }),
		row({ id: 'nom', nom: '   ' })
	]);
	assert.deepEqual(
		events.map((e) => e.id),
		['ok', 'dup']
	);
	assert.deepEqual(
		skipped.map((s) => s.row),
		[3, 5, 6, 7, 8, 9, 10]
	);
});

test('el número de fila del servidor es el que s’informa (les files buides no el desplacen)', () => {
	const { skipped } = normalizeEvents([row({ id: 'ok' }), row({ id: 'Mal Id', row: '7' })]);
	assert.deepEqual(skipped, [{ row: 7, reason: 'id no vàlid' }]);
});

test('hora de fi invàlida o anterior a l’inici s’ignora, però l’esdeveniment es manté', () => {
	const { events } = normalizeEvents([
		row({ id: 'a', inici: '14:00', fi: '10:00' }),
		row({ id: 'b', fi: 'tard' }),
		row({ id: 'c', fi: '' })
	]);
	assert.deepEqual(
		events.map((e) => e.end),
		['', '', '']
	);
});

test('només s’accepten els dies de l’agenda (del 2 al 29 de novembre): l’1 i el 30 es descarten', () => {
	const { events, skipped } = normalizeEvents([
		row({ id: 'd01', data: '2026-11-01' }),
		row({ id: 'd02', data: '2026-11-02' }),
		row({ id: 'd29', data: '2026-11-29' }),
		row({ id: 'd30', data: '2026-11-30' })
	]);
	assert.deepEqual(
		events.map((e) => e.id),
		['d02', 'd29']
	);
	assert.deepEqual(
		skipped.map((s) => s.row),
		[2, 5]
	);
	assert.match(skipped[0].reason, /fora de l’agenda \(del 2 al 29\)/);
});

test('una data buida té el seu propi motiu (falta la data), diferent d’una data fora de rang', () => {
	const { events, skipped } = normalizeEvents([
		row({ id: 'a', data: '' }),
		row({ id: 'b', data: '2026-12-01' }),
		row({ id: 'c', data: /** @type {any} */ (undefined) })
	]);
	assert.equal(events.length, 0);
	assert.deepEqual(
		skipped.map((s) => s.reason),
		['falta la data', 'data fora de l’agenda (del 2 al 29) o amb format incorrecte', 'falta la data']
	);
});

test('entrada que no és una llista dona 0 esdeveniments', () => {
	assert.deepEqual(normalizeEvents(null), { events: [], skipped: [] });
	assert.deepEqual(normalizeEvents('x'), { events: [], skipped: [] });
});

test('retalla textos molt llargs i neteja espais', () => {
	const { events } = normalizeEvents([row({ nom: ` ${'x'.repeat(300)} ` })]);
	assert.equal(events[0].name.length, 120);
});

test('responsable: es neteja d’espais i es retalla a 60 caràcters', () => {
	assert.equal(normalizeEvents([row({ responsable: '  Marta  ' })]).events[0].manager, 'Marta');
	assert.equal(normalizeEvents([row({ responsable: 'x'.repeat(100) })]).events[0].manager, 'x'.repeat(60));
	assert.equal(normalizeEvents([row({ responsable: '   ' })]).events[0].manager, '');
});

test('httpsUrl: només https:// sense espais; la resta és buida', () => {
	assert.equal(httpsUrl('https://example.org/inscripcio'), 'https://example.org/inscripcio');
	assert.equal(httpsUrl('  HTTPS://example.org  '), 'HTTPS://example.org');
	assert.equal(httpsUrl('http://example.org'), '');
	assert.equal(httpsUrl('javascript:alert(1)'), '');
	assert.equal(httpsUrl('https://example.org/a b'), '');
	assert.equal(httpsUrl('https://'), '');
	assert.equal(httpsUrl(''), '');
	assert.equal(httpsUrl(undefined), '');
});

test('inscripcio_url: https vàlida; amb http, javascript: o espais es tracta com a buida', () => {
	const externalUrl = (/** @type {string} */ value) =>
		normalizeEvents([row({ inscripcio_url: value })]).events[0].externalUrl;
	assert.equal(externalUrl('https://example.org/inscripcio'), 'https://example.org/inscripcio');
	assert.equal(externalUrl(' https://example.org/inscripcio '), 'https://example.org/inscripcio');
	assert.equal(externalUrl('http://example.org/inscripcio'), '');
	assert.equal(externalUrl('javascript:alert(1)'), '');
	assert.equal(externalUrl('https://example.org/ins cripcio'), '');
});

test('sense les columnes noves es comporta com abans, amb manager i externalUrl buits', () => {
	const { events, skipped } = normalizeEvents([row({})]);
	assert.deepEqual(skipped, []);
	assert.equal(events[0].manager, '');
	assert.equal(events[0].externalUrl, '');
	assert.equal(events[0].mapUrl, 'https://www.google.com/maps/search/?api=1&query=Pla%C3%A7a%20de%20Sants');
});

test('inscripcio_url no afecta mapUrl, ni mapa afecta externalUrl', () => {
	const { events } = normalizeEvents([
		row({ mapa: 'https://maps.app.goo.gl/abc', inscripcio_url: 'https://example.org/inscripcio' })
	]);
	assert.equal(events[0].mapUrl, 'https://maps.app.goo.gl/abc');
	assert.equal(events[0].externalUrl, 'https://example.org/inscripcio');
	assert.equal(normalizeEvents([row({ mapa: 'https://maps.app.goo.gl/abc' })]).events[0].externalUrl, '');
});

test('parseEventParam: id vàlid, caràcters no vàlids, més de 20 caràcters i sense paràmetre', () => {
	assert.equal(parseEventParam('?e=paradeta-1'), 'paradeta-1');
	assert.equal(parseEventParam('?admin&e=a1'), 'a1');
	assert.equal(parseEventParam('?e=a1&e=b2'), 'a1');
	assert.equal(parseEventParam('?e='.concat('x'.repeat(20))), 'x'.repeat(20));
	assert.equal(parseEventParam('?e=Paradeta'), null);
	assert.equal(parseEventParam('?e=a_1'), null);
	assert.equal(parseEventParam('?e=a%201'), null);
	assert.equal(parseEventParam('?e=%3Cb%3E'), null);
	assert.equal(parseEventParam('?e='.concat('x'.repeat(21))), null);
	assert.equal(parseEventParam('?e='), null);
	assert.equal(parseEventParam('?admin'), null);
	assert.equal(parseEventParam(''), null);
});
