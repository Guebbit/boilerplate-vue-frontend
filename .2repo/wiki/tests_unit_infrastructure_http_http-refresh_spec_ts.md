# tests/unit/infrastructure/http/http-refresh.spec.ts

## Purpose

Unit-test suite for the **401 → token refresh → request replay** flow, executed against a real HTTP server (MSW's node interceptor) so that the axios response-interceptor chain, the replay round-trip, and the `_dontRetry` guard are all exercised for real. This scenario is invisible to both the type system and the e2e suite—a broken refresh silently logs the user out later—so it needs a dedicated test that drives `orvalMutator` through the actual instance.

## Key elements

- **`Scenario` / `defaultScenario()`** — Per-test server configuration (`refreshBudget`, `refreshOmitsToken`, `protectedAccepts`); each test overrides only the field under test.
- **`requestLog`, `routes()`, `timesRequested()`** — Server-side record of every request (route + `Authorization` header). All assertions read from this log because a refresh attempt is not observable on the caller's side.
- **`EXCLUDED_PATHS` / `ABSOLUTE_EXCLUDED_URL`** — Auth endpoints (login, signup, reset, etc.) that must never trigger a refresh; also tested with an absolute URL to ensure exclusion works regardless of URL form.
- **`unauthorized(message)`** — Builds the standard 401 reject envelope (`success: false`, `errors[0].code === 'UNAUTHORIZED'`).
- **MSW `server`** — Three handler groups: `GET /account/refresh` (budget-limited), `GET /orders` (protected route), and all excluded POST paths.
- **`loadHttp()`** — Calls `vi.resetModules()` + `vi.stubEnv('VITE_API_URL', …)` then dynamically imports `@/infrastructure/http`, guaranteeing a fresh axios instance and interceptor registration per test.
- **`clearAuthCookie()`** — Clears the `isAuth` cookie via `Document.prototype` setter (mirrors how `stores/session.ts` writes it).
- **Test suites** — `401 refresh flow` with sub-suites: successful refresh (replay, token storage, cookie restore), unusable refresh (200-without-token, refresh 401, no second retry), and excluded paths.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- **Why MSW node, not a stubbed adapter:** The entire point is that `instance.interceptors.response` fires and the replay goes back through the *same* axios instance. A hand-rolled adapter cannot reproduce that.
- **`vi.resetModules()` is mandatory** before every import of the http module; without it, interceptors stack across tests and one request traverses the chain multiple times.
- **Complementary file:** `tests/unit/infrastructure/http/http.spec.ts` covers the error-normalisation side of the same module with plain unit stubs. The two are deliberately split.
- **Cookie assertion** checks `document.cookie` contains `isAuth=true`—the only JS-readable cookie that `tryRestoreAuth` reads on next boot.
- **Refresh budget** models an expiring refresh cookie: once exhausted, `/account/refresh` answers 401, letting tests cover both "refresh succeeds" and "refresh fails" without extra mocking.
