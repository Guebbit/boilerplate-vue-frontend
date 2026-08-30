# tests/unit/infrastructure/http/http-refresh.spec.ts

## Purpose

Exercises the 401 → refresh → replay flow through the **real** axios interceptor chain by driving requests against a live MSW (Mock Service Worker) node server, rather than a stubbed adapter. A broken refresh is invisible to types and to e2e tests (it just logs the user out later), so this suite pins the exact request sequence, token propagation, and the `_dontRetry` guard that prevents infinite refresh loops. It is the complement to `http.spec.ts`, which covers error normalisation with plain stubs.

## Key elements

- **`server`** (MSW `setupServer`) — Handlers for `GET /account/refresh`, `GET /orders`, and every excluded path. All handlers push into `requestLog` before responding, giving assertions a server-side view of the request sequence.
- **`Scenario` / `defaultScenario()`** — Per-test knobs (`refreshBudget`, `refreshOmitsToken`, `protectedAccepts`) that control how the server answers. Each case mutates only the field it cares about.
- **`requestLog` / `routes()` / `timesRequested()`** — Server-side request record and helpers. Assertions read these because a refresh attempt is not observable from the caller without mocking the code under test.
- **`loadHttp()`** — Resets the Vitest module registry, stubs `VITE_API_URL`, then re-imports `@/infrastructure/http` so the axios instance and interceptors are freshly built (they are registered at import time).
- **`clearAuthCookie()`** — Clears the `isAuth` cookie via the `Document.prototype` setter, matching how `stores/session.ts` writes it, to isolate each test.
- **`EXCLUDED_PATHS` / `ABSOLUTE_EXCLUDED_URL`** — Paths that must never trigger a refresh; tested both as relative (generated-client style) and absolute URLs.
- **`unauthorized(message)`** — Builds the standard 401 envelope so handlers and app agree on one error shape.
- **Test suites** — Three `describe` blocks: successful refresh (token stored, cookie set, replay carries new token); unusable token (200-without-token, refresh-fails, replay-also-fails with `_dontRetry` guard); excluded paths.

## Relationships

- **`src/infrastructure/http/index.ts`** — The module under test. `loadHttp()` imports it (via `vi.resetModules()` + `vi.stubEnv()`) to get a fresh `orvalMutator` and interceptor chain. The test verifies that `instance.interceptors.response` runs, that the replay re-enters the same instance, and that `_dontRetry` stops a second refresh.
- **`docs/tools/unit-testing.md`** — Documents the project's unit-testing conventions and tooling choices (MSW node interceptor, Pinia test setup, Vitest patterns) that this file follows.

## Notes

- **Why MSW and not a stubbed adapter?** The interceptor chain (`instance.interceptors.response`) must actually execute, the replay must re-enter the same axios instance, and `_dontRetry` must be exercised. A hand-rolled adapter would bypass all three.
- **Import-time side effects:** The http module builds its axios instance and registers interceptors at import time, so `vi.resetModules()` + `vi.stubEnv('VITE_API_URL', …)` must precede every `import()`. Forgetting the reset causes interceptors to stack and a single request to traverse the chain multiple times.
- **Assertion strategy:** Refresh attempts are invisible to the caller; the only reliable observation point is the server's request log. Hence all sequence assertions read `requestLog` rather than the returned promise.
- **`onUnhandledRequest: 'error'`** ensures any URL not explicitly mocked fails the test immediately instead of leaking a real network call.
- **Cookie isolation:** `clearAuthCookie()` uses the `Document.prototype` descriptor setter (not `document.cookie = …` directly) to match the write path in `stores/session.ts` and avoid environment-specific differences.
