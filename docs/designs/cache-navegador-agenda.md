# Faster agenda load with a browser cache

*   **Author:** Juan Peist
*   **Status:** Draft, revised after the EGM review (2026-11-14)
*   **Date:** 2026-11-14

--------------------------------------------------------------------------------

## Overview

The agenda page loads its data with one request to the Apps Script web app: `GET <exec-url>?action=agenda`, plus `&d=<slug>` on a district page. Today that request takes 5-10 s and the page shows "loading" until it ends. This design makes repeat visits show the last known agenda at once and refresh it in the background (stale-while-revalidate). It reuses the copy of the agenda that the client already keeps in `localStorage`. The server and the hosting do not change.

Terms used below:

*   **Stored copy:** the JSON of the last successful agenda response, saved by `fetchAgenda` in [api.js](../../src/lib/api.js) under the key `agenda-<district-slug>-2026-11` as `{ at, json }`, where `at` is the save time in milliseconds. There is one copy per district. The `2026-11` part is a fixed string in `storageKey` ([districts.js](../../src/lib/districts.js)), not a date that changes, so there is no month rollover.
*   **Live data:** the response of the network request.
*   **Silent load:** `load({ silent: true })` in [+page.svelte](<../../src/routes/[[districte]]/+page.svelte>). It refreshes the view without a loading screen and never shows errors.
*   **`staleSince`:** a field on the loaded agenda that is set only when the network failed and an old stored copy is shown instead. The page then shows the notice "Dades guardades…".
*   **`?e=<id>` link:** a shared link that opens the detail of one event.

## The Problem

Every visit and every reload waits for the Apps Script request. `fetchAgenda` always sends `cache: 'no-store'`, and the page reads the stored copy only when the network fails. The sheets have fewer than 10 rows, so the delay is not data volume. It most likely comes from the Apps Script cold start and the redirect to `script.googleusercontent.com`. This has not been measured (see Measurement).

Facts that shape the solution:

*   The author accepts data up to 5 minutes old for other people's changes.
*   Organizers edit the sheet by hand 2-3 times a day per district.
*   Hosting stays static plus Apps Script.

## Goals

*   A repeat visit shows the agenda from the stored copy without waiting for the network.
*   The live data replaces the view as soon as it arrives, and the stored copy is updated.
*   The stored copy is shown first only if it is at most `MAX_COPY_AGE_MS` old (1 hour).
*   Showing the stored copy never looks like an error or an offline state.
*   Signing up from stale data stays safe: the server validates against the live sheet, and the page refreshes and shows the existing message when the event is full, gone or closed.
*   Success is measured with the method in Measurement.

## Non-Goals

*   No server cache (`CacheService`), no `onEdit`/`onChange` triggers and no warm-up ping.
*   No change to the Apps Script response format or to `signup_`/`unsignup_`.
*   No new infrastructure and no publishing of the sheet as CSV or JSON.
*   Making the first-ever visit fast. It stays as slow as the request.
*   Reducing the Apps Script time itself (for example reading each sheet once). It can be a separate change if measurements show it matters.
*   Cross-device freshness: each browser keeps its own copy.
*   Updating the stored copy with the user's own signup or cancellation (see Decisions). After a reload the names list can lack the user's own change until live data arrives.
*   Freezing open dialogs while live data arrives (see Decisions).

## Decisions (made by the author)

*   **Maximum copy age:** `MAX_COPY_AGE_MS` is 1 hour. An older copy is not shown first and the page waits for the network. Accepted cost: while the live request runs, a visitor can see content up to 1 hour old.
*   **Open dialogs:** no snapshots. Dialogs keep reading their event from `data`, as today, so a live refresh can change or close an open dialog. This is existing behaviour (`openSignup` already starts a silent load). The server errors `unknown_event`, `event_full` and `closed` cover a signup on an event that changed.
*   **Shared `?e=<id>` links:** if the stored copy lacks the linked event, the page keeps the loading state until live data arrives, then opens the detail or shows "not found". If the copy has the event, the detail opens at once. If the live request fails in that case, the existing fallback applies: the page shows the stored copy with the "Dades guardades…" notice and "not found" for the event.
*   **Places left:** shown from the stored copy as is, with no marker, until live data replaces it.
*   **First visit or expired copy:** the current loading text stays. No extra hint.
*   **Own writes:** the stored copy is not patched after the user's own signup or cancellation. The user's own signups are already kept apart in `localStorage` (`addMine`/`removeMine`). After a reload within the allowed age, the names list from the copy can lack the user's change for 5-10 s, until live data arrives.
*   **Live request fails while the copy is shown:** the copy stays, with no notice and no error, whatever its age. A copy up to 1 hour old can therefore stay on screen. This is accepted even though it exceeds the 5-minute tolerance.
*   **Signup recovery with a stale count:** `recover()` in [api.js](../../src/lib/api.js) confirms a signup when the live list has more names than `knownCount` and includes the name. `knownCount` can now come from an old copy. If the POST response is lost and someone with the same name signed up in between, `recover()` can report success wrongly. This is accepted and documented, not fixed.

