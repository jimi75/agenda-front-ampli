# e2e

## Overview
Playwright browser tests (`*.spec.js`) plus the non-test infrastructure they rely on: a server launcher and an in-browser stand-in for the Google Apps Script. No Google server runs: requests to the fake script URL are answered inside the browser by the real `apps-script/Code.gs` against a fake sheet ([apps-script](../apps-script/README.md)). Specs: `detail`, `external`, `image`, `share`, `signup`.

## Interface
- [serve.js](./serve.js): Playwright `webServer` command; runs `vite build` with `NODE_ENV=production`, `BASE_PATH=/agenda-front-ampli`, `VITE_AGENDA_API_URL=http://localhost:5301/exec`, then `vite preview --port 5300 --strictPort`.
- [script.js](./script.js): `SCRIPT_URL`, `installScript(page, options)` → `{ script, signups(), baixes() }`; `ScriptOptions` `{ closed, busy, down, loseAnswer, features }`. Seeds events `accio-1`, `acte-1`, `cancel-1`, `pasat-1`, `resp-1`, `ext-1`.
- [helpers.js](./helpers.js): `MINE_KEY`, `TODAY` (`2026-11-10T09:00:00+01:00`), `openAgenda(page, config)`, `cards`, `card`, `detailDialog`, `signupDialog`, `readMine`, `readPngSize`, `pixelAt`, `hasInk`, `mockShare` (including pending call indices), `shareCalls`, `pendingShareCalls`, `settleShare`, `sameShareFile`, `trackPosters`, `postersRendered`.
- Specs: [detail.spec.js](./detail.spec.js), [external.spec.js](./external.spec.js), [image.spec.js](./image.spec.js), [share.spec.js](./share.spec.js), [signup.spec.js](./signup.spec.js).

## Invariants
- [script.js:installScript](./script.js) only intercepts `http://localhost:5301/exec`; every test gets a freshly seeded sheet (`Esdeveniments`, empty `Inscripcions`, `Config!B1` = `SI`/`NO` per `closed`) and responses carry `access-control-allow-origin: *`.
- [helpers.js:openAgenda](./helpers.js) fixes the browser clock with `page.clock.setFixedTime` (default `TODAY`) before navigating; the `offline` option visits once, then sets `options.down = true`.
- [../playwright.config.js](../playwright.config.js) runs projects `chromium` (1280×900), `mobile` (Pixel 7, 390×844) and `webkit` (only `image.spec.js`); `baseURL` is `http://localhost:5300/agenda-front-ampli/`.

## Side Effects
- [serve.js](./serve.js): spawns `npx vite build` (writes `build/`) and a long-running `vite preview` on port 5300; forwards SIGINT/SIGTERM.
- Specs and helpers drive a real browser, read/write its `localStorage` and intercept network routes; no external network.

## Verification
- Run: `npm run test:e2e` (all projects), or `npx playwright test --project=chromium --project=mobile` as in CI.
