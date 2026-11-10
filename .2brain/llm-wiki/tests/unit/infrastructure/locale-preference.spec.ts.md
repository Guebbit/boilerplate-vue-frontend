---
source: tests/unit/infrastructure/locale-preference.spec.ts
sha256: 01ee7c033c00b62caef77c2062e37eee841836a2887763e4302e3fe050702b38
signature: afaad5d66283419cbcb02db3a114fbf314376effa3470c059a7d6f81e2e58a05
generated_at: 2026-11-10T08:01:37.922409+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/locale-preference.spec.ts

## Purpose

Unit tests for `persistLocalePreference` (from `src/infrastructure/locale-preference.ts`). The file validates one invariant from every angle: **choosing a language always resolves successfully, regardless of what the account API does.** It exists to pin that contract so `AppLanguageSwitcher` can fire the call without awaiting or handling rejections.

## Key elements

- **`updateAccountMock`** — a deliberately untyped `vi.fn()` that stands in for the `@api.updateAccount` network call. Untyped because the mock returns per-case fixture shapes the generated types reject.
- **`vi.mock('@api', …)`** — replaces the entire `@api` module so only `updateAccount` is interceptable; everything else in the code path (the real Pinia session store) stays untouched.
- **`signedIn()`** — helper that populates the real session store with both an access token *and* a viewer, because `isAuth` requires both.
- **`beforeEach`** — resets Pinia (`createPinia`) and all mocks, then defaults `updateAccountMock` to a `contractResponse` wrapping `anAccount()`.
- **Test cases** (five `it` blocks):
  - Signed-in → `updateAccount` called with `{ locale }`.
  - Guest (no token, no viewer) → `updateAccount` **not** called.
  - Token present but viewer absent → `updateAccount` **not** called.
  - API rejects → `persistLocalePreference` still **resolves** (does not reject).
  - Happy path → resolves (asserted via `toBeUndefined()`) so callers can safely ignore the return.

## Relationships

- **`tests/support/unit/fixtures.ts`** — provides `anAccount()`, the canonical account object used as the default mock response body.
- **`tests/support/unit/orval-fixture-schema.ts`** — provides `contractResponse()`, which wraps a fixture in the shape the generated Orval client expects (the `{ data, errors }` envelope), keeping the mock realistic without hand-building the envelope.

## Notes

- The session store is **real** (Pinia, not a stub). Stubbing it would test the stub rather than the `isAuth` logic that gates the API call.
- Dynamic `await import(…)` is used for both the SUT and the session store so they load *after* `vi.mock` has replaced `@api`; a static import would bind to the real module.
- The "token but no viewer" case is a distinct scenario: a session restored mid-bootstrap where the viewer fetch hasn't landed yet. It is *not* the same as the guest case.
- The eslint-disable on `no-unsafe-return` is intentional and documented in the comment above the mock factory.