## Open Questions

*   None.

## Critical User Journeys (CUJs)

### CUJ 1: Repeat visit within the allowed age

*   **Given**: The browser holds an agenda copy for this district that is at most `MAX_COPY_AGE_MS` old.
*   **When**: The user opens or reloads the page.
*   **Then**: The calendar renders from the copy without a loading screen. The live request runs in the background. When it succeeds, the view and the copy update. If it fails, the copy stays and no error is shown.

### CUJ 2: First visit or expired copy

*   **Given**: No stored copy, or one older than `MAX_COPY_AGE_MS`.
*   **When**: The user opens the page.
*   **Then**: The page shows the loading state until the live request ends, as today. If the request fails and a copy of any age exists, the existing offline notice (`staleSince`) applies.

### CUJ 3: Signing up from stale data

*   **Given**: The page shows data from the stored copy.
*   **When**: The user signs up for an event that was filled, deleted or closed after the copy was saved.
*   **Then**: The server rejects it (`event_full`, `unknown_event` or `closed`), the dialog shows the existing text for that error, and the page runs a silent load so the calendar shows the live state.

## Technical Plan (Architecture)

The change is client-only. [api.js](../../src/lib/api.js) gets a way to read the stored copy by itself, with an age limit. [+page.svelte](<../../src/routes/[[districte]]/+page.svelte>) renders that copy first and then runs the silent load. The Apps Script and its response format do not change.

```text
onMount
  |
  |-- copy = api.loadCopy?.()        (stored copy, only if age <= MAX_COPY_AGE_MS)
  |     |-- copy exists and (no ?e= link, or the copy has that event)
  |     |       -> apply(copy), status = 'ready'      (no loading screen)
  |     |       -> silent load (not awaited)
  |     |-- otherwise
  |             -> status = 'loading'; await load()   (as today)
  |
  |-- link/anchor step, once, after the first render (copy or live)
```

### Behaviour

*   **Reading the copy.** `loadCopy()` reads the stored copy with the existing `readCopy` and `parseAgenda`. It returns `null` if the copy is missing, corrupt, has no valid `at`, has `at` in the future, or is older than `MAX_COPY_AGE_MS` (a constant in [config.js](../../src/lib/config.js)). Only a successful live fetch refreshes `at`.
*   **First render.** If `loadCopy()` returns data, the page applies it with `staleSince: null`, so no offline notice appears. No separate "revalidating" flag is needed because nothing marks the copy as stale (see Decisions, Places left).
*   **Live refresh.** After the copy is shown, the page starts a silent load. A failed silent load changes nothing. A successful one replaces `data`. `staleSince` keeps its meaning, and a silent load still drops results that carry `staleSince`. Showing a copy sets `lastLoad`, so the visibility refresh waits `REFRESH_AFTER_MS` after the first render.
*   **Shared links.** `parseEventParam` is read before the first render. If a `?e=<id>` link is present and the copy has no event with that id, the copy is not applied and the page runs the normal loading path. If the copy has the event, the page opens the detail from it after the first render.
*   **Link/anchor step.** The existing step after the first load (open the linked detail, or `anchorToUpcoming`) runs exactly once, after the first render of either path.
*   **Stale signup errors.** When `signup` returns `event_full`, `unknown_event` or `closed`, the page starts a silent load. The dialog texts already exist in [texts.js](../../src/lib/texts.js). For `closed` the existing local update (`signupsOpen = false`) stays.
*   **Open dialogs.** No change from today: dialogs derive their event from `data` and follow live refreshes. The e2e test in [detail.spec.js](../../e2e/detail.spec.js) where the event disappears on reload with the detail open stays valid.
*   **Loads that overlap a signup.** A silent load that started before a signup can finish after it and replace the names. This already happens today with the silent load in `openSignup`. It is not addressed here.

