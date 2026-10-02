---
source: src/infrastructure/analytics-consent.ts
sha256: 6d1842ba2d5394f1048581857c3bf6cf8cf22283b574f169421464eab20c8820
generated_at: 2026-10-02T14:39:00.794734+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/analytics-consent.ts

## Purpose

Manages the guest-facing analytics consent choice (unknown / granted / denied) for FA-D5. Persists the answer in a first-party cookie (same mechanism as `session.ts`), exposes a Pinia store the consent banner reads and writes, and gates the Umami tracker so it only loads after an explicit grant.

## Key elements

- **`AnalyticsConsentChoice`** — union type `'unknown' | 'granted' | 'denied'`; the only valid values stored in the cookie.
- **`isAnalyticsConsentEnabled()`** — returns `true` iff `readUmamiConfig()` yields a value; when `false` the banner, footer link, and `X-Analytics-Consent` header are all suppressed.
- **`readStoredChoice()` / `writeStoredChoice()`** (private) — cookie I/O helpers; reads default to `'unknown'` for any unrecognized value; writes set `Secure` (HTTPS only), `SameSite=Lax`, `path=/`, 365-day expiry.
- **`useAnalyticsConsentStore`** — Pinia store exposing:
  - `choice` — reactive current value, seeded from the cookie on creation.
  - `promptOpen` (computed) — `true` while `choice` is `'unknown'` or the banner was reopened.
  - `grant()` / `deny()` — set the choice, close the banner, persist, and call `syncTracker()`.
  - `reopen()` — flips `reopened` so an already-answered visitor can change their mind (GDPR Art. 7(3)).
  - `syncTracker()` — delegates to `useObservabilityStore().setUmamiConsent(granted?)` to load or silence Umami.

## Relationships

- Imports `getCookie` / `setCookie` from `@guebbit/js-toolkit` (already a project dependency; no new package added).
- Reads Umami configuration via `readUmamiConfig()` from `@/infrastructure/observability/config.ts`.
- Pushes the consent decision to `useObservabilityStore` (`@/infrastructure/observability/store.ts`) through `setUmamiConsent()`.
- Downstream consumers (not imported here): the consent banner component, the footer "privacy choices" link, and `http/interceptors.ts` (reads `isAnalyticsConsentEnabled` and the stored choice for the `X-Analytics-Consent` header).

## Notes

- The cookie is deliberately *not* in `localStorage`; it follows the same first-party-cookie convention as `session.ts` so both are subject to the same browser cookie policies and the `Secure` flag.
- `writeStoredChoice` only accepts `'granted'` or `'denied'` (`Exclude<…, 'unknown'>`); `unknown` is a read-only default and is never written.
- `syncTracker` must be called at boot, after every answer, and after logout (the account's own choice no longer applies to the guest). The file does not call it at boot itself — the caller (app bootstrap / a composable) is responsible.
- Cookie name is the hardcoded string `'analyticsConsent'`; there is no environment override.
