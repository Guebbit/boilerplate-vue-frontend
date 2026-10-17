---
source: tests/unit/infrastructure/http/http-request.spec.ts
sha256: 54bf8dbf59c8abafab84ceb6e647b549d63762611b1e917551460066d3addcaf
generated_at: 2026-10-17T02:35:21.294934+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/http/http-request.spec.ts

## Purpose

Unit tests for the `onRequest` and `onRequestReject` interceptors in `src/infrastructure/http/index.ts`. Verifies that outgoing requests carry the correct `Authorization`, `Accept-Language`, and `X-Analytics-Consent` headers under every authentication and consent state, and that `onRequestReject` passes setup failures through unchanged.

## Key elements

- **`onRequest` tests** — cover bearer-token attachment (present, absent, empty-string), `Accept-Language` always sent, `X-Analytics-Consent` gating (flag on/off, consent granted/denied/unknown, signed-in override), `noteActivity` called only for non-passive requests, and the interceptor returning the same config object it received.
- **`onRequest in cookie mode` tests** — verify that when the session is cookie-based (no token), no `Authorization` header is set and analytics consent is suppressed.
- **`onRequestReject` tests** — assert that a non-axios setup failure (e.g. network error) is re-rejected untouched.
- **`makeConfig`** — factory returning a minimal `InternalAxiosRequestConfig` stub with a headers object, used as the argument to the interceptors.
- **Mock setup** — `vi.mock` for `@/infrastructure/session`, `pinia` (replacing `storeToRefs`), `@/infrastructure/analytics-consent.ts`, and `@/i18n`; the real interceptors are loaded via a top-level `await import('@/infrastructure/http')` after all mocks are registered.

## Relationships

- **`tests/support/stub.ts`** — provides `asStub<T>`, which `makeConfig` uses to satisfy the `InternalAxiosRequestConfig` type without constructing a full Axios config object.

## Notes

- The refresh-token exclusion list is **not** tested here; it lives in `http-refresh.spec.ts`, which exercises the real interceptor chain against MSW.
- The `translate` i18n mock is load-bearing: `onResponseReject` calls it to build the 401 message, so omitting it causes a throw before any refresh logic runs.
- `X-Analytics-Consent` is only attached for **anonymous** callers; a signed-in user's stored preference always takes precedence over a stale guest-cookie choice.
- The `Bearer ` prefix is asserted explicitly because the backend's `getTokenBearer` splits on a space and indexes 1 — a bare token would be read as anonymous.