### Interfaces

*   `AgendaApi.loadCopy?(): { agenda: Agenda, at: number } | null`: new, optional and synchronous. The page calls `api.loadCopy?.()`, so the mock in [mock-api.js](../../src/lib/mock-api.js) needs no change.
*   `AgendaApi.loadAgenda()`: unchanged behaviour and return type.
*   `createApi` options: unchanged. Tests control the age through the existing `now` option.

### Measurement

Same method before and after the change, so the numbers are comparable.

*   **Baseline (server request).** Run `curl -sL -o /dev/null -w 'ttfb=%{time_starttransfer} total=%{time_total} redirs=%{num_redirects}\n' "<exec-url>?action=agenda"` about 20 times for the root and for one district. "Cold" means after about 30 minutes without requests to the script. "Warm" means right after another request.
*   **Browser.** In Chrome DevTools, record time to first calendar render on a reload with a fresh copy, and time to live data in the Network tab. No timing code is added to the app.
*   **Where to record.** In the pull request description, next to the change.
*   **Pass criterion.** On a reload within `MAX_COPY_AGE_MS`, the calendar is visible before the live response ends, and its first render is under 1 s on a desktop browser. The e2e tests check the ordering with a delayed response, not the 1 s figure.

## Alternatives Considered

### Alternative A: Server cache (`CacheService`) with `onEdit`/`onChange` triggers and a long TTL

*   **Pros**: Fewer sheet reads. Manual edits could clear the cache, which allows a long TTL.
*   **Cons**: It helps only the first visitor in each cache window. The cold start and the redirect stay. `onEdit` does not fire for script or API edits, and formulas such as `TODAY()` change without an edit. Installable triggers fail silently when authorization is lost. They need the OAuth scope `script.scriptapp`, a new deployment and a manual install.
*   **Reason for Rejection**: Rejected by author: it adds more problems than it solves for a sheet of fewer than 10 rows.

### Alternative B: Server cache with a short TTL (5 minutes or less), no triggers

*   **Pros**: Meets the 5-minute tolerance without triggers. A version counter bumped under the script lock in `signup_`/`unsignup_` avoids the read/write race.
*   **Cons**: Same limits on the first visitor and on cold start. Needs a kill switch, a guard for the 100 KB value limit, care not to clear `req:` idempotency keys, and a bigger fake in `fake-google.js`.
*   **Reason for Rejection**: Rejected by author: the browser copy gives the visible improvement without server changes. It can be reconsidered if measurements show the sheet read dominates.

### Alternative C: Publish the sheet as CSV or JSON and read it directly

*   **Pros**: Skips Apps Script and its cold start for reads.
*   **Cons**: Exposes signup names publicly, moves the join of events and signups to the client, and adds a second data path.
*   **Reason for Rejection**: Rejected by author: the privacy risk and the second data path outweigh the speed gain.

### Alternative D: Pre-built static JSON written to Drive or GitHub by a time trigger

*   **Pros**: Reads come from static hosting.
*   **Cons**: Adds a publishing target, CORS handling and another trigger, and goes beyond "no new infrastructure".
*   **Reason for Rejection**: Rejected by author: it needs new infrastructure and has the trigger risks of Alternative A.

### Alternative E: Patch the stored copy with the user's own signup, and freeze open dialogs

*   **Pros**: A reload right after a signup shows the user's name from the copy. A dialog does not change while the user types.
*   **Cons**: Adds a second write path into the stored JSON, a race with loads already in flight, and a snapshot of the event per dialog. The snapshot breaks the `?e=` link path and the existing "not found" behaviour.
*   **Reason for Rejection**: Rejected by author: the extra code and risk are not worth removing a 5-10 s gap that already exists today in similar form.

### Alternative F: Server-side cleanup only (read each sheet once, index signups by event id)

*   **Pros**: Removes about eight sheet calls per request, with no cache.
*   **Cons**: Its effect is unknown until measured, and it does nothing for cold start or the redirect.
*   **Reason for Rejection**: Deferred, not rejected: it can follow as a separate change after the baseline measurement.

## Detailed Implementation

