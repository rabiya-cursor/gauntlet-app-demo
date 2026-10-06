# Ship Log

A small log for what you shipped each day. Entries stay in this browser via `localStorage`.

Add a title, an optional http(s) link, a tag (`feature`, `fix`, `infra`, `docs`, `other`), and a date (today by default). The list is newest first, can be filtered by tag, and shows how many entries are visible. Delete removes an entry.

## Run

```bash
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

## Test

```bash
npm test
```
