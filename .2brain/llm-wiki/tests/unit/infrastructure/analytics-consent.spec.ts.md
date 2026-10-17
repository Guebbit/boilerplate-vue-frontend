---
source: tests/unit/infrastructure/analytics-consent.spec.ts
sha256: a1eec63f153d28eb808013473d5775eef2b65f611e220d919b97e59d8343770a
generated_at: 2026-10-17T02:34:11.531618+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/analytics-consent.spec.ts

## Purpose

Vitest spec for the `analytics-consent` infrastructure module. It verifies the Pinia store's three-state consent flow (`unknown` / `granted` / `denied`), the cookie round-trip, the Umami tracker gate (script injection, `umami.disabled` flag), the `trackBrowsing` relay guard, and the `isAnalyticsConsentEnabled` build-time flag.

## Key elements

- **`cookieJar()`** – local helper that parses `document.cookie` into a plain object; mirrors the helper in `session.spec.ts`.
- **`createAnalyticsEvent` (mocked)** – hoisted via `vi.hoisted` and injected through a `vi.mock('@api')` wrapper; used to assert whether/when analytics events are relayed.
- **`useAnalyticsConsentStore` (imported from `@/infrastructure/analytics-consent.ts`)** – the Pinia store under test. Exercised methods/properties:
  - `choice` – current consent state (`unknown` | `granted` | `denied`).
  - `grant()` / `deny()` – set state **and** write the cookie via `@guebbit/js-toolkit`.
  - `promptOpen` (getter) – whether the consent banner should be shown.
  - `reopen()` – re-opens the prompt after a prior answer.
  - `setAccountChoice(bool | undefined)` – stores an account-level override.
  - `effective` (getter) – resolved consent (account answer outranks cookie).
  - `syncTracker()` – injects or suppresses the Umami `<script>` tag and sets/clears `localStorage['umami.disabled']`.
  - `trackBrowsing(event)` – calls `createAnalyticsEvent` only when consent is granted; swallows rejections.
- **`isAnalyticsConsentEnabled`** – pure function returning `true` if either `VITE_UMAMI_WEBSITE_ID` or `VITE_FARO_URL` is non-empty.
- **Describe blocks** – one per concern: store state & cookie, prompt/tracker, `trackBrowsing`, and the enabled-flag.

## Relationships

The dependency graph lists no neighbors, but the file's own imports establish concrete links:

- **`@/infrastructure/analytics-consent.ts`** – the module under test (store + flag).
- **`@api`** – mocked; `createAnalyticsEvent` is the relay the store calls.
- **`@guebbit/js-toolkit`** – `setCookie` / `deleteCookie` used both in the store and in the spec's setup.
- **`pinia`** – `createPinia` / `setActivePinia` for per-test store isolation.

## Notes

- **Top-level `await import`** – the store is imported *after* the `vi.mock('@api')` call so the mock is already in effect; reordering breaks the mock.
- **Cookie persistence across tests** – jsdom retains `document.cookie` for the whole file. `beforeEach` clears it via `deleteCookie` (same toolkit call production uses) rather than a raw `document.cookie = ''`, to avoid path/domain mismatches.
- **`VITE_UMAMI_REQUIRE_CONSENT`** – set to `'false'` in exactly one test to verify the "load unasked" path; every other test assumes the default (consent required).
- **`effective` vs `choice`** – the spec explicitly tests that `setAccountChoice` overrides the cookie value for both `promptOpen` and `syncTracker`; `choice` itself remains cookie-derived.
- **Error-swallowing contract** – `trackBrowsing` must never throw to the caller, even if the relay rejects; the spec asserts this with `not.toThrow()` plus a microtask flush.