Paths are relative to this file. No Apps Script file changes.

1.  **[config.js](../../src/lib/config.js)**: add `export const MAX_COPY_AGE_MS = 3_600_000` next to `REQUEST_TIMEOUT_MS`, with a one-line comment: the longest age at which a stored copy is shown before live data arrives.
2.  **[api.js](../../src/lib/api.js)**:
    *   Add `loadCopy()`: call `readCopy()`. Return `null` if there is no copy, `at` is not a finite number, `at > now()`, or `now() - at > MAX_COPY_AGE_MS`. Otherwise return `{ agenda, at }`. A copy at exactly the limit is valid.
    *   Add `loadCopy` as an optional member of the `AgendaApi` typedef.
    *   `loadAgenda`, `fetchAgenda`, `recover`, `signup` and `unsignup` stay as they are.
3.  **[+page.svelte](<../../src/routes/[[districte]]/+page.svelte>)**:
    *   In `onMount`, after `api` is created and before the first load: read `linkedId = parseEventParam(location.search)` and `copy = api.loadCopy?.() ?? null`.
    *   If `copy` exists and (`linkedId === null` or `copy.agenda.events` has an event with `id === linkedId`): call `apply({ ...copy.agenda, staleSince: null })`, start `load({ silent: true })` without awaiting it, then run the link/anchor step. Otherwise keep today's path: `await load()`, stop if `status !== 'ready'`, then run the link/anchor step.
    *   Move the link/anchor step into one local function used by both paths, so it runs once.
    *   In `signup`, when `result.error` is `event_full`, `unknown_event` or `closed`, call `load({ silent: true })`. Keep the existing `closed` update.
4.  **[api.test.js](../../src/lib/api.test.js)**: add tests for `loadCopy`: no copy, corrupt JSON, missing or non-numeric `at`, `at` in the future, expired, exactly at the limit, and a valid copy. Use the injected `now` and `storage`.
5.  **[script.js](../../e2e/script.js)**: add a delay option to `ScriptOptions` so a spec can hold back the `?action=agenda` response. The new spec needs it.
6.  **[helpers.js](../../e2e/helpers.js)**: add a helper to seed the stored copy (`agenda-<slug>-2026-11`) with a chosen `at`.
7.  **New `e2e/cache.spec.js`** (in [e2e/](../../e2e)), with these cases:
    *   A reload with a young copy shows the calendar before a delayed live response, then the view updates.
    *   A failed live response after a young copy keeps the calendar and shows neither an error nor the "Dades guardades…" notice.
    *   A copy older than 1 hour is not shown first: the loading text appears until the live response ends.
    *   A `?e=` link whose event is missing from the copy waits for live data, then opens the detail.
    *   A `?e=` link whose event is missing from the copy with a failed live response shows the copy with the notice and "not found".
    *   A signup that returns `event_full` triggers a new `?action=agenda` request.
8.  **Existing e2e specs** ([e2e/](../../e2e)): find tests that assume a reload or a second visit shows "loading", or that an offline reload shows the "Dades guardades…" notice with a young copy, and adjust them to the new rules. A young copy now shows with no notice.
9.  **[src/lib/README.md](../../src/lib/README.md)**: document `loadCopy` and `MAX_COPY_AGE_MS`. Update the sentence that says `loadAgenda` uses the stored copy "only when the network fetch fails" to add that the page also shows a copy at most `MAX_COPY_AGE_MS` old first.
10. **[src/routes/README.md](../../src/routes/README.md)**: document the copy-first render, the shared-link rule, the once-only link/anchor step and the silent load after `event_full`, `unknown_event` and `closed`. Update the invariant at line 14 so it says a silent load still ignores results with `staleSince`.
11. **[README.md](../../README.md)**: in the line about the `localStorage` key `agenda-<slug>-2026-11` (offline copy), say that it is also shown first for up to 1 hour.
12. **[e2e/README.md](../../e2e/README.md)**: list the new spec and the delay option.
13. **[TODO.md](../../TODO.md)**: update the line "Caché de la agenda con CacheService…" to say that the browser cache was done in this design and the server cache was rejected.

### Verification

*   `npm run check`.
*   `npm test` (runs [api.test.js](../../src/lib/api.test.js) and the other unit tests).
*   `npm run test:e2e` for the new and the existing specs.
*   The measurement in Measurement, recorded in the pull request description.
