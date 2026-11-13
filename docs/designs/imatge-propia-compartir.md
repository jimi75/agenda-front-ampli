# Share an event with an image from the device

* **Author:** Juan Peist
* **Status:** Ready to implement
* **Date:** 2026-11-13

## Overview

Add a secondary “Comparteix amb imatge pròpia” action to the event detail.
It lets a person select one image from their device and share the original
file with the existing event message. Keep “Comparteix” and its generated
poster workflow unchanged.

## The Problem

Sharing currently creates an image from the event's data. A person who already
has a suitable image cannot attach it through this workflow. Making everyone
choose an image source would slow down the existing action, so this design adds
a separate action rather than changing the default.

## Goals

* Keep normal sharing free of new steps.
* Offer the additional action wherever existing sharing is available.
* Pass the selected original image and the existing event text to the browser's
  sharing API without editing or converting the file.
* Use no application server upload or persistent image storage.
* On failure, show only “No s’ha pogut compartir la imatge” inline. Do not
  download an image, open WhatsApp, or automatically invoke normal sharing.
* Treat picker cancellation as cancellation, without a failure message. If the
  first native share call aborts after returning from the picker, offer one
  deliberate retry rather than leaving no visible recovery action.
* If another deliberate tap is needed, offer “Torna a compartir” with the same
  temporarily held file. A failed second attempt must not create a retry loop.
* Clear temporary file references when closing or switching events, or when
  the custom sharing attempt reaches a terminal outcome.

## Non-Goals

* Replacing the default generated poster, its download action, or its fallback.
* Keeping images for future visits or sharing them with other agenda users.
* Google Drive, object storage, backend changes, or new dependencies.
* Cropping, resizing, converting, previewing, adding text, or removing metadata.
* Changing link previews.
* Guaranteeing that a receiving application preserves the image, its metadata,
  or the accompanying message.

## Open Questions

* No unresolved policy decisions remain from the review. The author selected
  common-extension fallback and automated-check-only release on 2026-11-13.
* Real Android and iOS picker-to-share behavior and destination handling remain
  unverified. Device checks are follow-up work, not a publication prerequisite.
  The author accepts the risk of native failures not detected by automated
  browser tests.

## Critical User Journeys (CUJs)

### CUJ 1: Share the selected original image

* **Given:** An event that offers normal sharing.
* **When:** The person activates the secondary action and selects an image.
* **Then:** The browser receives that original file and the event's current
  share text. No poster is rendered, no file is downloaded, and nothing is
  uploaded to an application service.

### CUJ 2: Cancel

* **Given:** The picker or system share panel is open.
* **When:** The person cancels the picker or the second system-share attempt.
* **Then:** No replacement action runs, no error is displayed, and normal
  sharing remains available. An `AbortError` from the first share attempt
  instead retains the file and offers “Torna a compartir”; native platforms
  may abort this picker-to-share handoff before showing a share panel.

### CUJ 3: Retry with a deliberate tap

* **Given:** The first share attempt reports that another tap may be needed or
  aborts while returning from the native picker.
* **When:** The person activates “Torna a compartir”.
* **Then:** The same file is shared without reopening the picker. A failed
  second attempt shows the brief error and releases the retained file.

### CUJ 4: Sharing fails or is unsupported

* **Given:** An image has been selected.
* **When:** File sharing is unavailable, the file is rejected, or sending fails.
* **Then:** Only the inline error appears. Normal sharing is available for the
  person to choose; no alternative runs automatically.

### CUJ 5: Keep the default path

* **Given:** The person does not use the secondary action.
* **When:** They use “Comparteix” or “Descarrega la imatge”.
* **Then:** Existing poster generation, retry, download, and WhatsApp fallback
  behavior is preserved, without a source chooser or extra confirmation.

## Technical Plan (Architecture)

### Boundaries and reuse

Keep the interaction in the existing event detail component. It already owns
event eligibility, modal lifetime, poster generation, and the shared busy
state. Do not introduce a new component, controller, backend route, schema
field, dependency, or storage mechanism.

Use the existing derived `text`, produced by `shareText(event, dateLabel, url)`.
The original file goes directly to `shareImage(file, text)`. Neither the file's
contents nor its name are changed. Do not call `renderPoster`, `downloadFile`,
`waLink`, `FileReader`, canvas, image decoding, or object-URL creation for this
path. No application request is needed to send the selected file.

