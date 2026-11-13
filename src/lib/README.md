# src/lib

## Overview
Framework-agnostic logic of the agenda web app: configuration constants, parsing and normalisation of sheet rows, the Apps Script client (real and mock), per-browser sign-up records, share/poster helpers and all user-facing Catalan texts. Modules are plain ES modules imported through the `#lib/*` alias (`package.json` `imports`). Svelte UI lives in [components](./components/README.md).

## Interface
- [config.js](./config.js): `MONTH` (2026-11, days 2–29), `TIME_ZONE` (`Europe/Madrid`), `MAX_NAME_LENGTH` (30), `MAX_MANAGER_LENGTH` (60), `REQUEST_TIMEOUT_MS` (15000), `STORAGE_KEY`, `MY_SIGNUPS_KEY`, `POSTER` (2048×1346).
- [events.js](./events.js): `normalizeEvents(rows, month)` → `{ events, skipped }`, `groupByDate`, `parseType`, `parseStatus`, `httpsUrl`, `mapsUrl`, `parseEventParam`, `formatHour`, `formatRange`, `ID_RE`; typedefs `AgendaEvent`, `EventType`, `SkippedRow`.
- [month.js](./month.js): `buildMonth(range)`, `isoDate`, `todayIso(now)`; typedefs `Day`, `MonthRange`.
- [api.js](./api.js): `createApi({ url, fetchFn, storage, now, timeoutMs, uuid })` → `AgendaApi` (`loadAgenda`, `signup`, `unsignup`), `parseAgenda(json)`, `browserStorage()`; typedefs `Agenda`, `LoadedAgenda`, `SignupResult`, `UnsignResult`, `AgendaApi`.
- [mock-api.js](./mock-api.js): `createMockApi({ delay, storage })` → `AgendaApi` with in-memory sample events (dev only).
- [my-signups.js](./my-signups.js): `readMine`, `addMine`, `removeMine`, `mineForEvent`; typedef `MySignup`.
- [names.js](./names.js): `cleanName`, `validateName` (`'empty' | 'invalid_name'` errors).
- [state.js](./state.js): `participationState(event, { today, signupsOpen })` → `'past' | 'cancelled' | 'external' | 'closed' | 'open'`.
- [share.js](./share.js): `detailUrl`, `shareText(event, dateLabel, url)` (builds the multi-line share text: title, date, time, place and link, omitting empty lines), `waLink`, `shareImage` (`'shared' | 'aborted' | 'needs-second-tap' | 'unsupported' | 'error'`), `downloadFile`.
- [poster.js](./poster.js): `renderPoster(node, id)` → `Promise<File>` (`agenda-<id>.png`).
- [poster-scale.js](./poster-scale.js): `posterScale(name, place)` → scale factor of the poster text (`1.9`, `1.5`, `1.15` or `1`) by character count.
- [texts.js](./texts.js): `T`, the single object with every Catalan UI string (including `T.signupErrors` keyed by error code).
- [index.js](./index.js): comment-only placeholder for the `#lib` alias; exports nothing.
- Subdirectories: [components/](./components/README.md) (Svelte components). `assets/` holds only `favicon.svg` and has no contract.

## Invariants
- [events.js:normalizeEvents](./events.js) never throws on bad rows: invalid rows (bad `ID_RE` id, duplicate id, missing/out-of-range date, bad `HH:MM` start, empty name) go to `skipped`; `end` is kept only when it is a valid time after `start`; output is sorted by date, start, end, then sheet order.
- [events.js:httpsUrl](./events.js) accepts only `https://` links without whitespace; `externalUrl` and custom map URLs go through it.
- [config.js](./config.js) day range (`MONTH.firstDay`/`lastDay`) must match `FIRST_DAY`/`LAST_DAY` in `apps-script/Code.gs`; [names.js:NAME_RE](./names.js) must match `NAME_RE` in `Code.gs` (server rule is authoritative; first character is a letter or digit so names cannot start with `= + - @`).
- [api.js:createApi](./api.js): POSTs are sent as `text/plain;charset=utf-8` with a JSON string body and no custom headers (Apps Script cannot answer CORS preflights); `parseAgenda` requires `ok === true`, `v === 1` and an `events` array, else throws `bad_response`.
- [api.js](./api.js) `signup` never resends blindly after a failed/unreadable answer: `recover` re-reads the agenda and succeeds only if the name appears and the count exceeds `knownCount`; otherwise `network` or `unconfirmed`.
- [api.js](./api.js) `unsignup` removes the local record (`removeMine`) only when the server answers `ok` with `names` and a boolean `removed`; network failure returns `{ ok: false, error: 'network' }` without recovery.
- [api.js](./api.js) `loadAgenda` falls back to the stored copy (`staleSince` = copy timestamp) only when the network fetch fails; with no valid copy the original error is rethrown.
- [my-signups.js](./my-signups.js) storage format is `{ v: 1, items }`; corrupt JSON, wrong version, missing storage or malformed items read as an empty list, and all storage failures are swallowed.
- [state.js:participationState](./state.js) priority is past, cancelled, external, closed, open.
- [poster.js](./poster.js) rejects with `Error('image_failed')` when the font is missing, the PNG is fully transparent after one retry, or 20 s (`TIMEOUT_MS`) elapse.
- [share.js:shareImage](./share.js) awaits nothing before `nav.share` so the tap keeps its user activation; with `second: true` a `NotAllowedError` becomes `'error'`.
- [share.js:detailUrl](./share.js) uses only `origin` + `pathname` + `?e=<id>`, never other query parameters (such as `?admin`).
- [mock-api.js](./mock-api.js) mirrors the `Code.gs` contract and advertises `features: ['unsignup']`.

## Side Effects
- [api.js](./api.js): `fetch` GET `<url>?action=agenda` and POSTs to `<url>`; writes `STORAGE_KEY` (offline copy) and, via `my-signups.js`, `MY_SIGNUPS_KEY` in `localStorage`; sets/clears an abort timer.
- [my-signups.js](./my-signups.js): reads and writes `localStorage` key `MY_SIGNUPS_KEY`.
- [mock-api.js](./mock-api.js): `setTimeout` delay, mutates in-memory sign-ups, uses `crypto.randomUUID`, writes `MY_SIGNUPS_KEY`.
- [poster.js](./poster.js): loads fonts (`document.fonts.load`), creates object URLs, an `Image` and a canvas, and renders through `html-to-image` `toBlob`.
- [share.js](./share.js): `navigator.share`, creates a temporary `<a download>` appended to `document.body`, `URL.createObjectURL` (revoked after 60 s) or `window.open`.
- [month.js:todayIso](./month.js): reads the current time via `Intl.DateTimeFormat`.

## Verification
- Run: `npm test` (`node --test "src/lib/**/*.test.js" "apps-script/*.test.js"`)
- Types: `npm run check`
