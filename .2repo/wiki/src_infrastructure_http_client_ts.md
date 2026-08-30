# src/infrastructure/http/client.ts

## Purpose

Creates and exports the single shared axios instance used by every HTTP client in the app. It exists as a dependency-free leaf of the http tier so that importing it can never create a circular evaluation through `index.ts`.

## Key elements

- **`instance`** – The sole export. An `axios` instance pre-configured with:
  - JSON `Accept` / `Content-Type` headers
  - `withCredentials: true` (carries the httpOnly refresh cookie)
  - A timeout read from `VITE_AXIOS_TIMEOUT` (default 10 000 ms)
  - `baseURL` resolved at runtime: `window.__E2E_API_URL` → `VITE_API_URL` → `''`

## Relationships

- **`src/infrastructure/http/index.ts`** – Imports `instance` and attaches the request/response interceptors (auth, refresh, error handling). This file remains interceptor-free by design.
- **`src/infrastructure/http/refresh.ts`** – Consumes `instance` to POST the refresh-token request; relies on `withCredentials` to deliver the httpOnly cookie.
- **`docs/getting-started.md`** – References the `VITE_API_URL` env var that this file reads to set the default `baseURL`.

## Notes

- This file must stay a **leaf**: do not add imports from the app. `index.ts` is the only place where app-level interceptors are wired on.
- `__E2E_API_URL` is set on `globalThis` by the e2e shard runner (`tests/support/e2e/commands.ts`) before the bundle boots. It is not a build-time env var and will not appear in `.env` files.
- Because `baseURL` is assigned after `create()`, an absolute `url` passed to any request will bypass it entirely (standard axios behavior).
