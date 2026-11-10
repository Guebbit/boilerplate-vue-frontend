---
source: tests/unit/infrastructure/http/http-refresh.spec.ts
sha256: 2fae0510bf41ad78c566b58ec72bfbf56a59bd7918f8eedd9aec8be14a7b278b
signature: 277329fe99a6e1afbb9d388b387f2a28457773dcc7b55350adea87ca899a2e49
generated_at: 2026-11-10T07:57:25.637239+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/http/http-refresh.spec.ts

## Purpose

Tests the 401 → refresh → replay interceptor flow against a real MSW node interceptor rather than a stubbed axios adapter. This ensures the actual `instance.interceptors.response` chain runs, the replay travels back through the same axios instance, and the `_refreshed` flag correctly prevents a second refresh attempt — behaviors a hand-rolled adapter would not reproduce. It is complementary to `http.spec.ts`, which covers error normalisation with plain unit stubs.

## Key elements

- **`EXCLUDED_PATHS`** — list of `/account/*` routes (login, signup, password reset, 2FA, restore) where a 401 is a normal business outcome and must never trigger a refresh. The first test asserts this list matches the `noRefresh` rows in the generated route table.
- **`Scenario` / `defaultScenario()`** — a mutable config object controlling how the MSW handlers respond (refresh budget, token omission, idle/forbidden/public-page modes, server-error on refresh). Reset before every test.
- **`requestLog: LoggedRequest[]`** — server-side record of every request (method, pathname, authorization header). Assertions read this to verify replay carried the new token and that excluded paths were not re-attempted.
- **`handlers`** — MSW handler array for `POST /account/refresh`, `GET /orders`, `GET /account`, all excluded paths, and `DELETE /account/sessions`. Each logs the request and responds according to the current `scenario`.
- **`loadHttp()`** — resets modules, stubs `VITE_API_URL`, then dynamically imports `@/infrastructure/http` so interceptors register exactly once per test case.
- **`routes()` / `timesRequested(route)`** — helpers over `requestLog` for sequence and count assertions.
- **`describe` blocks** — cover `SESSION_IDLE` (no refresh, just idle signal), successful refresh + replay, refresh budget exhaustion, token-omitted refresh, 403 on protected route, 403 on `/account` read, public-page 401, refresh 500, excluded-path non-refresh, and absolute-URL exclusion.

## Relationships

- **`tests/support/unit/msw-server.ts`** — provides the shared `server` instance. The file imports it and registers its local `handlers` array via `server.use(...)` in every `beforeEach`, so the scenario-driven responses are active for each test case.
- **`tests/support/unit/fixtures.ts`** — provides `aProblem`, used by the MSW handlers to build the standard 401/403 reject envelope, ensuring the mock responses match the exact error shape the app's code under test expects.

## Notes

- The HTTP module registers its axios instance and interceptors **at import time**. `loadHttp()` calls `vi.resetModules()` before re-importing; without this, interceptors stack across test cases and a single request runs the chain multiple times.
- `VITE_API_URL` must be stubbed **before** the dynamic import, because the module reads it during construction.
- Assertions are written against `requestLog` (server-side) rather than the caller's return value, because a failed refresh is not directly observable from the caller without stubbing the code under test — which is exactly what this file avoids.
- The file is intentionally driven through MSW's node interceptor (a real HTTP-level middleware), not an axios adapter mock, so that interceptor ordering, replay routing, and the `_refreshed` guard are all exercised for real.
