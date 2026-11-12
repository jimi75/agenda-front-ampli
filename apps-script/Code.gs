/**
 * Agenda Frontamplista Sants-Montjuïc: backend as a Google Apps Script web app.
 *
 * - doGet  ?action=agenda  -> events + sign-ups as JSON. Each event also carries the optional
 *   columns `responsable` and `inscripcio_url` (J and K of Esdeveniments; empty when the sheet has
 *   no such header, so a sheet with only A:I keeps working)
 *   It also carries `features: ['unsignup']`, so the web only offers a withdrawal when the script
 *   supports it. It never carries `request_id`: that is the secret that allows the withdrawal.
 * - doPost {action:"signup"} (sent as text/plain, see src/lib/api.js) -> adds one sign-up
 * - doPost {action:"unsignup", eventId, requestId} -> removes the sign-up row that has BOTH that
 *   event_id and that request_id (never matched by name or by position), after copying the name to
 *   the tab `Baixes`. It does not look at Config!B1 nor at whether the event still exists. It is
 *   the only code that deletes rows.
 *
 * Create it from the sheet (Extensions > Apps Script) so it is bound to that sheet only.
 * @OnlyCurrentDoc
 */

var API_VERSION = 1;
var SHEET_EVENTS = 'Esdeveniments';
var SHEET_SIGNUPS = 'Inscripcions';
var SHEET_CONFIG = 'Config';
// Archive of withdrawn sign-ups; created on the fly by the first unsignup, not by setup().
var SHEET_ARCHIVE = 'Baixes';
var EVENT_COLUMNS = ['id', 'data', 'inici', 'fi', 'tipus', 'nom', 'lloc', 'mapa', 'estat'];
var REQUIRED_EVENT_COLUMNS = ['id', 'data', 'inici', 'tipus', 'nom'];
// Written by hand in J1 and K1; setup() does not create them.
var OPTIONAL_EVENT_COLUMNS = ['responsable', 'inscripcio_url'];
var LOCK_HEADERS = 'Capçalera: no canviar-ne el nom ni la posició (la web la fa servir)';
var LOCK_LISTS = 'Llistes de dates i hores del desplegable (les crea setup)';
var SIGNUP_COLUMNS = ['data_hora', 'event_id', 'nom', 'request_id'];
var ARCHIVE_COLUMNS = ['data_hora_baixa', 'event_id', 'nom', 'request_id'];
var COLUMN_KIND = { data: 'date', inici: 'time', fi: 'time' };
// Days of November 2026 shown by the agenda (Monday 2 to Sunday 29). Same as src/lib/config.js.
var FIRST_DAY = 2;
var LAST_DAY = 29;
// Times offered in the drop-downs of inici and fi, in minutes since 00:00 (08:00 to 22:00).
var FIRST_TIME = 8 * 60;
var LAST_TIME = 22 * 60;
var MAX_SIGNUPS_PER_EVENT = 150;
var MAX_SIGNUPS_TOTAL = 3000;
var LOCK_WAIT_MS = 10000;
var REQUEST_ID_TTL_SECONDS = 600;
// Same rule as src/lib/names.js. The first character is a letter or digit, so a name can
// never start with = + - @ and be read as a formula. This copy is the one that counts.
var NAME_RE = /^[\p{L}\p{N}][\p{L}\p{N} .'’·_-]{0,29}$/u;
var REQUEST_ID_RE = /^[A-Za-z0-9-]{8,64}$/;

function doGet(e) {
  try {
    var action = e && e.parameter && e.parameter.action;
    if (action !== 'agenda') return json_({ ok: false, v: API_VERSION, error: 'bad_request' });
    return json_(readAgenda_());
  } catch (err) {
    console.error(err);
    return json_({ ok: false, v: API_VERSION, error: 'server' });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  var locked = false;
  try {
    var body = parseBody_(e);
    var action = body && body.action;
    if (action !== 'signup' && action !== 'unsignup') return fail_('bad_request');
    var eventId = typeof body.eventId === 'string' ? body.eventId : '';
    var requestId = typeof body.requestId === 'string' ? body.requestId : '';
    if (!eventId || eventId.length > 20 || !REQUEST_ID_RE.test(requestId)) return fail_('bad_request');
    if (action === 'signup') {
      var name = typeof body.name === 'string' ? cleanName_(body.name) : '';
      if (!NAME_RE.test(name)) return fail_('invalid_name');
    }

    locked = lock.tryLock(LOCK_WAIT_MS);
    if (!locked) return fail_('busy');

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var tz = ss.getSpreadsheetTimeZone();
    return action === 'signup' ? signup_(body, ss, tz) : unsignup_(body, ss, tz);
  } catch (err) {
    console.error(err);
    return fail_('server');
  } finally {
    if (locked) lock.releaseLock();
  }
}

// Runs with the lock taken; eventId, requestId and name were already validated by doPost.
function signup_(body, ss, tz) {
  var eventId = body.eventId;
  var requestId = body.requestId;
  var name = cleanName_(body.name);
  if (!isOpen_(ss)) return fail_('closed');

  var eventIds = readTable_(ss.getSheetByName(SHEET_EVENTS), EVENT_COLUMNS, tz).map(function (r) {
    return r.id;
  });
  if (eventIds.indexOf(eventId) === -1) return fail_('unknown_event');

  var cache = CacheService.getScriptCache();
  var signups = readTable_(ss.getSheetByName(SHEET_SIGNUPS), SIGNUP_COLUMNS, tz);
  // A request that already reached the sheet (the answer was lost) must not be written twice.
  if (!cache.get('req:' + requestId)) {
    var forEvent = signups.filter(function (r) {
      return r.event_id === eventId;
    });
    if (forEvent.length >= MAX_SIGNUPS_PER_EVENT) return fail_('event_full');
    if (signups.length >= MAX_SIGNUPS_TOTAL) return fail_('closed');
    appendSignup_(ss, tz, eventId, name, requestId);
    cache.put('req:' + requestId, '1', REQUEST_ID_TTL_SECONDS);
    signups = readTable_(ss.getSheetByName(SHEET_SIGNUPS), SIGNUP_COLUMNS, tz);
  }
  return json_({ ok: true, v: API_VERSION, eventId: eventId, names: namesFor_(signups, eventId) });
}

/**
 * Removes the row of Inscripcions that has this event_id AND this request_id. It does not look at
 * Config!B1 nor at whether the event exists (the web decides when to offer it). Idempotent: when
 * there is no such row the answer is the same with removed:false.
 * Runs with the lock taken; eventId and requestId were already validated by doPost.
 */
function unsignup_(body, ss, tz) {
  var eventId = body.eventId;
  var requestId = body.requestId;
  var sheet = ss.getSheetByName(SHEET_SIGNUPS);

  var rows = readTable_(sheet, SIGNUP_COLUMNS, tz);
  var found = findSignup_(rows, eventId, requestId);
  if (!found) return unsignupAnswer_(eventId, rows, false);

  // The owner may sort or move rows by hand between the two reads: delete only if the same row
  // number still holds the same two values, and never search again.
  var fresh = readTable_(sheet, SIGNUP_COLUMNS, tz);
  var same = fresh.filter(function (r) {
    return r.row === found.row && r.event_id === eventId && r.request_id === requestId;
  })[0];
  if (!same) return unsignupAnswer_(eventId, fresh, false);

  appendArchive_(ss, tz, eventId, same.nom, requestId);
  sheet.deleteRow(same.row);
  SpreadsheetApp.flush();
  var remaining = fresh.filter(function (r) {
    return r.row !== same.row;
  });
  return unsignupAnswer_(eventId, remaining, true);
}

/** The row with this event_id and this request_id; an empty request_id never matches. */
function findSignup_(rows, eventId, requestId) {
  if (requestId === '') return null;
  return (
    rows.filter(function (r) {
      return r.event_id === eventId && r.request_id === requestId;
    })[0] || null
  );
}

function unsignupAnswer_(eventId, signupRows, removed) {
  console.log('unsignup', eventId, 'removed=' + removed);
  return json_({ ok: true, v: API_VERSION, eventId: eventId, names: namesFor_(signupRows, eventId), removed: removed });
}

function readAgenda_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tz = ss.getSpreadsheetTimeZone();
  var eventsSheet = ss.getSheetByName(SHEET_EVENTS);
  var events = readTable_(eventsSheet, EVENT_COLUMNS.concat(OPTIONAL_EVENT_COLUMNS), tz);
  var rows = readTable_(ss.getSheetByName(SHEET_SIGNUPS), SIGNUP_COLUMNS, tz);
  var signups = {};
  events.forEach(function (event) {
    var names = namesFor_(rows, event.id);
    if (names.length) signups[event.id] = names;
  });
  return {
    ok: true,
    v: API_VERSION,
    signupsOpen: isOpen_(ss),
    // Headers of Esdeveniments that were not found (renamed, deleted or moved out of row 1).
    missingColumns: missingColumns_(eventsSheet, REQUIRED_EVENT_COLUMNS),
    events: events,
    signups: signups,
    // What this script can do, so the web only offers what exists (empty on older scripts).
    features: ['unsignup']
  };
}

function missingColumns_(sheet, required) {
  var header = sheet ? sheet.getDataRange().getDisplayValues()[0] || [] : [];
  var names = header.map(function (name) {
    return String(name).trim().toLowerCase();
  });
  return required.filter(function (column) {
    return names.indexOf(column) === -1;
  });
}

function namesFor_(signupRows, eventId) {
  return signupRows
    .filter(function (r) {
      return r.event_id === eventId && r.nom !== '';
    })
    .map(function (r) {
      return r.nom;
    });
}

function appendSignup_(ss, tz, eventId, name, requestId) {
  var sheet = ss.getSheetByName(SHEET_SIGNUPS);
  if (!sheet) throw new Error('Falta la pestanya ' + SHEET_SIGNUPS);
  var stamp = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd'T'HH:mm:ss");
  var range = sheet.getRange(sheet.getLastRow() + 1, 1, 1, SIGNUP_COLUMNS.length);
  // Plain text format first: a second barrier so nothing written here is ever evaluated as a formula.
  range.setNumberFormat('@');
  range.setValues([[stamp, eventId, name, requestId]]);
  SpreadsheetApp.flush();
}

function appendArchive_(ss, tz, eventId, name, requestId) {
  var sheet = ensureSheet_(ss, SHEET_ARCHIVE, ARCHIVE_COLUMNS);
  var stamp = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd'T'HH:mm:ss");
  var range = sheet.getRange(sheet.getLastRow() + 1, 1, 1, ARCHIVE_COLUMNS.length);
  // Plain text format first, as in appendSignup_.
  range.setNumberFormat('@');
  range.setValues([[stamp, eventId, name, requestId]]);
  SpreadsheetApp.flush();
}

/**
 * Reads a tab by header name, not by column position, so reordering columns does not break it.
 * Cells that Sheets turned into dates/times are converted back to YYYY-MM-DD and HH:MM.
 * Each row carries `row`, its row number in the sheet, to point at typos.
 */
function readTable_(sheet, columns, tz) {
  if (!sheet) return [];
  var range = sheet.getDataRange();
  var raw = range.getValues();
  var shown = range.getDisplayValues();
  if (shown.length < 2) return [];
  var index = {};
  shown[0].forEach(function (header, i) {
    index[String(header).trim().toLowerCase()] = i;
  });
  var rows = [];
  for (var r = 1; r < shown.length; r++) {
    var row = { row: r + 1 };
    var empty = true;
    columns.forEach(function (name) {
      var c = index[name];
      var text = c === undefined ? '' : cellText_(raw[r][c], shown[r][c], COLUMN_KIND[name], tz);
      if (text !== '') empty = false;
      row[name] = text;
    });
    if (!empty) rows.push(row);
  }
  return rows;
}

function cellText_(value, display, kind, tz) {
  if (value instanceof Date && kind) {
    return Utilities.formatDate(value, tz, kind === 'time' ? 'HH:mm' : 'yyyy-MM-dd');
  }
  return String(display).trim();
}

function isOpen_(ss) {
  var sheet = ss.getSheetByName(SHEET_CONFIG);
  if (!sheet) return true;
  return String(sheet.getRange('B1').getDisplayValue()).trim().toUpperCase() !== 'NO';
}

function cleanName_(value) {
  return value.normalize('NFC').replace(/\s+/g, ' ').trim();
}

function parseBody_(e) {
  var contents = e && e.postData && e.postData.contents;
  if (typeof contents !== 'string' || contents.length > 2000) return null;
  try {
    return JSON.parse(contents);
  } catch (err) {
    return null;
  }
}

function json_(object) {
  return ContentService.createTextOutput(JSON.stringify(object)).setMimeType(
    ContentService.MimeType.JSON
  );
}

// Always HTTP 200: a non-200 answer from Apps Script comes without CORS headers
// and the page could not tell what went wrong.
function fail_(error) {
  return json_({ ok: false, v: API_VERSION, error: error });
}

/**
 * Run once from the Apps Script editor (select "setup" > Run). It creates the three tabs
 * with their headers, plain-text columns, drop-down lists and a confirmation warning on the
 * headers. It never overwrites events, sign-ups or the open/closed switch, so running it
 * again is safe (it rebuilds the lists and the protections).
 */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var config = ss.getSheetByName(SHEET_CONFIG) || ss.insertSheet(SHEET_CONFIG);
  if (config.getRange('A1').getDisplayValue() === '') {
    config.getRange('A1:C1').setValues([['inscripcions_obertes', 'SI', 'Posa NO per tancar les inscripcions']]);
  }
  // Lists for the drop-downs of dates and times. Only list-based rules are used, never custom
  // formulas: Sheets reads those with the sheet's locale (; or , as separator) and rejects them.
  var dates = validDates_();
  var times = validTimes_();
  writeList_(config, 5, 'dates_valides', dates);
  writeList_(config, 6, 'hores_valides', times);

  var events = ensureSheet_(ss, SHEET_EVENTS, EVENT_COLUMNS);
  // Frozen header: "Data > Sort sheet" leaves a frozen row 1 in place instead of sorting it with the events.
  events.setFrozenRows(1);
  events.getRange('A:I').setNumberFormat('@');
  var rules = [
    ['E2:E', SpreadsheetApp.newDataValidation().requireValueInList(['Acció', 'Acte'], true)],
    ['I2:I', SpreadsheetApp.newDataValidation().requireValueInList(['Cancel·lat', 'Modificat'], true)],
    ['B2:B', SpreadsheetApp.newDataValidation().requireValueInRange(config.getRange(2, 5, dates.length, 1), true)],
    ['C2:D', SpreadsheetApp.newDataValidation().requireValueInRange(config.getRange(2, 6, times.length, 1), true)]
  ];
  rules.forEach(function (rule) {
    events.getRange(rule[0]).setDataValidation(rule[1].setAllowInvalid(false).build());
  });

  var signups = ensureSheet_(ss, SHEET_SIGNUPS, SIGNUP_COLUMNS);
  signups.setFrozenRows(1);
  signups.getRange('A:D').setNumberFormat('@');

  // Warning-only protection: the owner is the only editor, so a hard lock would not stop an
  // accidental edit. Sheets asks for confirmation before changing a protected cell.
  lockRange_(events, 'A1:I1', LOCK_HEADERS);
  lockRange_(signups, 'A1:D1', LOCK_HEADERS);
  lockRange_(config, 'E1:F' + (times.length + 1), LOCK_LISTS);
}

