# Tempo — Handoff

## Current state

**All phases complete (1–9).**

Lighthouse scores (desktop): Performance 100, Accessibility 100, Best Practices 100, SEO 100.
Lighthouse scores (mobile): Performance 89, Accessibility 100, Best Practices 100, SEO 100.
Mobile performance gap is Google Fonts render-blocking — acceptable without self-hosting fonts.

All four linters pass with zero errors:

- ESLint (`npm run lint:js`) ✓
- Stylelint (`npm run lint:css`) ✓
- html-validate (`npm run lint:html`) ✓
- Prettier (`npm run lint:format`) ✓

## Decisions made

- **idb-keyval delivery:** CDN UMD from jsDelivr (`idb-keyval@6/dist/umd.js`) exposes `window.idbKeyval`
- **Lucide delivery:** CDN UMD from jsDelivr (`lucide@latest/dist/umd/lucide.min.js`)
- **CDN + app scripts all use `defer`:** execution order is preserved since deferred scripts run in document order
- **Google Fonts:** `<link rel="stylesheet">` (synchronous) — async `preload/onload` trick is blocked by the strict CSP (`script-src` has no `'unsafe-inline'`)
- **ESLint config file:** `eslint.config.mjs` (not `.js`) because `package.json` has no `"type":"module"`
- **`no-redeclare` rule:** configured with `{ builtinGlobals: false }` to allow IIFE globals to shadow ESLint global declarations
- **Stylelint selector pattern:** BEM pattern added (`^[a-z][a-z0-9-]*(__[a-z][a-z0-9-]*)?(--[a-z][a-z0-9-]*)?$`) since `stylelint-config-standard` defaults to simple kebab-case only
- **`stylelint-order` version:** `^8.1.1` (v6 only supports stylelint ≤16, v8+ supports v17)
- **`doctype-style` html-validate option:** uses `style` not `case` as the option key
- **`role="banner"` / `role="contentinfo"`:** removed from `<header>` and `<footer>` (redundant in HTML5)
- **Canvas overlay `aria-label`:** added `role="group"` to `#radial-overlay` and `#grid-overlay`
- **`clip` deprecated property:** removed from `.visually-hidden` (using `clip-path: inset(50%)` alone is sufficient)
- **`[hidden]` override:** added `[hidden] { display: none !important; }` to CSS reset — `btn { display: inline-flex }` otherwise overrides the UA stylesheet

## Remaining work

None. Project is complete.
