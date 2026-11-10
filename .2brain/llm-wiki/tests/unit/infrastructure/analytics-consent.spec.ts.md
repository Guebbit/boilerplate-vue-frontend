---
source: tests/unit/infrastructure/analytics-consent.spec.ts
sha256: d85fab5e4e6c2ab2d30b02a2daed644dbc46274b29a1da06456578aa335e383e
signature: d8e107cbe646687b3b732796abfa3f748db939804c8f94d77937ab953679d506
generated_at: 2026-11-10T07:53:59.854841+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/analytics-consent.spec.ts

## Purpose

Unit tests for the guest analytics consent store (`@/infrastructure/analytics-consent.ts`). Covers the three-state cookie round-trip, the consent-prompt lifecycle (`promptOpen` / `reopen`), Umami tracker gating, account-answer priority over the cookie, the `trackBrowsing` relay call, and the `isAnalyticsConsentEnabled` build flag.

## Key elements

- **`cookieJar()`** — local helper that parses `document.cookie` into a plain `{name: value}` map for assertions.
- **`createAnalyticsEvent` (mocked via `vi.hoisted` + `vi.mock('@api')`)** — stand-in for the relay call so tests can assert what *would* have been sent.
- **`spiedObservability()`** — dynamically imports the observability store and returns a spy on its `setFaroConsent` method, isolating the Faro interaction.
- **`describe('useAnalyticsConsentStore')`** — initial state, `grant()`/`deny()` persistence to cookie, fresh-instance restore, and unrecognised cookie value → `'unknown'`.
- **`describe('promptOpen, reopen and the Umami tracker')`** — prompt visibility rules, account-vs-cookie priority for `effective`, and `syncTracker()` loading/silencing the Umami `<script>` based on consent state and `VITE_UMAMI_REQUIRE_CONSENT`.
- **`describe('syncTracker while a signed-in account answer is still on its way')`** — the `isAuth` hint cookie path: a stale guest grant is overridden until the profile pushes its answer.
- **`describe('trackBrowsing')`** — relay is called only after grant, never before, never replayed, stops after withdrawal, and rejections are swallowed.
- **`describe('isAnalyticsConsentEnabled')`** — flag is `true` if *either* Umami or Faro is configured; `false` only when both are absent.

## Relationships

No graph neighbors are registered for this file.

## Notes

- The module under test is imported with **top-level `await import(...)`** so that the `vi.mock`/`vi.hoisted` registrations are in place before the store factory runs.
- `document.cookie` persists for the whole file in jsdom; cleanup uses the same `deleteCookie` from the toolkit (not a raw assignment) to mirror production code paths.
- `vi.stubEnv` is used for every build-time flag (`VITE_UMAMI_WEBSITE_ID`, `VITE_UMAMI_SRC`, `VITE_UMAMI_REQUIRE_CONSENT`, `VITE_FARO_URL`); each `beforeEach` block re-stubs the values it needs.
- The `isAuth` cookie (set via `setCookie('isAuth', …)`) is the trigger for the "signed-in account answer pending" branch; it must be deleted in `afterEach` to avoid leaking into guest-path tests.
