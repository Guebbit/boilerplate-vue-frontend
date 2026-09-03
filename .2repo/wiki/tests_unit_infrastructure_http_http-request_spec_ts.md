# tests/unit/infrastructure/http/http-request.spec.ts

## Purpose

Unit tests for the `onRequest` and `onRequestReject` interceptors exported by `@/infrastructure/http`. They verify that every outgoing request carries the correct `Authorization` header (when authenticated) and the `Accept-Language` header (always), and that non-recoverable errors are re-thrown unchanged. The file exists to catch regressions where a missing or malformed token would silently log the user out, or a missing language header would degrade all responses to the fallback locale.

## Key elements

- **`onRequest` tests** — six cases covering: token present → `Bearer <token>` header; token undefined → header absent; token empty string → header absent; `Accept-Language` always set (authenticated and anonymous); return-value identity (same object mutated).
- **`onRequestReject` test** — asserts that a setup-phase `AxiosError` is re-rejected unchanged.
- **`makeConfig`** — helper wrapping `asStub<InternalAxiosRequestConfig>` to produce a minimal config with an empty `headers` object.
- **Module mocks** — `@/infrastructure/session`, `pinia` (only `storeToRefs` → shared `accessToken` ref), and `@/infrastructure/i18n` (`getCurrentLocale`, `translate`, `i18n.global.t`).
- **`accessToken`** — a module-level `ref<string | undefined>` that stands in for the live session token; reset to `undefined` in `beforeEach`.

## Relationships

- **`tests/support/stub.ts`** — provides `asStub<T>`, used by `makeConfig` to create a shallow stub of `InternalAxiosRequestConfig` without pulling in the real Axios config shape.
- **`@/infrastructure/http`** (the module under test) — imported via top-level `await import` *after* all `vi.mock` calls so the mocks are in place before `onRequest`/`onRequestReject` are evaluated.

## Notes

- The `Bearer ` space-separated prefix is load-bearing: the backend's `getTokenBearer` splits on the space and reads index 1; a bare token would resolve to `undefined` (anonymous).
- An absent `Authorization` header (vs. `"Bearer undefined"`) matters because some servers return 400 for the latter instead of treating the request as anonymous.
- The `translate` mock in the i18n stub is not decorative — `onResponseReject` calls it to build the 401 message; omitting it causes a throw before refresh logic runs.
- Refresh-exclusion behavior is deliberately **not** tested here; it lives in `http-refresh.spec.ts`, which drives the real interceptor chain against MSW.
- The file relies on Vitest's `vi.mock` hoisting: mocks are registered before the `await import`, but the test body still references the imported symbols by name.
