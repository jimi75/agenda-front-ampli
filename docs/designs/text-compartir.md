# Plantilla de texto para compartir eventos

*   **Author:** Juan Peist
*   **Status:** Ready to implement
*   **Date:** 2026-11-13

--------------------------------------------------------------------------------

## Overview

When a user shares an event (WhatsApp link or the browser's native share with the generated image), the app sends a fixed one-line message: `Apunta’t a l’activitat aquí: <url>`. This design replaces it with a fixed Catalan template. The template carries the event's title, date, time, place and sign-up link, using data that already exists in the event sheet.

This design builds the message from the event's fields in a fixed format:

```text
📢 *<title>* 📢

🗓️ <Weekday> <day> de <month>
⏰ <time range in app format>
📍 <place>

🔗 Més detalls i inscripcions: <url>
```

## The Problem

The current share text gives the person who receives it no information about the event. They must open the link to learn the title, date, time and place.

## Goals

*   The share text follows the template above exactly. That includes the fixed emojis and one blank line between the three blocks.
*   The title is wrapped in `*…*` (WhatsApp bold). Channels that don't render it show the asterisks as typed, which is acceptable.
*   The date is in Catalan with a capitalised weekday (e.g. `Dijous 12 de novembre`), without the year.
*   The time uses the format the app already shows: start time, plus the end time when it exists (e.g. `23.45h`, `18.30h-20h`).
*   A line with missing data (including an empty title) is omitted. No extra blank lines are left behind.
*   The link line always reads `🔗 Més detalls i inscripcions:`. It points to the external sign-up URL when the event has one, otherwise to the event's page in the app.
*   The same text is used by WhatsApp and by native share. Native share can take two taps: the first generates the image, and a second tap is needed when the browser drops the user activation while the image is being generated. Both taps send the same text.
*   Existing constraint, unchanged: cancelled and past events cannot be shared. Modified events are shared with their current data.
*   The copy-link button («Copia l’enllaç») is removed, along with its clipboard fallback, helper, strings and tests. Once the share text carries the event details and link, a button that copies only the bare URL is redundant: anyone who needs the bare link can copy it from the browser's address bar.

## Non-Goals

*   Uploading a custom share image to replace the browser-generated one. This is planned for a separate design. The text must not depend on the image's source.
*   Configurable templates, per-event-type templates or per-channel texts.
*   Translations other than Catalan.
*   Escaping WhatsApp formatting characters (`*`, `_`, `~`) inside titles.
*   Business or product metrics.

## Open Questions

*   None at this stage.

## Critical User Journeys (CUJs)

### CUJ 1: Share an event with internal sign-up via WhatsApp

*   **Given**: An open event with a title, date, start and end time and a place, and no external URL. Native share is unavailable or fails, so the WhatsApp link is shown.
*   **When**: The user opens the event detail and taps the WhatsApp action.
*   **Then**: WhatsApp opens with the full template, the app's event URL in the link line, and the blank lines in place.

### CUJ 2: Share an event with external sign-up via native share

*   **Given**: An open or modified event with an external sign-up URL.
*   **When**: The user taps "Comparteix" (and the second tap if the browser requires it).
*   **Then**: The native share sheet receives the image and the template text, with the external URL as the only link.

### CUJ 3: Share an event without a place

*   **Given**: An event with an empty place.
*   **When**: The user shares it.
*   **Then**: The 📍 line is absent. The date and time block keeps its two lines, and there is still exactly one blank line between blocks.

### CUJ 4: Try to share a cancelled event

*   **Given**: A cancelled event.
*   **When**: The user opens its detail.
*   **Then**: No share actions are offered.

## Technical Plan (Architecture)

### Current behaviour (verified in code)

*   **Share text:** `shareText(url)` in `src/lib/share.js` returns `T.share.text(url)`, defined in `src/lib/texts.js`. It is called in `EventDetail.svelte` in three places: the first native-share tap, the second native-share tap, and the WhatsApp fallback link (`waLink(shareText(url))`).
*   **Copy button:** it copies only `url`. If copying fails, a read-only input with the URL is shown.
*   **Event fields** (`AgendaEvent` in `src/lib/events.js`):
    *   `name`: trimmed, at most 120 characters.
    *   `date`: `YYYY-MM-DD`.
    *   `start`: required, `HH:MM`.
    *   `end`: optional; kept only if it is later than `start`.
    *   `place`: may be empty.
    *   `externalUrl`: an `https://` link, or empty.
    *   `status`: `''`, `cancelled` or `modified`.
*   **Formatting already available:**
    *   `formatRange(start, end)` returns `23.45h` or `18.30h-20h`.
    *   `EventDetail` receives `dateLabel` as a prop, produced by `T.dateLabel`, e.g. `dijous 12 de novembre` (lowercase).
*   **Which events can be shared:** `participationState` (`src/lib/state.js`) checks `past`, then `cancelled`, then `external`, `closed` and `open`. `EventDetail` shows the share section only for `open`, `closed` and `external`. So cancelled and past events can't be shared, and modified events can. **No change is needed here.**

### Proposed design

The change stays inside the existing share module. There is no new component and no new data.

1.  **`shareText(event, dateLabel, url)`** in `src/lib/share.js` becomes a pure function that builds the message:
    *   **Block 1 (title):** `T.share.title(event.name)`, which gives `📢 *<name>* 📢`.
    *   **Block 2 (when and where):**
        *   `T.share.date(capitalised dateLabel)`, which gives `🗓️ <Dijous 12 de novembre>`.
        *   `T.share.time(formatRange(event.start, event.end))`, which gives `⏰ <range>`.
        *   `T.share.place(event.place)`, which gives `📍 <place>`.
    *   **Block 3 (link):** `T.share.link(event.externalUrl || url)`, which gives `🔗 Més detalls i inscripcions: <link>`.
    *   **Missing data:** a line is dropped when its value is empty after trimming. A block left with no lines is dropped too.
    *   **Joining:** lines within a block are joined with `\n`, and blocks with `\n\n`. There is no trailing newline.
    *   **Cleaning:** before use, line breaks and `\r` inside the title and place are replaced with a single space. This keeps the layout to one line per field.
    *   **Capitalisation:** only the first character of `dateLabel` is upper-cased, and only inside `shareText`. The date shown in the app stays lowercase.
2.  **Text templates** move into `T.share` in `src/lib/texts.js`, so all user-facing Catalan strings stay in one place. The old `T.share.text` placeholder is removed.
3.  **`EventDetail.svelte`** computes the text once as a derived value: `shareText(event, dateLabel, url)`, and `''` when `event` is null. The two native-share calls and the WhatsApp link use that value.
4.  **Copy button removal:** the copy-link `<button>`, the read-only fallback `<input>`, the `copy` function, `copyState`, `linkField`, the `copied`/`copyFailed` branches of the `aria-live` status text, the `.link-field` style, the `copyText` helper and the `T.share.copyLink`/`copied`/`copyFailed` strings are deleted. Git history keeps them if the button is ever needed again.

The unit cases and E2E test updates are listed in the Detailed Implementation Plan (§4–§7).

### Data flow

```text
Sheet row ──normalizeEvents──▶ AgendaEvent ─┐
+page.svelte ──T.dateLabel──▶ dateLabel ────┼─▶ shareText(event, dateLabel, url) ─▶ text
detailUrl(location, id) ──▶ url ────────────┘                                          │
                                         ┌─────────────────────────────────────────────┤
                                         ▼                                             ▼
                     shareImage(file, text) (tap 1 and tap 2)           waLink(text) ─▶ wa.me
```

### Risks

*   **Native share may drop the text.** Some receiving apps keep only the image. Mitigation: none needed; this is an existing limitation, and the template doesn't change it.
*   **Formatting characters in titles.** A title containing `*`, `_` or `~` can turn text between markers into bold, italics or strikethrough in WhatsApp. Accepted (see Non-Goals).
*   **Emoji rendering.** 🗓 without the variation selector U+FE0F may show as monochrome text on some devices. The implementation uses `🗓️` (with U+FE0F) consistently, and the tests assert the exact code points.
*   **Dependency on `T.dateLabel`.** The share text reuses the app's date label, so a change to that format changes the share text too. Mitigation: the unit tests assert the date line.
*   **User-supplied text in links.** `place`, `name` and `externalUrl` go into the text and the `wa.me` link. Mitigation: `waLink` already applies `encodeURIComponent`, and the normaliser accepts `externalUrl` only as an `https://` link, so this adds no new attack surface.

## Alternatives Considered

### Alternative A: A different text per channel

*   **Pros**: Each channel could use its own formatting, e.g. no asterisks in native share.
*   **Cons**: Several templates to maintain, plus logic to detect the channel. Native share can't know which app the user will pick.
*   **Reason for Rejection**: Native share cannot know which app the user will pick, so a text per channel would be a guess. One text, with literal asterisks where bold is not rendered, avoids that.

### Alternative B: Two links (event details in the app and external sign-up)

*   **Pros**: People always reach the event's page in the app, even when sign-up is external.
*   **Cons**: Longer message, and two links that compete for the reader's attention.
*   **Reason for Rejection**: Two links compete for attention, and the external page is the one that leads to sign-up.

### Alternative C: Format the date inside `share.js` from `event.date`

*   **Pros**: `shareText` would depend only on the event and the URL.
*   **Cons**: It duplicates `T.dateLabel`. Parsing `YYYY-MM-DD` with `new Date()` can shift the date by a day depending on the timezone.
*   **Reason for Rejection**: The timezone risk and the duplication outweigh the simpler signature. Reusing `dateLabel` avoids both.

### Alternative D: Keep copy-link and add a separate "copy text" button

*   **Pros**: Both options available.
*   **Cons**: More UI, and the existing copy labels and tests would need rework.
*   **Reason for Rejection**: It adds UI for a need nobody has reported, and the link already travels inside the share text.

### Alternative E: Configurable template (e.g. in the sheet)

*   **Pros**: The wording could change without a deploy.
*   **Cons**: Needs a parser, validation and error handling for broken templates.
*   **Reason for Rejection**: A parser and validation cost more than a deploy, for wording that rarely changes.

## Detailed Implementation Plan

Line numbers refer to the code at the time of writing. Each one comes with a test title or quoted text, so it can still be found after the lines move.

### Target Files to Create/Modify

#### 1. `src/lib/texts.js` (Modify)

*   **Type / Scope**: Catalan UI strings.
*   **Proposed Changes**:
    *   **Remove** `T.share.text(url)` and its comment "Placeholder wording from the author" (lines 71–72).
    *   **Remove** `copyLink` (line 62), `copied` (line 65) and `copyFailed` (line 66).
    *   **Keep** `download`, `share`, `generating`, `ready`, `imageFailed`, `fallbackNote` and `waLink`.
    *   **Add** to `T.share`:
        *   `title(name)`, returning `📢 *${name}* 📢`.
        *   `date(label)`, returning `🗓️ ${label}`. The emoji is U+1F5D3 followed by U+FE0F.
        *   `time(range)`, returning `⏰ ${range}`.
        *   `place(place)`, returning `📍 ${place}`.
        *   `link(url)`, returning `🔗 Més detalls i inscripcions: ${url}`.

#### 2. `src/lib/share.js` (Modify)

*   **Type / Scope**: JS module (pure functions).
*   **Proposed Changes**:
    *   **Signature:** `shareText(event, dateLabel, url)`, with this JSDoc:
        *   `@param {Pick<import('./events.js').AgendaEvent, 'name' | 'start' | 'end' | 'place' | 'externalUrl'>} event`
        *   `@param {string} dateLabel`
        *   `@param {string} url`
        *   `@returns {string}`
    *   **Behaviour** (pseudocode):
        ```text
        oneLine(s)  = trim(s with every run of \r and \n replaced by one space)
        cap(s)      = s ? upper(s[0]) + s[1:] : ''
        blocks = [
          [ title(oneLine(name)) if oneLine(name) ],
          [ date(cap(oneLine(dateLabel))) if oneLine(dateLabel),
            time(formatRange(start, end)),
            place(oneLine(place)) if oneLine(place) ],
          [ link(externalUrl || url) ]
        ]
        return blocks.filter(nonEmpty).map(join '\n').join('\n\n')
        ```
    *   **Imports:** add `formatRange` from `./events.js`. Keep the `T` import.
    *   **JSDoc description:** "Builds the share text from the fixed template. Lines whose source field is empty are omitted, and empty blocks are dropped."
    *   **Remove** the `copyText` export and its JSDoc (line 27).

#### 3. `src/lib/components/EventDetail.svelte` (Modify)

*   **Type / Scope**: Svelte component.
*   **Proposed Changes**:
    *   **Shared text:** add `const text = $derived(event ? shareText(event, dateLabel, url) : '');` right after `showWaLink` (line 54).
    *   **Replace call sites:** change `shareText(url)` to `text` in the first-tap `shareImage` (line 155), the second-tap `shareImage` (line 171) and `waLink(...)` (line 279).
    *   **Delete** the copy-link feature:
        *   `copyText` in the import (line 5);
        *   the `linkField` and `copyState` declarations and their JSDoc (lines 28–31);
        *   the `copyState = 'idle'` reset (line 71);
        *   the `copy` function (lines 91–97);
        *   the `<button … onclick={copy}>{T.share.copyLink}</button>` element (line 277);
        *   the `{#if copyState === 'failed'} <input class="link-field" …/> {/if}` block (lines 295–305);
        *   the `.link-field` CSS rule (line 561).
    *   **Status text:** the expression inside `<p class="live">` becomes `imageFailed || shareView === 'failed' ? T.share.imageFailed : shareView === 'fallback' ? T.share.fallbackNote : ''`.

#### 4. `src/lib/share.test.js` (Modify)

*   **Type / Scope**: Unit tests (`node --test`).
*   **Proposed Changes**:
    *   **Delete** `copyText: èxit, error i sense portaretalls` (line 39), and remove `copyText` from the import (line 3).
    *   **Replace** `shareText: el text del marcador de posició amb l’enllaç` (line 23) with these cases. The base fixture is `{ name: 'Paradeta al mercat', start: '18:30', end: '20:00', place: 'Mercat de Sants', externalUrl: '' }`, `dateLabel = 'dijous 12 de novembre'` and `url = 'https://example.test/?e=a1'`.
        *   **Full template:** `'📢 *Paradeta al mercat* 📢\n\n🗓️ Dijous 12 de novembre\n⏰ 18.30h-20h\n📍 Mercat de Sants\n\n🔗 Més detalls i inscripcions: https://example.test/?e=a1'`.
        *   **External link:** with `externalUrl: 'https://example.org/inscripcio'`, the last line is `🔗 Més detalls i inscripcions: https://example.org/inscripcio`, and the text does not contain `https://example.test/?e=a1`.
        *   **Missing place:** with `place: ''`, there is no 📍 line, and there is still exactly one blank line between blocks.
        *   **Start time only:** with `start: '23:45', end: ''`, the time line is `⏰ 23.45h`.
        *   **Empty date label:** with `dateLabel = ''`, there is no 🗓️ line.
        *   **Line breaks:** `name: 'A\r\nB'` gives `📢 *A B* 📢`, and the same applies to `place`.
        *   **Asterisks:** asterisks in the title are not escaped.
        *   **Every case also asserts:** no `\n\n\n`, no `\r`, and no leading or trailing whitespace.
    *   **Update** the `TEXT` constant (line 104) to the full-template string above. The `shareImage` tests that use `TEXT` need no other change.
    *   **Update** `waLink: codifica accents i l’apòstrof tipogràfic` to use `TEXT`, and assert `new URL(waLink(TEXT)).searchParams.get('text') === TEXT`.

#### 5. `e2e/share.spec.js` (Modify)

*   **Type / Scope**: Playwright E2E.
*   **Proposed Changes**:
    *   **Expected text:** add `const EXPECTED_TEXT = '📢 *Paradeta al mercat* 📢\n\n🗓️ Dijous 12 de novembre\n⏰ 10h-14h\n📍 Mercat de Sants\n\n🔗 Més detalls i inscripcions: ' + DETAIL_URL;`. The `accio-1` seed in `e2e/script.js` has a fixed date (2026-11-12, a Thursday) and fixed times (10:00–14:00). Replace `T.share.text(DETAIL_URL)` with `EXPECTED_TEXT` at lines 16 and 54.
    *   **`openDetail`:** remove the `copy:` entry (line 37).
    *   **Delete** the test «Copia l’enllaç» sempre és visible i copia l’URL sense ?admin, també amb la imatge preparada (line 176).
    *   **In each of these tests, remove `copy` from the destructuring and delete the `await expect(copy).toBeVisible()` line:**
        *   `AbortError: no passa res i no hi ha enllaç de respatller` (line 65);
        *   `NotAllowedError: queda «preparada» i el segon toc comparteix el MATEIX arxiu…` (line 79);
        *   `dos NotAllowedError seguits: el segon va a la descàrrega…` (line 108);
        *   `sense suport d’arxius: descarrega la imatge i mostra l’enllaç wa.me…` (line 140);
        *   `si no es pot generar la imatge: missatge i enllaç wa.me només amb text…` (line 158).

#### 6. `e2e/detail.spec.js` (Modify)

*   **Type / Scope**: Playwright E2E.
*   **Proposed Changes**:
    *   **Delete** the test `si el porta-retalls falla, «Copia l’enllaç» mostra l’URL en un camp seleccionable` (lines 201–213).
    *   **Change** the test `«Comparteix» és un botó (sense enllaç wa.me de principi) i «Copia l’enllaç» copia l’URL sense ?admin` (lines 184–199):
        *   change its title to `«Comparteix» és un botó (sense enllaç wa.me de principi)`;
        *   remove `context.grantPermissions(...)` (line 188), the copy click and the clipboard assertions;
        *   remove the `context` and URL variables if nothing else uses them;
        *   keep the share-button and wa.me assertions.
    *   **Remove** the `T.share.copyLink` `toHaveCount(0)` line in the loop test `${id}: s’obre en només lectura…` (line 131). The `T.share.share` check above it already covers sharing.
    *   **Replace** the `T.share.copyLink` assertion in `tancat per B1 = NO: … i manté compartir` (line 224) with `await expect(detail.getByRole('button', { name: T.share.share, exact: true })).toBeVisible();`.

#### 7. `e2e/external.spec.js` (Modify)

*   **Type / Scope**: Playwright E2E.
*   **Proposed Changes**:
    *   **Replace** the `T.share.copyLink` assertion in `el detall amb URL externa mostra l’enllaç «Participar» i la nota…` (line 54) with `await expect(detail.getByRole('button', { name: T.share.share, exact: true })).toBeVisible();`.
    *   **Add** the test `el text compartit d’un esdeveniment extern enllaça només a la inscripció externa`:
        *   call `mockShare(page)` (exported from `e2e/helpers.js`);
        *   open the agenda at `e=ext-1` and click «Comparteix»;
        *   wait for one call to the mocked share;
        *   assert that `(await shareCalls(page))[0].text` ends with `` `🔗 Més detalls i inscripcions: ${EXTERNAL_URL}` `` and does not contain `?e=ext-1`.

#### 8. `README.md` (Modify)

*   **Type / Scope**: Project documentation (Spanish).
*   **Proposed Changes**:
    *   **Line 12:** delete the sentence «**Copia l’enllaç** (siempre visible en el detalle) copia ese enlace, sin `?admin`.».
    *   **Line 14:** replace «el texto con el enlace al detalle» with «un texto con el título, la fecha, la hora, el lugar y el enlace (a la inscripción externa si la hay; si no, al detalle). Las líneas sin datos se omiten».
    *   **Line 98:** replace «la persona usa «Copia l’enllaç»» with «la persona copia el enlace de la barra de direcciones».
    *   **Line 261:** replace «la persona usa *Copia l’enllaç* y pega el enlace» with «la persona copia el enlace de la barra de direcciones y lo pega».

#### 9. `src/lib/README.md` (Modify)

*   **Type / Scope**: Module documentation.
*   **Proposed Changes**:
    *   **Line 15:** remove `copyText`. Replace `` `shareText` `` with `` `shareText(event, dateLabel, url)` (builds the multi-line share text: title, date, time, place and link, and omits empty lines) ``.
    *   **Line 42:** remove `` `navigator.clipboard.writeText`, ``.

#### 10. `src/lib/components/README.md` (Modify)

*   **Type / Scope**: Component documentation.
*   **Proposed Changes**:
    *   **Line 9:** remove «copy link, » from the list of modal features.
    *   **Line 25:** replace «`shareImage` and `copyText` (file download, system share panel, clipboard); moves focus to the close button / link field» with «and `shareImage` (file download, system share panel); moves focus to the close button».

### Verification Plan

*   **Type check**: `npm run check`.
*   **Unit tests**: `npm test`.
*   **E2E**: `npm run test:e2e`.
*   **Build**: `npm run build`.
*   **Leftover references**: `grep -rn "copyLink\|copyText\|copyFailed\|T.share.copied\|T.share.text\|link-field" src e2e` returns nothing.
*   **Manual check:** share one internal and one external event to WhatsApp on a phone, and confirm:
    *   the title is bold;
    *   the blocks are separated by blank lines;
    *   🗓️ renders as an emoji, not a monochrome glyph;
    *   the internal event links to `?e=<id>`, and the external event links to its `externalUrl`.

*Drafted with EGM*
