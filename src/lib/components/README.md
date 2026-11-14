# src/lib/components

## Overview
Svelte 5 (runes) presentational components of the agenda page. They receive data and callbacks as props, import logic through `#lib/*` ([parent contract](../README.md)), and are composed by [src/routes/[[districte]]/+page.svelte](../../routes/README.md). The page owns which event is open; the two dialog components only mirror that into a native `<dialog>`.

## Interface
- [Calendar.svelte](./Calendar.svelte): props `{ month, byDate, signups, mine, features, today, signupsOpen, ondetail, onparticipate, onunsign }`; renders one `li#dia-<date>` per day with an [EventCard.svelte](./EventCard.svelte) per event (state from `participationState`; `mine` filtered by event; `canUnsign` = `features` includes `'unsignup'`).
- [EventCard.svelte](./EventCard.svelte): props `{ event, count, dateLabel, state, mine, canUnsign, ondetail, onparticipate, onunsign }`; `detail` link (`?e=<id>`) opens the detail on a plain left click only; action is an external `Participar` link (`state === 'external'`), `Desapuntar-me` button (`'open'`, `canUnsign` and at least one record in `mine`), `Participar` button (`'open'` otherwise) or `Veure apuntats` button (other states).
- [EventDetail.svelte](./EventDetail.svelte): props `{ event, names, state, dateLabel, url, notFound, onclose, onparticipate }`; modal with event data, participation block, sign-up list, «Comparteix» (primary share states `idle | ready | fallback | failed`) and the own-image action, «Tria una imatge pròpia per compartir» → «Comparteix amb la imatge pròpia» (custom states `idle | picking | ready | failed`; choosing a file only enters `ready`, and the next tap calls `navigator.share`).
- [SignupDialog.svelte](./SignupDialog.svelte): props `{ event, dateLabel, features, mine, onsubmit, onunsign, onclose }`; name form (phases `idle | sending | done`) and, when `features` includes `'unsignup'`, the «La teva participació» list with a two-tap «Desapuntar-me».
- [PosterView.svelte](./PosterView.svelte): props `{ event, dateLabel, node (bindable) }`; reads `getContext('district')` for the band (`T.siteTitle(district)`); off-screen `POSTER.width × POSTER.height` poster captured by `renderPoster`. Font sizes and body margins are multiplied by `posterScale(event.name, event.place)` through `--k`.
- [Header.svelte](./Header.svelte): title (`district.name` from `getContext('district')`) and `T.monthLabel`.
- [Legend.svelte](./Legend.svelte): static `accio` / `acte` chips from `T.types`.

## Invariants
- [EventDetail.svelte](./EventDetail.svelte) and [SignupDialog.svelte](./SignupDialog.svelte) open the `<dialog>` with `showModal()` when `event` (or `notFound`) becomes set and call `dialog.close()` when it clears; closing reports back through `onclose`.
- [EventDetail.svelte](./EventDetail.svelte) bumps an `epoch` on close or event change (`resetShare`), so results of a late poster render or share are dropped; the poster node is mounted only while `posterVisible` is true; sharing is offered only when the state is `open`, `closed` or `external`; `busy` blocks a second tap while generating or sharing.
- [EventDetail.svelte](./EventDetail.svelte) calls `shareImage` with no `await` before it in `shareSecond` to keep the tap's user activation; the second tap reuses the same `readyFile`.
- [EventDetail.svelte](./EventDetail.svelte) passes the selected original `File` and existing event text to `shareImage`; its custom retry is memory-only, and custom flights own `sharing` cleanup independently from permission to display a late result. Custom failures never invoke the generated-poster fallback.
- [SignupDialog.svelte](./SignupDialog.svelte) validates with `validateName` before `onsubmit`; unsign needs two taps within `CONFIRM_MS` (5000); the `opening` counter discards the answer of a removal started in an earlier opening; no new removal starts while one is in flight.
- [EventCard.svelte](./EventCard.svelte) `Desapuntar-me` needs two taps within `CONFIRM_MS` (5000) when `mine` has exactly one record; with several it calls `onparticipate` (the modal lists them); no second removal starts while one is in flight, and an answer arriving after the card is destroyed is ignored. The result message lives in a `role="status"` paragraph that stays after the button reverts to `Participar`.
- [EventCard.svelte](./EventCard.svelte) external links use `target="_blank"` with `rel="noopener noreferrer"`; the count and sign-up actions are not shown for `'external'` events.
- UI strings come from `T` in [texts.js](../texts.js); [Header.svelte](./Header.svelte) hardcodes the first title line and takes the second from `district.name`.

## Side Effects
- [EventDetail.svelte](./EventDetail.svelte): calls `renderPoster`, `downloadFile` and `shareImage` (file download, system share panel); moves focus to the close button.
- [SignupDialog.svelte](./SignupDialog.svelte): sets and clears a confirm timer; focuses the name input.
- [EventCard.svelte](./EventCard.svelte): sets and clears a confirm timer; invokes `onunsign`.
- [Calendar.svelte](./Calendar.svelte), [PosterView.svelte](./PosterView.svelte), [Header.svelte](./Header.svelte), [Legend.svelte](./Legend.svelte): none beyond rendering and invoking callback props.

## Verification
- Run: `npm run check` (svelte-check; no unit tests exist for components)
- Browser behaviour: `npm run test:e2e` (see [e2e](../../../e2e/README.md))
