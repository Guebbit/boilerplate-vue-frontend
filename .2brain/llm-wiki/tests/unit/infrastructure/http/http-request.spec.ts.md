---
source: tests/unit/infrastructure/http/http-request.spec.ts
sha256: 6443578761a61bee9c65b776c33ca65f5d5a5a3cebcf2954f51e87a8bcb108a2
signature: 30c0ed30cfd9cc81b705bded40841d80021ec95eb84d44354a21281ac9610ffd
generated_at: 2026-11-10T07:57:35.810352+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/http/http-request.spec.ts

## Purpose

Unit tests for the `onRequest` and `onRequestReject` axios interceptors exported by `src/infrastructure/http/index.ts`. They verify header-attachment logic (Authorization, Accept-Language, Analytics-Consent) and the `noteActivity` signal under various session states (token, cookie, anonymous) and consent states, ensuring the interceptor neither mis-authenticates nor mis-localizes requests.

## Key elements

- **`accessToken`, `cookieSession`, `hasSession`** — reactive refs/computed that mimic the session store, injected via a `pinia` `storeToRefs` mock.
- **`noteActivity`** (`vi.fn`) — spy on the session store method; asserted to fire exactly once per *active* (non-passive) signed-in request.
- **`analyticsConsentChoice` / `analyticsGuestConsentEnabled`** — mutable per-test values backing the mocked analytics-consent store, driving the `Analytics-Consent` header tests.
- **`makeConfig(headers?)`** — factory that returns a minimal `InternalAxiosRequestConfig` stub via `asStub`, the only shape `onRequest` mutates.
- **`describe('onRequest')`** — main suite: bearer-token presence/absence, empty-string token, Accept-Language always set, same-object return, Analytics-Consent gating (flag, consent state, signed-in exclusion).
- **`describe('onRequest in cookie mode')`** — confirms no Authorization header and no Analytics-Consent when the session is cookie-only.
- **`describe('onRequestReject')`** — single test asserting a setup-phase `AxiosError` is re-rejected unchanged.
- **`vi.mock('@/i18n')`** — provides `getCurrentLocale` (returns `'it'`), `translate`, and `i18n.global.t`; required because `onRequestReject` calls `translate` before reaching refresh logic.

## Relationships

- **`tests/support/stub.ts`** — imports `asStub`, a typed assertion helper used to cast a plain object to `InternalAxiosRequestConfig<unknown>` without weakening the type at the call site.

## Notes

- The refresh-exclusion list (which endpoints skip the token) is intentionally **not** tested here; it lives in `http-refresh.spec.ts` and exercises the real interceptor chain against MSW.
- `onRequest` is imported via a top-level `await import(...)` *after* all `vi.mock` calls, so the mocks are guaranteed to be active before the module evaluates its interceptors.
- The `pinia` mock spreads the real module (`importOriginal`) and overrides only `storeToRefs`, keeping the rest of Pinia's API intact for any transitive imports.
- Test expectations encode backend contract details (e.g. the `Bearer ` space-prefix is parsed positionally by the API; a missing header is preferred over `Bearer undefined`).
