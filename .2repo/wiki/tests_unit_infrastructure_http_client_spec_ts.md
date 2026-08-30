# tests/unit/infrastructure/http/client.spec.ts

## Purpose

Unit tests for the shared axios instance exported by `src/infrastructure/http/client.ts`. Verifies that the instance's `baseURL`, `timeout`, and `withCredentials` defaults are wired correctly from environment variables and that sensible fallbacks apply when those variables are absent.

## Key elements

- **`loadClient(environment)`** — Resets Vitest's module registry, stubs the given env vars (unsetting any whose value is `undefined`), then dynamically re-imports the client module so its module-scope `import.meta.env` reads execute fresh. Returns the freshly imported module.
- **`afterEach`** — Calls `vi.unstubAllEnvs()` to clear stubs between tests.
- **`describe('axios instance defaults')`** — Three cases:
  - *Environment values are picked up* — asserts `baseURL === 'http://api.test'` and `timeout === 2500`.
  - *Fallbacks when env vars are missing* — asserts `baseURL === ''` (empty string, not `undefined`) and `timeout === 10_000`.
  - *Credentials are sent* — asserts `withCredentials === true`, ensuring the httpOnly refresh cookie is included.

## Notes

- The test relies on `vi.resetModules()` + a **dynamic `import()`** to re-execute module-scope code. Static `import` at the top of the file would only run the env reads once; this pattern is the whole reason `loadClient` exists.
- The fallback assertion deliberately checks for `''` (empty string) rather than `undefined`. The comment in the source notes that axios treats both identically, but the production code intentionally emits `''` so the behavior is a decision, not an accident.
- No external HTTP calls are made; the tests only inspect `instance.defaults` on the returned axios instance.