/**
 * Protects a range with a confirmation warning. It removes the protection this function created
 * before (matched by description), so running setup again never stacks duplicates.
 */
function lockRange_(sheet, a1, description) {
  sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE).forEach(function (protection) {
    if (protection.getDescription() === description) protection.remove();
  });
  sheet.getRange(a1).protect().setDescription(description).setWarningOnly(true);
}

/** The days shown by the agenda, as YYYY-MM-DD. */
function validDates_() {
  var dates = [];
  for (var day = FIRST_DAY; day <= LAST_DAY; day++) dates.push('2026-11-' + (day < 10 ? '0' : '') + day);
  return dates;
}

/** Allowed start and end times, as HH:MM in steps of 5 minutes (first and last included). */
function validTimes_() {
  var times = [];
  for (var minutes = FIRST_TIME; minutes <= LAST_TIME; minutes += 5) {
    var h = Math.floor(minutes / 60);
    var m = minutes % 60;
    times.push((h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m);
  }
  return times;
}

function writeList_(sheet, column, header, values) {
  // The list can be shorter than in a previous run, so clear the whole column first.
  sheet.getRange(1, column, sheet.getMaxRows(), 1).clearContent();
  var range = sheet.getRange(1, column, values.length + 1, 1);
  range.setNumberFormat('@');
  range.setValues(
    [[header]].concat(
      values.map(function (value) {
        return [value];
      })
    )
  );
}

function ensureSheet_(ss, name, columns) {
  var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, columns.length).setNumberFormat('@').setValues([columns]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}