```text
Event data ------> existing shareText ------> current message
                                                    |
Secondary button -> native image picker -> original File
                                                    |
                                    existing shareImage
                                                    |
                                    system sharing panel
                                                    |
                                       destination application

Existing Comparteix -> generate poster -> existing share / retry / fallback
                     (unchanged, separate image source)
```

### Layout and access

Keep the two existing actions in their current order. Place the new button
after “Comparteix” and before any WhatsApp fallback link. Give its wrapper a
full row in the wrapping share section and a quieter, underlined text-button
treatment, while retaining a minimum 44 px tap target, existing focus styling,
and a readable label. Do not reduce contrast or opacity to indicate hierarchy.
Keep the existing primary and download action styles unchanged.

Use “Comparteix amb imatge pròpia” normally and “Torna a compartir” when an
activation retry is ready. Both are real buttons operable by keyboard. Use a
hidden single-file input with
`accept="image/*,.jpg,.jpeg,.png,.gif,.webp"` and no `multiple` or `capture`
attribute. The explicit extensions support the missing-type fallback below;
they do not broaden acceptance of files with a reported non-image type.
The visible button opens it synchronously from its click handler;
the input itself is not a second focus stop. Do not introduce a preview or
confirmation step.

Show this control only for share-eligible events. The component's existing
`canShare` value means event eligibility: open, closed-registration, or
external-registration events. Past, cancelled, and missing events must not
expose it. This is separate from the browser's
`navigator.canShare({ files: [file] })`, called inside `shareImage` only after
selection to check support for that file. Do not hide the control based on an
early browser capability probe.

### File acceptance

Author decision: accept exactly one file under these rules, without reading
or changing its contents:

* If the reported MIME type starts with `image/` and has a nonempty subtype,
  accept it, case-insensitively. The extension list below does not restrict
  files with an image MIME type.
* Only if the reported MIME type is empty, accept a filename ending in `.jpg`,
  `.jpeg`, `.png`, `.gif`, or `.webp`, case-insensitively. Match the final
  extension: `photo.JPG` qualifies but `photo.jpg.exe` does not. Do not infer
  a type from a filename without one of these dotted suffixes.
* Reject any supplied non-image or malformed MIME type even if its filename
  has an accepted extension. Do not treat `application/octet-stream` as an
  empty type. Reject an empty-type file with another or no extension.
* An empty selection is cancellation; a rejected selected file shows the
  agreed brief inline error.

The input filter is only a picker hint; check the returned file using these
rules. Do not add a size cap, byte inspection, decoding, or conversion, or
rewrite the file's MIME type. The browser's
`navigator.canShare({ files: [file] })` still checks whether it accepts the
original file for sharing and may refuse an empty-type file.

This is not verification of the bytes or a promise that the image is safe or
decodable. The app does not render or upload the file. The recipient application
remains responsible for interpreting it.

### Temporary state and stale results

Custom selection and retry state stay separate from the generated poster.
Within the current detail lifetime, only one system share or poster-generation
operation runs at a time. Opening or cancelling a picker preserves primary
prepared/fallback state; accepting a valid selection replaces that state.

Closing, changing the event, losing eligibility, or choosing another source
invalidates custom UI results. A pending native share still needs owned
cleanup and cannot be recalled. Do not confuse suppressing a stale result
with suppressing its cleanup. Keep the existing `sharing` boolean as the only
system-share busy authority.

Cancellation must not strand the custom action. If the page is interactive,
another deliberate custom-button tap can replace an earlier picker even when
no cancel event arrived. Do not add focus timers. Concrete state, synchronous
picker creation, and cleanup rules are specified once in Detailed
Implementation, step 3.

### Outcome handling

| Outcome | Custom behavior |
|---|---|
| `shared` | Return to idle; clear file and input references. Do not claim the destination published a post. |
| `aborted` on first attempt | Hold the original file and show “Torna a compartir”; picker-to-share activation can be lost when a native mobile picker returns. |
| `aborted` on second attempt | Return to idle silently and release references. |
| `needs-second-tap` on first attempt | Hold the original file in memory and show “Torna a compartir”. Announce that the image is ready. |
| `unsupported` or `error` | Release references and show only the agreed inline error. |
| Any failed second attempt | Show the error and release the file; never return to ready. |

