---
source: tests/unit/app/browser-storage-table.spec.ts
sha256: 8d676e12aec91aec11e11aedabae458aff6ee889db6796729a4d706b1fdd48df
signature: e75794c7f655e2370489b83ffe8f16f23bcac087361e29362385626b5cc05d06
generated_at: 2026-11-10T07:44:40.701973+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/browser-storage-table.spec.ts

## Purpose

Unit tests for the `BrowserStorageTable` Vue component (the privacy page's "Cookies and storage" section). Verifies that the table renders one row per storage item, displays session lifetimes only after the session config resolves, conditionally shows analytics/Faro consent rows, and names Cloudflare as a third party only when the antibot provider is Turnstile.

## Key elements

- **`mountTable()`** – Helper that spies on `useSessionStore().loadSessionMode` (resolves `undefined`), mounts the component with the Vuetify plugin, and awaits `flushPromises`.
- **`vi.hoisted` mutable values** – `provider`, `analytics`, `faro` are hoisted so each test can flip them to exercise conditional rendering without re-importing mocks.
- **Module mocks** – `vue-i18n` (renders `key` + JSON params as text), `@/infrastructure/http/antibot.ts` (returns `provider`), `@/infrastructure/analytics-consent.ts` (returns `analytics` flag), `@/infrastructure/observability/config.ts` (returns Faro config or `undefined`).
- **Six test cases** covering:
  1. Session tier + staff cap text after config loads.
  2. Placeholder "—" before session config resolves.
  3. `section#cookies` structure and per-row translation keys.
  4. Checkout-draft key naming with suffix.
  5. Consent rows appear only when analytics/Faro are enabled.
  6. Turnstile/Cloudflare element appears only when `provider === 'turnstile'`.

## Relationships

No graph neighbors are registered for this file.

## Notes

- The i18n mock renders translation keys verbatim (appending JSON-ified params), so assertions match raw key strings like `browser-storage.rows.toursSeen.purpose` rather than human-readable text.
- All three hoisted flags are reset to their "off" defaults in `beforeEach`; a test that sets one must do so *after* calling `mountTable` in that test (the helper reads the value at mount time via the promise).
- Selectors rely on `data-test` attributes defined inside the component; renaming those in the component will break every assertion here.
