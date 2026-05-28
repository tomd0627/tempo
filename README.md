# Tempo — Music Practice Tracker

A local-first practice journal for musicians. Log sessions by instrument, duration, and focus area. Tempo visualises your habits with an animated radial burst (week view) and a contribution grid (year view), and surfaces streaks, totals, and instrument breakdowns in a stats panel.

No accounts. No server. All data lives in your browser's IndexedDB.

---

## Features

- **Week view** — animated radial burst showing practice minutes per day
- **Year view** — contribution grid (GitHub-style) spanning the last 12 months
- **Log view** — add, edit, and delete sessions with instrument, duration, and focus area
- **Stats view** — current streak, longest streak, weekly total, top instrument, and time-by-instrument breakdown
- **Export** — download all sessions as JSON from the Stats view
- Keyboard-navigable, screen-reader accessible (Lighthouse a11y: 100)

## Stack

Vanilla HTML/CSS/JS — no framework, no build step.

| Concern | Tool                                                                            |
| ------- | ------------------------------------------------------------------------------- |
| Storage | IndexedDB via [idb-keyval@6](https://github.com/jakearchibald/idb-keyval) (CDN) |
| Icons   | [Lucide](https://lucide.dev) (CDN)                                              |
| Fonts   | DM Sans + JetBrains Mono (Google Fonts)                                         |
| Deploy  | Netlify (`publish = "."`)                                                       |

## Local development

```bash
# Serve the project (no install required)
npx serve . -l 3000
```

Open <http://localhost:3000> in your browser.

## Linting & formatting

```bash
npm install          # install dev tooling (ESLint, Stylelint, Prettier, html-validate)

npm run lint         # run all linters
npm run format       # auto-format all files

npm run lint:js      # ESLint only
npm run lint:css     # Stylelint only
npm run lint:html    # html-validate only

npm run lighthouse   # Lighthouse CLI audit (requires dev server on :3000)
```

Pre-commit hooks (Husky + lint-staged) run Prettier, ESLint, Stylelint, and html-validate automatically on every commit.

## Project structure

```
tempo/
├── index.html
├── css/
│   ├── main.css            tokens, reset, layout, header, nav, footer
│   ├── visualizations.css  canvas wrappers, overlays, tooltips, week nav
│   ├── log.css             session form + session list
│   └── stats.css           stats cards + instrument breakdown
├── js/
│   ├── db.js               IndexedDB layer
│   ├── utils.js            canvas helpers, date utilities
│   ├── log.js              session form, add/edit/delete
│   ├── radial.js           radial week-burst canvas
│   ├── grid.js             year contribution-grid canvas
│   ├── stats.js            streak calculation, stats panel
│   └── main.js             view routing, event orchestration
└── assets/
    └── favicon.svg
```

## Data model

Sessions are stored in IndexedDB, keyed by date string:

```
key:   "YYYY-MM-DD"
value: [{ id, date, instrument, duration, focusArea, createdAt }, ...]
```

## License

MIT