For the second tap, invoke `shareImage` with the same `File`, the current
event text, and `{ second: true }`, with no preceding asynchronous work.
Remove the ready-state reference when the call starts; the pending operation
holds the file only until it settles. If the person instead uses normal
sharing or download, release the custom ready file and follow that action.

Capability inspection failures must produce `error`, not cancellation or an
activation retry. Only a failure from the actual `navigator.share` call may
be classified as cancellation or a retry request. Detailed Implementation,
step 1, specifies the separate error boundaries and complete mapping.

### Accessible messages and cancellation

Extend the existing single `.live[aria-live="polite"]` region. A custom error
has priority while custom state is failed. A custom ready state announces
“Imatge preparada: prem de nou” and labels the secondary button “Torna a
compartir”. Otherwise retain the current primary message selection. Starting
an existing action clears the custom status so its own errors are not masked.
Cancelling the picker leaves pre-existing primary messages untouched; after an
accepted selection, the older primary statuses have already been cleared.

Centralize the three new strings in `T.share`: `customImage`, `customRetry`,
and `customFailed`. Reuse `T.share.ready` for the ready announcement. Keep
focus on or restore it to the originating custom button after picker
cancellation when the same detail is still open; do not steal focus on a late
result or after the detail closes.

### Interfaces that do not change

No component props, event data, Apps Script operations, persistent browser
keys, deployment configuration, or message template change. Existing helper
signatures remain intact. Existing primary fallback still downloads its
generated poster and offers WhatsApp text; the custom action never calls it.

## Alternatives Considered

### Store images in Google Drive or object storage

* **Pros:** Could make an image reusable across visits and devices.
* **Cons:** Requires upload authorization, access controls, retention rules,
  failure handling, and remote file delivery that this one-time flow does not
  need.
* **Reason for rejection:** Rejected by author: images do not need to be
  retained. Passing the local file directly avoids an unnecessary upload and
  storage service.

### Add an image-source chooser to normal sharing

* **Pros:** Keeps one entry point and can explain both sources in a menu.
* **Cons:** Adds a decision and another interaction to the existing action.
* **Reason for rejection:** Rejected by author: the existing path must remain
  unobstructed; a separate secondary button was chosen during brainstorming.

### Edit, resize, convert, or decorate the selected image

* **Pros:** Could normalize formats, reduce large files, or provide a branded
  output.
* **Cons:** Changes the selected file and adds processing and error paths.
* **Reason for rejection:** Rejected by author: send the selected image as-is,
  without any processing.

### Reuse poster download and WhatsApp fallback for custom sharing

* **Pros:** Existing code already supports those actions for a generated file.
* **Cons:** Its explanatory text describes a generated-image download.
  Automatically downloading a file the person already has adds little value;
  switching images would violate the selected source.
* **Reason for rejection:** Rejected by author: failure should show only a
  brief inline error, leaving normal sharing as a separate manual choice.

### Require image MIME information without a filename fallback

* **Pros:** Simpler policy that does not trust filenames for missing types.
* **Cons:** Rejects valid photos on devices that omit MIME information.
* **Reason for rejection:** Rejected by author: allow missing-type files with
  the common extensions JPG, JPEG, PNG, GIF, and WEBP instead. The author chose
  this short list rather than adding HEIC, HEIF, AVIF, BMP, or TIFF as filename
  fallbacks. Those formats can still qualify through a reported image MIME
  type. A filename does not establish content, and browser support remains
  required.

### Decode an image to establish its contents

* **Pros:** Can detect some files that are not decodable images.
* **Cons:** Adds processing and may reject a format a destination could accept.
* **Reason for rejection:** The author chose reported type plus a limited
  filename fallback, without decoding or modifying the original file.

### Require real-device checks before publication

* **Pros:** Tests actual native panels and destination behavior that mocks
  cannot establish.
* **Cons:** Publication must wait for access to real Android and iPhone devices.
* **Reason for rejection:** Rejected by author: publication may proceed after
  automated checks pass, with real-device checks pending and native
  compatibility risk accepted. This does not claim that those checks passed
  or remove existing S1/S2 obligations for the primary sharing feature.

