# src/routes

## Overview
SvelteKit routes. A single static page that loads the agenda, orchestrates the calendar, the event detail dialog and the sign-up dialog, and a layout that loads fonts and the favicon.

## Interface
- [+layout.js](./+layout.js): `export const prerender = true`.
- [+layout.svelte](./+layout.svelte): imports `@fontsource/special-gothic-condensed-one/400.css`, `@fontsource-variable/special-gothic/wght.css` and `#lib/assets/favicon.svg`; renders the `children` snippet and the favicon link.
- [+page.svelte](./+page.svelte): the agenda page. Composes `Header`, `Legend`, `Calendar`, `EventDetail` and `SignupDialog` from [components](../lib/components/README.md); uses `createApi` (or `createMockApi` in dev), `normalizeEvents`, `groupByDate`, `parseEventParam`, `buildMonth`, `todayIso`, `readMine`, `detailUrl` and `participationState` from [lib](../lib/README.md). Local state: `status` (`loading | ready | error`), `data`, `detailId`, `signupId`, `mine`, `today`, `showAdmin`.

## Invariants
- [+page.svelte](./+page.svelte) picks the API in `onMount`: `VITE_AGENDA_API_URL` set → `createApi`; else `import.meta.env.DEV` → `createMockApi` (dynamic import); else `status = 'error'`.
- A silent refresh (`load({ silent: true })`) never replaces fresh data with a stale offline copy (`staleSince !== null`) and never shows errors; refresh on `visibilitychange` happens only after `REFRESH_AFTER_MS` (120000) and while `status === 'ready'`.
- The `?e=<id>` link is read once after the first successful load via `parseEventParam`; with no link, the list on narrow screens (below `min-width: 1024px`) scrolls to the next day with events.
- `unreadable` (no valid events and `missingColumns` or skipped rows present) shows an error with retry instead of an empty calendar.
- The `?admin` query parameter only reveals the diagnostics block (features, local sign-ups, missing columns, skipped rows).
- After each `signup` / `unsignup`, `mine` is re-read from `localStorage`; a `closed` signup error sets `signupsOpen` to `false` locally.
- `openSignup` triggers a silent reload so the shown list is fresh.

## Side Effects
- Network through `createApi` to `VITE_AGENDA_API_URL`; `localStorage` through `browserStorage()`.
- `console.warn` for skipped rows and missing headers.
- DOM: `scrollIntoView` on `#dia-<date>`, focus on the `h1` when a link-opened detail closes, `visibilitychange` listener via `<svelte:document>`.

## Verification
- Run: `npm run check`
- Browser behaviour: `npm run test:e2e`
