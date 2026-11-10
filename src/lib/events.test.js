import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	formatHour,
	formatRange,
	groupByDate,
	mapsUrl,
	normalizeEvents,
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

test('entrada que no és una llista dona 0 esdeveniments', () => {
	assert.deepEqual(normalizeEvents(null), { events: [], skipped: [] });
	assert.deepEqual(normalizeEvents('x'), { events: [], skipped: [] });
});

test('retalla textos molt llargs i neteja espais', () => {
	const { events } = normalizeEvents([row({ nom: ` ${'x'.repeat(300)} ` })]);
	assert.equal(events[0].name.length, 120);
});