## Non-Functional Requirements

* **Privacy:** Do not persist or upload the selected image, filename, or
  contents. Do not log them. Transient references are released by dropping
  them, not by claiming secure deletion from device memory. Unmodified
  metadata remains in the original file.
* **Resources:** Do not read the file into a second buffer, decode it, or create
  a preview. No application size cap is introduced; browser or device limits
  can still reject large images.
* **Failure visibility:** Use the agreed accessible inline error, not silent
  failure, alerts, or automatic substitute actions. No telemetry service or
  new console logging is needed for this local workflow.
* **Release checks:** Automated mocks cannot verify system share activation or
  destination behavior. The author permits release of this additional action
  after the automated checks below pass. Keep device checks explicitly
  pending until performed; they are not a release gate for this feature.
  Do not claim a completed share means a published post.
* **Rollback:** No data migration is needed. Revert the feature implementation
  commit with `git revert <feature-commit>` and redeploy the existing static
  application. No feature flag or infrastructure change is required.

## Detailed Implementation Plan

The following is one ordered implementation list. No production files have
been changed by this documentation workflow. Policy decisions are recorded in
File acceptance and Verify and release.

### 1. Update the shared helper and its unit tests

**Modify
[src/lib/share.js](../../src/lib/share.js).**
Guard capability inspection with its own synchronous error boundary. Preserve
the signature and all five result strings:

* Missing sharing APIs or `navigator.canShare` returning false produce
  `unsupported`, without invoking `share`.
* Any exception during capability inspection produces `error`, including
  `AbortError` and `NotAllowedError`, without invoking `share`.
* In a separate error boundary, resolution of `navigator.share` produces
  `shared`; its `AbortError` produces `aborted`; its `NotAllowedError` produces
  `needs-second-tap` on the first attempt or `error` with `second: true`.
  Other exceptions from `share` produce `error`.

Do not await anything before invoking `nav.share`, so the handler's activation
is preserved where the browser supports it. Do not change `shareText`,
`waLink`, or `downloadFile`.

Add a pure `isImageFile(file: File): boolean` export with JSDoc types. Implement
the exact File acceptance rules: reported image MIME takes priority; only an
empty MIME type permits the final-extension fallback to JPG, JPEG, PNG, GIF,
or WEBP. Compare case-insensitively and reject supplied non-image or malformed
types regardless of the filename. Do not read bytes, rewrite the type, or
construct a replacement `File`. The event handler handles missing files
separately as cancellation. The predicate makes the accepted policy testable.

**Modify
[src/lib/share.test.js](../../src/lib/share.test.js).**
Keep all existing cases. Add original JPEG and PNG files with distinctive
names and bytes. Assert exact object identity in the captured share payload,
not only matching name/type/size, and unchanged text. Cover image MIME
acceptance including mixed case and image types with filenames outside the
fallback list. For empty MIME, test every accepted extension, mixed-case
suffixes, and rejection of no extension, unsupported extensions, and a
misleading double extension such as `photo.jpg.exe`. Reject reported
`application/octet-stream`, `text/plain`, and `image/` without a subtype even
when the filename ends in `.jpg`. Confirm that calling the predicate does not
read file contents or change the file. Add capability-probe exceptions for `AbortError`,
`NotAllowedError`, and an ordinary error on both first and second attempts.
Assert that each resolves to `error` and never invokes `share`. Retain the
synchronous invocation and existing share-exception/second-attempt assertions.

### 2. Add localized interface strings

**Modify
[src/lib/texts.js](../../src/lib/texts.js).**
Add `T.share.customImage` = “Comparteix amb imatge pròpia”,
`T.share.customRetry` = “Torna a compartir”, and `T.share.customFailed` =
“No s’ha pogut compartir la imatge”. Keep all existing strings unchanged.
Use `T.share.ready` for the live retry announcement rather than introducing
duplicate wording.

### 3. Wire the event-detail interaction

**Modify
[src/lib/components/EventDetail.svelte](../../src/lib/components/EventDetail.svelte).**
Import `isImageFile` alongside the existing share helpers and `flushSync`
from `svelte`. Keep current props and derived share text.

