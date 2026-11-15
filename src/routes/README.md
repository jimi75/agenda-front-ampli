# src/routes

## Overview
SvelteKit routes. A static page, `[[districte]]`, served at `/` (root district) and at `/<slug>` for each routed district, loads the agenda and orchestrates the calendar and dialogs. `/galetes` is the static cookies policy. The shared layout loads fonts and the favicon, manages consent and provides analytics.

## Interface
- [+layout.js](./+layout.js): `export const prerender = true`.
- [+layout.svelte](./+layout.svelte): loads fonts and favicon; creates browser analytics (`VITE_GA_ID`, storage, DOM, landing URL and base cookie path), publishes `setContext('analytics', analytics)` and calls `load(districte)` during component initialization if consent is granted, before the child page's mount. Prerender uses an inactive instance. Renders `children`, `Footer` and, after hydration when needed, `ConsentBanner`; deciding focuses `main` without scrolling.
- [galetes/+page.svelte](./galetes/+page.svelte): prerendered cookies policy from `T.cookiesPage`, fixed cookie table, responsible/contact and link back to the root. No `Header` or district context; analytics uses `districte=cap`.
- [[[districte]]/+page.js](<./[[districte]]/+page.js>): `entries()` (one entry per `ROUTED_DISTRICTS`) and `load({ params })` → `{ district }` (`ROOT_DISTRICT` without parameter; `error(404)` for an unknown slug).
- [[[districte]]/+page.svelte](<./[[districte]]/+page.svelte>): the agenda page; publishes `setContext('district', district)` and emits the `<title>`, `description`, `og:title` and `og:description` in `<svelte:head>` (so each prerendered HTML has its own). Composes `Header`, `Legend`, `Calendar`, `EventDetail` and `SignupDialog` from [components](../lib/components/README.md); uses `createApi` (or `createMockApi` in dev), `normalizeEvents`, `groupByDate`, `parseEventParam`, `buildMonth`, `todayIso`, `readMine(…, mineKey(district))`, `shareUrl` and `participationState` from [lib](../lib/README.md). Reads the analytics context to track detail views, signup starts/results and removals. Local state: `status` (`loading | ready | error`), `data`, `detailId`, `signupId`, `mine`, `today`, `showAdmin`.

## Invariants
- One manual `page_view` per loaded page after consent; no events collected before consent are replayed. Links between `/galetes` and the agenda have `data-sveltekit-reload`; changing district also loads a new page.
- [[[districte]]/+page.svelte](<./[[districte]]/+page.svelte>) picks the API in `onMount`: `VITE_AGENDA_API_URL` set → `createApi`; else `import.meta.env.DEV` → `createMockApi` (dynamic import); else `status = 'error'`.
- On mount, a valid `api.loadCopy()` is rendered at once (`staleSince: null`, no offline notice) and a silent load follows. If `?e=` names an event missing from the copy, or there is no valid copy, the page waits for live data. A `event_full`, `unknown_event` or `closed` signup error triggers a silent reload.
- A silent refresh (`load({ silent: true })`) never replaces fresh data with a stale offline copy (`staleSince !== null`) and never shows errors; refresh on `visibilitychange` happens only after `REFRESH_AFTER_MS` (120000) and while `status === 'ready'`.
- The `?e=<id>` link is read once after the first successful load via `parseEventParam`; with no link, the list scrolls to the next day with events, unless the page is already scrolled or that day is already visible.
- `unreadable` (no valid events and `missingColumns` or skipped rows present) shows an error with retry instead of an empty calendar.
- The `?admin` query parameter reveals the diagnostics block (features, local sign-ups, missing columns of `eventsTabName(district)`, skipped rows and, on a district page, ids without the district prefix) and blocks analytics without disabling consent controls.
- `Calendar` receives `mine`, `data.features` and the same `unsignup` handler as `SignupDialog`, so a card can remove the browser's own signup directly.
- After each `signup` / `unsignup`, `mine` is re-read from `localStorage`; a `closed` signup error sets `signupsOpen` to `false` locally.
- `openSignup` triggers a silent reload so the shown list is fresh.

## Side Effects
- With consent, the layout loads `gtag.js`; Google creates host-only `_ga` cookies at the base path. Rejection deletes them and reloads loaded tabs. The root URL is resolved as `resolve('/[[districte]]', { districte: '' })` under SvelteKit 3.
- `signupDone(id)` closes the sign-up modal and opens the detail.
- `signup()` reads `signupId` before any `await`, so it works after the dialog has closed.
- Network through `createApi` to `VITE_AGENDA_API_URL`; `localStorage` through `browserStorage()`.
- `console.warn` for skipped rows and missing headers.
- DOM: `scrollIntoView` on `#dia-<date>`, focus on the `h1` when a link-opened detail closes, `visibilitychange` listener via `<svelte:document>`.

## Verification
- Run: `npm run check`
- Browser behaviour: `npm run test:e2e`
