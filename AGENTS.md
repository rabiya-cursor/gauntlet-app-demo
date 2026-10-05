# AGENTS.md

Guidance for agents working in this repo.

- Keep the stack light: Node 20+, Vite + vanilla TypeScript (or plain JS), Vitest for tests. No heavy frameworks, no database.
- Persist data in localStorage unless told otherwise.
- Every feature gets at least one unit test. Run `npm test` before committing; it must pass.
- Dev server: `npm run dev -- --host 0.0.0.0 --port 5173`.
- Keep pure logic (filtering, validation, CSV) in `src/lib/` so it is unit-testable without a browser.
- Open pull requests into `main` with a description that lists what was built and the test results.
- Never commit secrets, `.env` files, or `node_modules`.