Use these state and ownership rules within the existing component:

* Custom view states are `idle`, `picking`, `ready`, and `failed`; there is no
  custom `sharing` view state. The existing `sharing` boolean alone represents
  a pending system-share call. Keep `busy = generating || sharing`.
* Keep a nullable original-file reference only for custom `ready`, a
  monotonically increasing custom-operation token, and a nullable picker
  descriptor holding its captured event epoch, custom token, and input
  reference. Render a keyed input for that descriptor. Its handlers capture
  that descriptor, not mutable values identifying a later opening.
* Keep a nullable custom-flight identity containing its captured epoch and
  token while a custom share promise is pending. It owns cleanup of that
  call's `sharing` flag, not a second busy flag.
* The existing epoch advances whenever `resetShare` resets the detail,
  including close, reopening, or an event-ID change. A change to the same
  event's eligibility does not itself advance the epoch. Advance the custom
  token for a fresh/replacement picker, retry, existing image action,
  eligibility loss, and full reset. The first selection-to-share remains
  part of its picker operation.

Implement the following transitions:

1. In `idle`, `failed`, or `picking`, the custom button first checks the detail
   is open, the event is eligible, and neither generation nor sharing is busy.
   Invalidate the previous custom UI operation, clear custom error/ready
   references, and advance its token. Use `flushSync` to install the new
   picker descriptor and bind its fresh keyed input. Recheck that the
   descriptor and event are current, then call this input's `.click()` in the
   same handler. Do not await `tick`, a timer, or other promise before opening.
   Use `flushSync` in the click handler only, never an effect. If binding or
   opening fails for the current operation, clear its picker and show the
   custom error.
2. The custom button is disabled only while generation or system sharing is
   busy, not throughout `picking`. A new deliberate tap when the page is
   interactive replaces the previous picker through transition 1. Its stale
   events cannot affect the replacement. Do not add focus timers or require
   a cancel event before another opening.
3. Before accepting any picker event, check its descriptor is still current,
   both captured markers match, the detail is open, and the event is eligible.
   For selection also check `busy`. Ignore stale events. A current native
   `cancel` or empty-selection `change` clears this picker and returns custom
   state to idle silently, preserving a primary ready file or fallback.
4. For a selected file, capture the original `File`, clear the input value,
   remove the picker descriptor, and reject further events from that opening.
   An invalid file produces the custom error and releases its references
   without sharing or changing the primary prepared/fallback state.
5. A valid selection clears primary `readyFile`, `shareView`, and
   `imageFailed`, sets custom state to idle, installs a new custom-flight
   identity, and sets `sharing = true` before calling `shareImage` immediately
   with the original file and current text. There is no asynchronous work
   before the call. Guard handlers as well as disabled attributes so multiple
   same-task events cannot send twice.
6. On settlement, first release `sharing` and clear the custom-flight identity
   only if its captured epoch remains current and the identity still equals
   the active custom flight. Then apply the architecture outcome table only
   if the custom token also matches and the detail is open and eligible.
   Cleanup ownership is independent of permission to display the result.
7. Retain a file after first-attempt `needs-second-tap` or `aborted`. In `ready`, the
   custom button checks the same eligibility/busy guards, advances its token,
   captures the same retained file, clears the ready reference, installs its
   flight identity, and sets `sharing` before calling `shareImage` with current
   text and `{ second: true }`. No picker or asynchronous preparation runs.
   Settlement follows transition 6. A failed second attempt shows the error
   without returning to ready; abort remains silent.
8. Starting `share` or `download` after its existing busy guard advances the
   custom token, removes its picker, releases its ready file, and clears custom
   status before following the existing path. Do not alter the primary
   fallback helper or use the custom token to invalidate primary work.
9. On loss of eligibility, advance the custom token, remove its picker, release
   its ready file, and reset custom view state. Do not reset the entire
   component or release a primary operation's busy flag. A still-pending
   custom flight retains its busy ownership until settlement; transition 6
   must release it even though its UI token is invalid. If eligibility returns
   first, the image actions remain disabled until that flight settles.
