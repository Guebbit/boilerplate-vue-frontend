---
source: tests/unit/infrastructure/http/step-up.spec.ts
sha256: 6670de976bd910849d80fbe1a69cf79a66030ba348517a005f6cdfbd257c6ed4
signature: 7bc08c800accb81d1618d76a8ff25b136661b4fd1bf93eb9978187a565d2cee8
generated_at: 2026-11-10T08:00:21.478499+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/http/step-up.spec.ts

## Purpose

Unit test for the `REAUTH_REQUIRED` step-up (park-and-retry) mechanics in the HTTP interceptor. It verifies that a 401 demanding fresh authentication parks the in-flight request, opens the reauth prompt, and replays the request exactly once on success — or rejects it on cancel / second failure. Uses MSW against a real axios instance (same pattern as `http-refresh.spec.ts`) because a broken replay silently leaves requests hanging rather than throwing.

## Key elements

- **`loadHttp()`** — resets modules, stubs `VITE_API_URL`, and dynamically imports `@/infrastructure/http` so each test gets a fresh interceptor wired to the stub API.
- **`reauthProblem()` / `reauthRequired()`** — build the 401 problem+json body (with optional `details.methods`) that `requireFreshAuth` would emit.
- **`handlers`** (MSW) — stub `POST /checkout` (JSON) and `GET /export` (blob / CSV) routes; both flip between a 401 and a success based on the mutable `scenario.requiresReauth`.
- **`waitForPrompt()`** — polls via `vi.waitFor` until `useReauthPromptStore().isOpen` is true (the interceptor's `requestStepUp()` runs ≥ 1 microtask after the 401).
- **`routes()` / `timesRequested(route)`** — inspect the ordered `requestLog` to assert how many times each endpoint was hit.
- **`describe` "REAUTH_REQUIRED step-up flow"** — 7 tests: park→prompt→replay, blob-mode replay, `details.methods` propagation, empty-methods case, shared prompt for concurrent 401s, cancel → rejection with no replay, and no second retry when the replay also 401s.
- **`describe` "the step-up flow in cookie mode"** — 1 test verifying the prompt/replay path is taken instead of ending the cookie session; asserts no `authorization` header on either attempt and `expiredSignal` stays 0.

## Relationships

- **`tests/support/unit/msw-server.ts`** — provides the shared MSW `server` instance; this file registers its two route handlers (`/checkout`, `/export`) on it in `beforeEach`.
- **`tests/support/unit/fixtures.ts`** — provides `aProblem()` which `reauthProblem()` uses to construct well-formed problem+json 401 bodies.

## Notes

- The dialog component is **not** mounted; the test treats `useReauthPromptStore()` (imported from `@/infrastructure/http/reauth-prompt.ts`) as the seam, exactly as the real component would call it.
- `waitForPrompt` is necessary because a bare microtask (`Promise.resolve().then`) is not reliably late enough for the interceptor's async prompt-open path.
- The `/export` 401 is sent with `content-type: application/problem+json` (not the default JSON) to exercise the blob-response code path where axios hands the body to the interceptor as a `Blob`.
- The "no double retry" test relies on an internal `_steppedUp` flag on the replayed config; if that flag is missing the test would see a third `/checkout` call.
