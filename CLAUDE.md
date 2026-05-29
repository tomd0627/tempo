# Tempo — Codebase Guide

## Project

Tempo is a local-first music practice tracker built in vanilla HTML/CSS/JS. Musicians log sessions (instrument, duration, focus area) and the app renders animated Canvas visualizations: a radial week burst and a year-view contribution grid. All data is stored in IndexedDB. No framework, no build step.

Deployed to Netlify at `publish = "."`.

## Violet palette rationale

The primary accent `#7B5EA7` echoes the portfolio's purple accent but is deliberately desaturated (chroma pulled back) and sits in a warm-leaning hue position (slightly red of pure blue-purple). This gives it an analog, worn-in quality rather than a tech-blue feel — contrasting the cold dark background with the warmth of creative effort. It is not derivative; it occupies a different part of the color space with different intent.

## Stack

- HTML5 / CSS / vanilla JS (sourceType: 'script', no ES modules)
- Canvas API — radial burst + year grid, both DPR-aware
- IndexedDB via `idb-keyval@6` CDN UMD build → `window.idbKeyval`
- Lucide Icons via jsDelivr CDN → `lucide.createIcons()`
- Google Fonts: DM Sans + JetBrains Mono
- Pre-commit: Husky + lint-staged + Prettier + ESLint + Stylelint + html-validate

## File structure

```
tempo/
├── index.html
├── css/
│   ├── main.css          — tokens, reset, layout, header, nav, focus, footer
│   ├── visualizations.css — canvas wrappers, overlays, tooltips, week nav
│   ├── log.css           — session form + session list
│   └── stats.css         — stats cards + instrument breakdown
├── js/
│   ├── db.js             — IndexedDB layer (IIFE: Db)
│   ├── utils.js          — canvas setup, date helpers (IIFE: Utils)
│   ├── log.js            — session form, add/edit/delete (IIFE: Log)
│   ├── radial.js         — radial week burst canvas (IIFE: Radial)
│   ├── grid.js           — year contribution grid canvas (IIFE: Grid)
│   ├── stats.js          — streak calc, stats panel (IIFE: Stats)
│   └── main.js           — orchestration, view routing, init
├── assets/
│   └── favicon.svg
├── netlify.toml / _redirects
├── package.json / eslint.config.mjs / stylelint.config.js
├── .htmlvalidate.json / .prettierrc / .prettierignore / .gitattributes
└── .husky/pre-commit
```

## JS architecture

All JS files are classic scripts (no `type="module"`). Each module is an IIFE that assigns to a global:

```js
/* exported Radial */
var Radial = (function () {
  "use strict";
  // ...
  return { init, render };
})();
```

Load order in `index.html`:

1. idb-keyval CDN (defer)
2. Lucide CDN (defer)
3. `db.js → utils.js → log.js → radial.js → grid.js → stats.js → main.js` (all defer)

**Event coordination:** After any write, `log.js` dispatches `document.dispatchEvent(new CustomEvent("sessions-updated"))`. `main.js` listens and calls `Radial.render()`, `Grid.render()`, `Stats.render()`.

## Data model

Sessions keyed by date in IndexedDB:

- **Key:** `"YYYY-MM-DD"` string
- **Value:** array of `{ id, date, instrument, duration, focusArea, createdAt }`

## CSS architecture

- All values via custom properties in `main.css` `:root`
- Logical properties throughout (`margin-inline`, `padding-block`, etc.)
- Property order: strict alphabetical (Stylelint enforces)
- BEM class naming (`block__element--modifier`)
- No vendor prefixes for properties in evergreen browsers

## Canvas notes

- `Utils.setupCanvas(canvas, w, h)` handles DPR scaling — always call before drawing
- All drawing coordinates are CSS pixels; DPR handled once in `setupCanvas`
- `cancelAnimationFrame(animFrame)` must be called at the top of `render()` to prevent stacked loops
- `ctx.roundRect` requires Chrome 99+, Firefox 112+, Safari 15.4+
- Check `Utils.prefersReducedMotion()` and skip animation if true

## Commands

```bash
npx serve . -l 3000        # local dev server
npm run lint               # run all linters (JS, CSS, HTML, Prettier)
npm run format             # format all files
npm run lint:js            # ESLint only
npm run lint:css           # Stylelint only
npm run lint:html          # html-validate only
npm run lighthouse         # Lighthouse CLI (requires dev server running)
```

## Phases

1. Pre-code declaration — DONE
2. Core HTML/CSS scaffold — DONE
3. IndexedDB layer (db.js) — DONE
4. Session log JS (log.js) — DONE
5. Radial week visualization (radial.js) — DONE
6. Year-view grid (grid.js) — DONE
7. Stats panel (stats.js) — DONE
8. Pre-commit tooling — DONE
9. Final audit (Lighthouse, a11y, contrast, README, HANDOFF) — DONE
