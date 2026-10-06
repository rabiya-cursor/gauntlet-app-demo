# Ship Log

A small web app for logging what you shipped each day. Entries stay in `localStorage` in this browser.

## Run

```bash
npm install
npm test
npm run dev -- --host 0.0.0.0 --port 5173
```

Open http://localhost:5173.

## What it does

- Add an entry with a required title, an optional http/https link, a tag (`feature`, `fix`, `infra`, `docs`, `other`), and a date that defaults to today.
- List entries newest first, filter by tag, and show how many entries are on screen.
- Delete an entry.
