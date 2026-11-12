# apps-script

## Overview
Backend of the agenda: a Google Apps Script web app bound to one Google Sheet, plus an in-memory Google fake that lets Node run the real `Code.gs` in tests and in the browser end-to-end tests. `Code.gs` is deployed by hand (see the root [README](../README.md)); it is not built by this repository.

## Interface
- [Code.gs](./Code.gs):
  - `doGet(e)`: `?action=agenda` → `{ ok, v, signupsOpen, missingColumns, events, signups, features: ['unsignup'] }`; any other action → `bad_request`.
  - `doPost(e)`: JSON body with `action` `signup` (`eventId`, `name`, `requestId`) or `unsignup` (`eventId`, `requestId`). Error codes: `bad_request`, `invalid_name`, `busy`, `closed`, `unknown_event`, `event_full`, `server`. All answers are HTTP 200 JSON with `v: API_VERSION` (1).
  - `setup()`: run once from the editor; creates/updates the `Config`, `Esdeveniments` and `Inscripcions` tabs, drop-down lists and warning-only header protections. `Baixes` (archive) is created by the first `unsignup`.
  - Sheet names/columns: `Esdeveniments` (`id, data, inici, fi, tipus, nom, lloc, mapa, estat` + optional `responsable`, `inscripcio_url`), `Inscripcions` (`data_hora, event_id, nom, request_id`), `Baixes` (`data_hora_baixa, event_id, nom, request_id`), `Config!B1` (`NO` closes sign-ups).
- [appsscript.json](./appsscript.json): manifest (`Europe/Madrid`, V8, scope `spreadsheets.currentonly`, web app executed as the deployer, `ANYONE_ANONYMOUS` access).
- [fake-google.js](./fake-google.js): `createScript({ events, signups, config, now, lockFails, beforeRead })` → `{ context, sheets, state, logs, get, post }`; constants `EVENT_HEADER`, `EVENT_HEADER_OPTIONAL`, `SIGNUP_HEADER`. Used by [Code.test.js](./Code.test.js) and by `e2e/script.js`.

## Invariants
- `doPost` validates before locking: `eventId` non-empty and ≤ 20 chars, `requestId` matches `REQUEST_ID_RE` (`[A-Za-z0-9-]{8,64}`), name matches `NAME_RE` (first char letter or digit); body ≤ 2000 chars; then takes the script lock (`LOCK_WAIT_MS` 10000) and answers `busy` if it cannot.
- Sign-up is idempotent per `requestId` (cache key `req:<requestId>`, TTL `REQUEST_ID_TTL_SECONDS` 600); caps `MAX_SIGNUPS_PER_EVENT` (150 → `event_full`) and `MAX_SIGNUPS_TOTAL` (3000 → `closed`); `Config!B1` = `NO` → `closed`.
- `unsignup` is the only code that deletes rows: it matches the row by both `event_id` and `request_id` (never by name or position), re-reads before deleting and deletes only if the same row number still holds both values, copies the name to `Baixes` first, and is idempotent (`removed: false` when nothing matches). It ignores `Config!B1` and whether the event still exists.
- `request_id` is never included in `doGet` output.
- Cells written by the script are formatted as plain text (`@`) first so values are never evaluated as formulas.
- Tables are read by header name (trimmed, lower-cased), not column position; rows carry their sheet `row`; fully empty rows are skipped.
- `FIRST_DAY`/`LAST_DAY` (2–29) and `NAME_RE` must stay in sync with `src/lib/config.js` and `src/lib/names.js`.
- Errors are always returned with HTTP 200 (`fail_`) so the browser sees CORS headers.

## Side Effects
- Reads and writes the bound spreadsheet (`Inscripcions`, `Baixes`, `Config`, `Esdeveniments` in `setup`); deletes rows in `Inscripcions`; creates tabs via `insertSheet`.
- `LockService` script lock, `CacheService` script cache, `console.log`/`console.error` (Stackdriver).
- [fake-google.js](./fake-google.js): reads `Code.gs` from disk and evaluates it in a `node:vm` context; no network or disk writes.

## Verification
- Run: `npm test` (`node --test "src/lib/**/*.test.js" "apps-script/*.test.js"`)
- Fake-sheet tests do not replace the real-deployment checks in the root [README](../README.md).
