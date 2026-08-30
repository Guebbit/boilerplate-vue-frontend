# tests/unit/infrastructure/http/http-request.spec.ts

## Purpose

Unit tests for the `onRequest` and `onRequestReject` interceptors exported by `src/infrastructure/http/index.ts`. They verify that the bearer token and active-language header are attached correctly (or omitted cleanly) on every outgoing request, and that setup failures in the reject path are forwarded untouched. The refresh-exclusion branch is intentionally excluded and covered separately in `http-refresh.spec.ts`.

## Key elements

- **`onRequest` describe block** — six cases: token present → `Authorization: "Bearer …"`; token absent/empty → header omitted (not `"Bearer undefined"`); `Accept-Language` always set to the active locale (`'it'` via mock); sent even when anonymous; returns the *same* config object (identity check).
- **`onRequestReject` describe block** — one case: a non-HTTP error (e.g. network failure) is re-thrown unchanged.
- **`makeConfig()`** — helper that returns a minimal `InternalAxiosRequestConfig` stub with an empty `headers` object, built via `asStub`.
- **`accessToken` ref** — a Vue `ref` standing in for the session store's token; toggled per test to simulate authenticated / anonymous / empty-string states.
- **Mocks** — `useSessionStore`, `pinia.storeToRefs` (returns the `accessToken` ref), and the full i18n module (`getCurrentLocale`, `translate`, `i18n.global.t`) are all stubbed so the interceptor runs without a live Pinia instance or i18n runtime.
- **Top-level `await import('@/infrastructure/http')`** — defers the SUT import until after all `vi.mock` calls are registered.

## Relationships

- **`tests/support/stub.ts`** — provides the `asStub` utility used to type-cast a plain object into an `InternalAxiosRequestConfig` without populating every field.
- **`src/infrastructure/http/index.ts`** — the module under test; exports `onRequest` and `onRequestReject`.
- **`src/infrastructure/stores/session`** — mocked to return an empty store object.
- **`pinia`** — partially mocked: real exports preserved, `storeToRefs` replaced to hand back the `accessToken` ref.
- **`src/infrastructure/i18n`** — mocked to return a fixed locale (`'it'`) and identity `translate`/`t` functions.
- **`http-refresh.spec.ts`** (sibling) — owns the refresh-exclusion integration tests; this file's docblock explicitly defers to it.

## Notes

- The `translate` mock is **load-bearing**, not cosmetic: `onRequestReject` (and the wider interceptor chain it imports) calls `translate` to build a 401 message, so omitting it would throw before the logic under test executes.
- The `Bearer ` prefix assertion is intentional — the backend's `getTokenBearer` splits on a space and reads index 1; a bare token would resolve to `undefined` and be treated as anonymous.
- An *absent* `Authorization` header is asserted, not a `Bearer undefined` value, because some servers return 400 for the latter instead of treating the request as unauthenticated.
- `vi.clearAllMocks()` runs in `beforeEach`; `accessToken.value` is reset to `undefined` there as well.