10. Extend existing `resetShare` to advance the custom token, clear the picker,
    custom view, retained file, and flight identity. Keep its existing epoch
    increment and `sharing = false`. Close or event change invalidates all
    earlier epochs, so their settlements cannot clear newer busy flags.
    Already-started native sharing cannot be recalled. Unsettled native work
    keeps the current detail busy; closing still resets the detail.

Add the secondary button, hidden keyed input, cancel/change handlers, and
secondary-row styles. Keep existing action labels and styles intact, extend
the single live region with custom status precedence, and keep close available.
Retain the architecture's keyboard and focus rules.

### 4. Extend focused browser tests and their existing mocks

**Modify
[e2e/helpers.js](../../e2e/helpers.js).**
Add `pending?: number[]` to the existing `mockShare` options, defaulting to an
empty list. Entries are zero-based share-call indices. Record each call before
awaiting its result. For specified indices, register an unresolved per-call
resolver before returning the pending promise; retain immediate configured
behavior for all other indices.

Add `pendingShareCalls(page): Promise<number[]>` to return unsettled indices
and `settleShare(page, index, outcome = 'ok'): Promise<void>` to resolve that
pending call for `ok` or reject it with a DOMException named by `outcome`.
Remove its resolver on settlement. Throw explicitly for an unknown or
already-settled index. Tests poll `pendingShareCalls` before settling and do not
sleep. Keep records typed and local to each page without production hooks.
Preserve existing behavior/defaults and the captured real `File` objects,
`sameShareFile`, `shareCalls`, and `trackPosters`.

**Modify
[e2e/share.spec.js](../../e2e/share.spec.js).**
Keep current primary tests and add custom-sharing cases to this same suite.
Use Playwright's file chooser with in-memory fixture buffers, not new binary
fixture files. Inspect the captured file in the page to compare its bytes to
the selection buffer, filename, MIME, and size; capture the input's actual
`File` before change handling to establish original-object identity.
Reading bytes inside the test does not authorize production byte processing.

Cover each of these cases once, grouped by the behavior under test:

**Payload and unchanged primary actions**

* The custom action is secondary, keyboard reachable, and opens an image-only
  single-file picker. Assert input attributes and that the default share
  button does not open it.
* JPEG and PNG selection sends one original file plus the full existing event
  message. Repeat with an external-registration event and its external URL.
* No poster mounts, download events, new WhatsApp link, or application upload
  occurs along the custom path. Track outgoing requests after agenda setup
  so unrelated initial data/font requests do not create false positives.
* Choosing normal sharing or download while a custom retry is ready discards
  it and follows the original poster path. Custom failure must not mask a
  later primary error or fallback message.

**Cancellation and recovery**

* Picker cancel and empty selection do not share, download, or show an error.
  Cancelling a picker opened while a generated poster is ready preserves
  that existing primary retry.
* Picker cancellation and a cancelled second share attempt are silent. An
  `AbortError` on the first attempt offers the same one-tap recovery as
  `NotAllowedError`, because native picker return can abort before a share
  panel is shown.
* Omit both picker cancellation events, then deliberately activate custom
  sharing again and select successfully. A late event from the previous
  input cannot send or reset the replacement.
* Selecting the same local filename in a new operation works after success,
  failure, and cancellation because old input selection is cleared.
* A picker cancellation restores focus only within the still-open original
  detail. No stale callback takes focus from a different event.

**Failure and retry**

* Empty-type files with each accepted suffix reach the mocked share API as
  the original `File` with its type still empty. An uppercase suffix also
  qualifies. Unsupported/no suffix and a misleading double extension fail
  with only the agreed error. Supplied non-image or malformed MIME types
  fail even with `.jpg` names. Inject files through the input to test
  validation independently of the picker filter; construct controlled
  empty-type `File` objects in the test if file-upload tooling infers MIME.
* A file accepted by extension but rejected by browser capability checking
  produces the same brief error, without a replacement file or conversion.
* Missing `share`, missing `canShare`, false capability support, a throwing
  probe, and share `DataError` produce the custom inline error, not poster
  generation, download, or WhatsApp fallback.
* First `NotAllowedError` shows the custom retry. The second tap shares the
  same original object without a new picker. A second `NotAllowedError`
  releases it and does not offer a third attempt.

**Lifetime and concurrency**

