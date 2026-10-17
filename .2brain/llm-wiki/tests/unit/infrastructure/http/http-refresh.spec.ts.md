---
source: tests/unit/infrastructure/http/http-refresh.spec.ts
sha256: fe3f36872c411ff6069eb63dd04a69e021cb284bafb13351d2dcfad4bb65cef2
generated_at: 2026-10-17T02:35:12.537362+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/http/http-refresh.spec.ts

## Purpose

Unit tests for the **401 → refresh → replay** interceptor chain in the HTTP client. Unlike `http.spec.ts` (which stubs the axios adapter for error-normalisation), this file spins up a real HTTP server via MSW's Node interceptor so that `instance.interceptors.response` actually executes, the replay traverses the same axios instance, and the `_refreshed` guard is exercised. This matters because a broken refresh is silent to both the type system and the e2e suite — it only logs the user out later.

## Key elements

- **`Scenario` / `defaultScenario()`** — Per-test configuration object (`refreshBudget`, `refreshOmitsToken`, `protectedAccepts`, `protectedIdle`) that drives MSW handler responses. Reset before every case so each test changes only what it targets.
- **`requestLog` / `routes()` / `timesRequested()`** — Server-side record of every request that arrived. Assertions read this (not the caller's return value) because a refresh attempt is invisible from the client side without stubbing the code under test.
- **`loadHttp()`** — Calls `vi.resetModules()`, stubs `VITE_API_URL`, then dynamically imports `@/infrastructure/http`. Required because the module registers interceptors at import time; without a fresh import the interceptor chain stacks and one request runs it multiple times.
- **`clearAuthCookie()`** — Clears the `isAuth` cookie through `Document.prototype`'s setter, mirroring what `stores/session.ts` does. Prevents leakage between cases.
- **MSW handlers** — One each for `POST /account/refresh`, `GET /orders` (the protected route), all entries in `EXCLUDED_PATHS` + one absolute URL, and `POST /account/logout-all`. Each logs the request and responds based on `scenario`.
- **`describe('a 401 SESSION_IDLE')`** — Verifies an idle 401 ends the session (`idleSignal` increments) *without* attempting a refresh.
- **`describe('401 refresh flow')`** — Covers: single refresh + replay with new token; token stored in session store; `isAuth` cookie restored; single-flight (two concurrent 401s share one refresh call); refresh-omits-token (200 with no token is treated as failure); excluded paths never trigger refresh; absolute-URL exclusion; `logout-all` is *not* excluded (refreshes normally).

## Relationships

- **`@/infrastructure/http`** (dynamic import) — the module under test; provides `orvalMutator`.
- **`@/infrastructure/session.ts`** — `useSessionStore` used to assert `accessToken`, `idleSignal`, `expiredSignal`.
- **`@/infrastructure/http/reauth-prompt.ts`** — `useReauthPromptStore` imported for assertions on re-auth signalling.
- **`src/infrastructure/http/refresh.ts`** — Referenced in comments; the `refreshExcludedPaths` constant here mirrors its `EXCLUDED_PATHS` so the test stays in sync.
- **`tests/unit/infrastructure/http/http.spec.ts`** — Complementary sibling covering error-normalisation with plain stubs.

## Notes

- The file deliberately avoids a hand-rolled axios adapter because that would skip the real interceptor pipeline. MSW's `setupServer` (Node) intercepts at the HTTP layer instead.
- `server.listen({ onUnhandledRequest: 'error' })` means any request the handlers don't cover fails the test immediately — useful for catching typos in endpoint paths.
- `EXCLUDED_PATHS` is duplicated from `refresh.ts` rather than imported to keep the test's failure mode explicit (a missing entry here is a visible assertion failure, not a silent production gap).
- The `loadHttp()` pattern means every test gets a fresh axios instance and interceptor registration; `beforeEach` also calls `vi.unstubAllEnvs()` to undo the `VITE_API_URL` stub.
- `clearAuthCookie` uses the prototype setter (not `document.cookie = ...`) to match production write semantics and to work in environments where the cookie getter is read-only.
