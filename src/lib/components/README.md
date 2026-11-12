# src/lib/components

## Overview
Svelte 5 (runes) presentational components of the agenda page. They receive data and callbacks as props, import logic through `#lib/*` ([parent contract](../README.md)), and are composed by [src/routes/+page.svelte](../../routes/README.md). The page owns which event is open; the two dialog components only mirror that into a native `<dialog>`.

## Interface
- [Calendar.svelte](./Calendar.svelte): props `{ month, byDate, signups, today, signupsOpen, ondetail, onparticipate }`; renders weekday header and one `li#dia-<date>` per day with an [EventCard.svelte](./EventCard.svelte) per event (state from `participationState`).
- [EventCard.svelte](./EventCard.svelte): props `{ event, count, dateLabel, state, ondetail, onparticipate }`; `detail` link (`?e=<id>`) opens the detail on a plain left click only; action is an external `Participar` link (`state === 'external'`), `Participar` button (`'open'`) or `Veure apuntats` button (other states).
- [EventDetail.svelte](./EventDetail.svelte): props `{ event, names, state, dateLabel, url, notFound, onclose, onparticipate }`; modal with event data, participation block, sign-up list, copy link, «Descarrega la imatge» and «Comparteix» (share states `idle | ready | fallback | failed`).
- [SignupDialog.svelte](./SignupDialog.svelte): props `{ event, dateLabel, features, mine, onsubmit, onunsign, onclose }`; name form (phases `idle | sending | done`) and, when `features` includes `'unsignup'`, the «La teva participació» list with a two-tap «Desapuntar-me».
- [PosterView.svelte](./PosterView.svelte): props `{ event, dateLabel, node (bindable) }`; off-screen `POSTER.width × POSTER.height` poster captured by `renderPoster`.
- [Header.svelte](./Header.svelte): static title and `T.monthLabel`.
- [Legend.svelte](./Legend.svelte): static `accio` / `acte` chips from `T.types`.

## Invariants
- [EventDetail.svelte](./EventDetail.svelte) and [SignupDialog.svelte](./SignupDialog.svelte) open the `<dialog>` with `showModal()` when `event` (or `notFound`) becomes set and call `dialog.close()` when it clears; closing reports back through `onclose`.
- [EventDetail.svelte](./EventDetail.svelte) bumps an `epoch` on close or event change (`resetShare`), so results of a late poster render or share are dropped; the poster node is mounted only while `posterVisible` is true; sharing is offered only when the state is `open`, `closed` or `external`; `busy` blocks a second tap while generating or sharing.
- [EventDetail.svelte](./EventDetail.svelte) calls `shareImage` with no `await` before it in `shareSecond` to keep the tap's user activation; the second tap reuses the same `readyFile`.
- [SignupDialog.svelte](./SignupDialog.svelte) validates with `validateName` before `onsubmit`; unsign needs two taps within `CONFIRM_MS` (5000); the `opening` counter discards the answer of a removal started in an earlier opening; no new removal starts while one is in flight.
- [EventCard.svelte](./EventCard.svelte) external links use `target="_blank"` with `rel="noopener noreferrer"`; the count and sign-up actions are not shown for `'external'` events.
- UI strings come from `T` in [texts.js](../texts.js); [Header.svelte](./Header.svelte) hardcodes the two title lines.

## Side Effects
- [EventDetail.svelte](./EventDetail.svelte): calls `renderPoster`, `downloadFile`, `shareImage` and `copyText` (file download, system share panel, clipboard); moves focus to the close button / link field.
- [SignupDialog.svelte](./SignupDialog.svelte): sets and clears a confirm timer; focuses the name input.
- [Calendar.svelte](./Calendar.svelte), [EventCard.svelte](./EventCard.svelte), [PosterView.svelte](./PosterView.svelte), [Header.svelte](./Header.svelte), [Legend.svelte](./Legend.svelte): none beyond rendering and invoking callback props.

## Verification
- Run: `npm run check` (svelte-check; no unit tests exist for components)
- Browser behaviour: `npm run test:e2e` (see [e2e](../../../e2e/README.md))