* All image actions are disabled while a custom share promise is pending;
  same-task double activation sends only once. The custom action is disabled
  during generated-poster work too.
* Closing and reopening after a prepared custom retry starts fresh. Switching
  events or losing eligibility invalidates a pending picker or share result.
  Resolve a held earlier share after opening another event and ensure it does
  not change labels, messages, or busy state for the newer event.
* Losing eligibility while a custom share is pending suppresses its result
  but still releases its owned busy state on settlement. If eligibility
  returns before settlement, image actions stay disabled until settlement.
  An older epoch's settlement cannot release a newer operation's busy flag.
* Save the earlier input node in the test, invalidate its operation through
  normal sharing or event change, and dispatch its late selection/cancel to
  prove the stale handlers cannot send or reset current state.

Prefer existing fixtures and helpers over a new testing framework. For
programmatic event/eligibility changes that cannot be reached through the
current UI, use an existing agenda reload path with modified fake-sheet rows;
do not add production test hooks.

**Modify
[e2e/detail.spec.js](../../e2e/detail.spec.js).**
Make primary share button queries exact so the new longer label does not
create ambiguous matches. Assert the new button is absent for past,
cancelled, and missing events and present for shareable open, closed, and
external events. Existing broad “no sharing” assertions must cover both.

### 5. Document usage and device verification

**Modify [README.md](../../README.md).**
Add the secondary action to the sharing description: local original image,
same message, no application storage, no processing, possible single retry,
brief failure message, and cancellation without fallback. State that normal
sharing remains unchanged. Document the accepted File acceptance policy,
including the five-extension fallback only for missing MIME information and
the possibility that the browser still rejects the original file. Explain
that metadata remains and destination applications can alter or omit parts
of the payload.

Retain the existing pending Android/iOS checks and S1/S2 rules rather than
claiming them complete or changing the primary feature's release decisions.
Document the author's automated-check-only release decision for this added
action and the accepted compatibility risk. Add the custom follow-up checks
below and record device/browser/destination versions, observed behavior, and
date when performed. Do not record user images.

### 6. Verify and release

No schema, Apps Script, package manifest, lockfile, Playwright configuration,
or additional production file changes are planned. No existing file is
deleted. This design document is the documentation deliverable; it is not an
implementation change.

Run the smallest existing commands covering these changes, in order:

1. `node --test src/lib/share.test.js`
2. `npm run check`
3. `npx playwright test e2e/share.spec.js e2e/detail.spec.js e2e/image.spec.js --project=chromium --project=mobile`

The Playwright server performs a production build before previewing the app.
The `mobile` project is Chromium device emulation, not real Android or iOS.
Do not treat either browser project as evidence of actual system sharing.
Run wider suites only if these results expose a reason to do so.

Release of this added action requires the three automated commands above to
pass; their Playwright server includes the production build. Real-device
checks do not block publication, by explicit author decision. This accepts
that native selection, cancellation, sharing, or recipient text handling may
fail despite passing mocks. Do not mark the device checks passed based on
automated results. Existing primary-sharing S1/S2 decisions remain unchanged.

As follow-up, check Android with Chrome and iPhone with Safari using WhatsApp.
Record actual device, OS, browser and destination versions, date, and per-case
pass/fail/not observed:

* Default generated sharing and download still behave as documented.
* Choosing an original photo sends its image and the expected message where
  the receiving app supports both; note any omission by that app.
* Picker cancellation leaves the page usable and the custom button available.
* The same image can be selected again.
* A blocked initial share can be retried with the deliberate tap where that
  browser exhibits the condition; do not report an unobserved retry as tested.
* Cancelling the system panel causes no substitute action.
* Unsupported files show the brief error, followed by a working normal share.
* Long button text wraps at mobile widths without horizontal overflow or
  reducing tap targets; keyboard focus and the live announcement remain usable.

No numerical coverage target is added. Acceptance is the explicit output and
transition coverage above. Automated tests, builds, and device checks listed
here are planned verification for implementation, not checks executed while
writing this document.

## Additional Resources

* The approved concept brief from the preceding brainstorming session is
  stored with that conversation, not as a public repository document.
* Existing repository sharing behavior and tests listed in the implementation
  plan are the technical evidence for this draft.

*Drafted with EGM*
