# src/infrastructure/http/client.ts

## Purpose

Single shared axios instance that all generated HTTP clients go through. It is the leaf of the http tier: configured but inert (no interceptors, no app imports), so importing it can never re-enter `index.ts` mid-evaluation. `index.ts` attaches the request/response interceptors on top of it.

## Key elements

- **`instance`** (exported const) — the one axios instance for the whole app. Configured with:
  - Default `Accept` / `Content-Type` JSON headers.
  - `withCredentials: true` — carries the httpOnly refresh cookie so the refresh flow works without the token being readable from JS.
  - `timeout` from `VITE_AXIOS_TIMEOUT` env (default 10 000 ms).
  - `baseURL` resolved at module-evaluation time from (in order) `globalThis.__E2E_API_URL` → `VITE_API_URL` → `''`.

## Relationships

- **`src/infrastructure/http/index.ts`** — imports `instance` from this file and wires the auth/refresh interceptors onto it. This file must stay free of any app imports to avoid a circular-evaluation problem.
- **`src/infrastructure/http/refresh.ts`** — depends on the same `instance` (via `index.ts`) for its token-refresh calls; the `withCredentials` flag here is what lets the browser attach the httpOnly refresh cookie to those calls.

## Notes

- **Do not add imports of app code here.** The file is intentionally a leaf; any app import risks a cycle with `index.ts`.
- **`__E2E_API_URL` is a runtime global, not an env var.** It is set on `window` by the e2e shard runner's `visit` command (see `tests/support/e2e/commands.ts`) before the app boots. Only that code path defines it; nothing else should.
- **`baseURL` is set once at module load.** Changing `VITE_API_URL` at runtime (e.g. in tests) after the module has evaluated will have no effect unless you also reassign `instance.defaults.baseURL`.
