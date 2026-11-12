# src

## Overview
Source of the SvelteKit static site (prerendered, `adapter-static`). Application logic is in `lib`, pages in `routes`.

## Interface
- [app.html](./app.html): HTML shell (`lang="ca"`, `noindex, nofollow`, `theme-color`, Open Graph tags, `%sveltekit.head%` / `%sveltekit.body%`).
- [app.d.ts](./app.d.ts): empty `App` namespace declaration (all SvelteKit interfaces commented out).
- [lib/](./lib/README.md): logic modules, API client, texts and the Svelte [components](./lib/components/README.md).
- [routes/](./routes/README.md): the single page and layout.

## Invariants
- [app.html](./app.html) keeps `<meta name="robots" content="noindex, nofollow" />`.
- `#lib` and `#lib/*` resolve to `src/lib` through `package.json` `imports`.

## Side Effects
- None in this directory; see child contracts.

## Verification
- Run: `npm test`
- Types: `npm run check`
