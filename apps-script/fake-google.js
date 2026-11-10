import fs from 'node:fs';
import vm from 'node:vm';

const CODE = new URL('./Code.gs', import.meta.url);

/** What a Sheets cell shows for a value, using a Spanish-style locale like the real sheet might have. */
function display(value) {
	if (value instanceof Date) {
		const iso = value.toISOString();
		return value.getUTCFullYear() < 1950
			? iso.slice(11, 19)
			: `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
	}
	if (value && typeof value === 'object' && 'formula' in value) return '#ERROR!';
	return value === undefined || value === null ? '' : String(value);
}

class FakeSheet {
	/** @param {any[][]} rows */
	constructor(rows = []) {
		this.rows = rows;
		this.frozenRows = 0;
		this.validations = [];
	}

	#width() {
		return Math.max(0, ...this.rows.map((r) => r.length));
	}

	getLastRow() {
		return this.rows.length;
	}

	setFrozenRows(n) {
		this.frozenRows = n;
	}

	getDataRange() {
		const width = this.#width();
		const padded = this.rows.map((r) => Array.from({ length: width }, (_, i) => r[i] ?? ''));
		return {
			getValues: () => padded.map((r) => r.slice()),
			getDisplayValues: () => padded.map((r) => r.map(display))
		};
	}

	getRange(a, b, c, d) {
		if (typeof a === 'string') {
			const match = /^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/.exec(a);
			if (!match) {
				return { setNumberFormat() {}, setDataValidation: (rule) => this.validations.push([a, rule]) };
			}
			const col = match[1].charCodeAt(0) - 65;
			const row = Number(match[2]) - 1;
			return {
				getDisplayValue: () => display(this.rows[row]?.[col]),
				setValues: (values) => {
					this.rows[row] ??= [];
					values[0].forEach((v, i) => (this.rows[row][col + i] = v));
				},
				setNumberFormat() {},
				setDataValidation: (rule) => this.validations.push([a, rule])
			};
		}
		const sheet = this;
		const textFormat = { on: false };
		return {
			setNumberFormat(format) {
				textFormat.on = format === '@';
				return this;
			},
			setValues(values) {
				values.forEach((vals, i) => {
					const row = a - 1 + i;
					sheet.rows[row] ??= [];
					vals.forEach((v, j) => {
						// Without the text format, Sheets would evaluate a value that starts with = + - @.
						const evaluated = !textFormat.on && typeof v === 'string' && /^[=+\-@]/.test(v);
						sheet.rows[row][b - 1 + j] = evaluated ? { formula: v } : textFormat.on ? String(v) : v;
					});
				});
				return this;
			},
			setDataValidation: (rule) => sheet.validations.push([`${a},${b}`, rule])
		};
	}
}

const chain = (calls) => {
	const builder = new Proxy(
		{},
		{
			get: (_t, prop) =>
				prop === 'build'
					? () => ({ built: true })
					: (...args) => {
							calls.push({ method: String(prop), args });
							return builder;
						}
		}
	);
	return builder;
};

/**
 * Loads apps-script/Code.gs into a VM with fake Google services.
 * @param {{ events?: any[][], signups?: any[][], config?: string | null, now?: Date, lockFails?: boolean }} [options]
 */
export function createScript({ events, signups, config = 'SI', now = new Date('2026-11-10T09:30:00Z'), lockFails = false } = {}) {
	const sheets = new Map();
	if (events) sheets.set('Esdeveniments', new FakeSheet(events));
	if (signups) sheets.set('Inscripcions', new FakeSheet(signups));
	if (config !== null) sheets.set('Config', new FakeSheet([['inscripcions_obertes', config]]));

	const state = { lockReleased: 0, lockAttempts: 0, failSpreadsheet: false, validationCalls: [] };
	const spreadsheet = {
		getSpreadsheetTimeZone: () => 'Europe/Madrid',
		getSheetByName: (name) => {
			if (state.failSpreadsheet) throw new Error('boom');
			return sheets.get(name) ?? null;
		},
		insertSheet: (name) => {
			const sheet = new FakeSheet();
			sheets.set(name, sheet);
			return sheet;
		}
	};
	const cacheData = new Map();

	// Same Date class as the test (so `instanceof Date` works) but `new Date()` returns a fixed "now".
	const FixedDate = new Proxy(Date, {
		construct: (target, args) => (args.length ? new target(...args) : new target(now))
	});

	const context = {
		console,
		Date: FixedDate,
		SpreadsheetApp: {
			getActiveSpreadsheet: () => spreadsheet,
			flush() {},
			newDataValidation: () => chain(state.validationCalls)
		},
		LockService: {
			getScriptLock: () => ({
				tryLock: () => (state.lockAttempts++, !lockFails),
				releaseLock: () => state.lockReleased++
			})
		},
		CacheService: {
			getScriptCache: () => ({
				get: (k) => cacheData.get(k) ?? null,
				put: (k, v) => cacheData.set(k, v)
			})
		},
		ContentService: {
			MimeType: { JSON: 'JSON' },
			createTextOutput: (text) => ({
				text,
				mime: '',
				setMimeType(mime) {
					this.mime = mime;
					return this;
				},
				getContent() {
					return text;
				}
			})
		},
		Utilities: {
			formatDate(date, tz, format) {
				const parts = Object.fromEntries(
					new Intl.DateTimeFormat('en-GB', {
						timeZone: tz,
						hourCycle: 'h23',
						year: 'numeric',
						month: '2-digit',
						day: '2-digit',
						hour: '2-digit',
						minute: '2-digit',
						second: '2-digit'
					})
						.formatToParts(date)
						.map((p) => [p.type, p.value])
				);
				const tokens = { yyyy: parts.year, MM: parts.month, dd: parts.day, HH: parts.hour, mm: parts.minute, ss: parts.second };
				return format.replace(/'([^']*)'|yyyy|MM|dd|HH|mm|ss/g, (m, literal) => literal ?? tokens[m]);
			}
		}
	};
	vm.createContext(context);
	vm.runInContext(fs.readFileSync(CODE, 'utf8'), context, { filename: 'Code.gs' });

	/** Calls the script like Apps Script does and parses its JSON answer. */
	const get = (parameter) => JSON.parse(context.doGet({ parameter }).getContent());
	const post = (body) =>
		JSON.parse(
			context.doPost({ postData: { contents: typeof body === 'string' ? body : JSON.stringify(body) } }).getContent()
		);

	return { context, sheets, state, get, post };
}

export const EVENT_HEADER = ['id', 'data', 'inici', 'fi', 'tipus', 'nom', 'lloc', 'mapa', 'estat'];
export const SIGNUP_HEADER = ['data_hora', 'event_id', 'nom', 'request_id'];
