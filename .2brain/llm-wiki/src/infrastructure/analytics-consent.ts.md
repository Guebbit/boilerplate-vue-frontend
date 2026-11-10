---
source: src/infrastructure/analytics-consent.ts
sha256: b6294bdc078ce8b2249471a7a994ce8044f5ddcba54f3d5ac45735a63f7f6be0
signature: d47b5755c4254e9c6639d5fce2c64036cc9bf342c4ad8e70bea699fce8475b15
generated_at: 2026-11-10T03:01:08.506145+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/analytics-consent.ts

## Purpose

Pinia store that manages the visitor's analytics consent (unknown / granted / denied) for both guest and signed-in users. It persists the guest choice in a first-party cookie, gates Umami and Faro loading, exposes a `trackBrowsing` relay for server-side event reporting, and coordinates with the profile store when a signed-in account's own answer applies.

## Key elements

- **`AnalyticsConsentChoice`** — Union type: `'unknown' | 'granted' | 'denied'`.
- **`isAnalyticsConsentEnabled()`** — Returns `true` when a Umami website-id or Faro receiver URL is configured (via `readUmamiConfig`/`readFaroConfig`); `false` means no banner, no footer link, no `Analytics-Consent` header.
- **`useAnalyticsConsentStore`** — The Pinia store (`'analytics-consent'`) exposing:
  - `choice` / `effective` — Guest cookie value vs. the answer that applies (account overrides cookie when set).
  - `promptOpen` — Whether the banner should be visible (unanswered, or explicitly reopened).
  - `grant()` / `deny()` — Record the choice, write the cookie (guest only), and call `syncTracker()`.
  - `reopen()` — Flag the banner for re-display (privacy-choices link / GDPR withdrawal path).
  - `syncTracker()` — Pushes the effective answer into the observability store (`setUmamiConsent`, `setFaroConsent`); suppresses trackers while `awaitingAccountAnswer()`.
  - `trackBrowsing(event)` — Sends one `AnalyticsEventRequest` to the backend relay; no-op unless consent is granted and analytics is enabled; failures are logged and dropped.
  - `setAccountChoice(value)` — Accepts the profile store's boolean answer (or `undefined` on sign-out) which overrides the guest cookie.
  - `recordGuestChoice(value)` — Internal: writes the cookie only when no session/account answer is active.
- **`COOKIE_NAME`** / **`COOKIE_DAYS`** — Sourced from `BROWSER_STORAGE_NAME.analyticsConsent` and `SIX_MONTHS_DAYS`; the cookie uses `path: '/'`, `sameSite: 'Lax'`, and `secure` on HTTPS.

## Notes

- The store is the single source of truth for consent; the UI banner, the footer "privacy choices" link, the `Analytics-Consent` HTTP header (set in `http/interceptors.ts`), and the two trackers all derive from `effective`.
- `awaitingAccountAnswer()` is a deliberate guard: if a session exists (or its hint cookie is present) but the profile store hasn't pushed `accountChoice` yet, `syncTracker` forces `granted = false` so a stale guest "granted" cookie cannot boot a tracker for an account that may have declined.
- `recordGuestChoice` is a no-op when `accountChoice` is defined **or** `useSessionStore().isAuth` is true — in those cases the profile store is expected to persist the answer server-side.
- The cookie is intentionally *not* a credential: `Secure` is applied only over HTTPS, and `SameSite: Lax` limits it to top-level navigations.
- `trackBrowsing` fires-and-forgets: a failed HTTP call is logged at `debug` level and the event is silently dropped. There is no retry or queue.
- The six-month expiry follows CNIL / Garante guidance; after expiry the visitor is re-prompted as if `unknown`.
