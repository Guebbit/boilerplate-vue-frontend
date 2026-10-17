---
source: src/infrastructure/analytics-consent.ts
sha256: b08d8c6ec92d827bc2210ca481f14d695c84d1c6c959505a66d50a06eb2ae224
generated_at: 2026-10-17T00:08:41.032165+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/analytics-consent.ts

## Purpose

Manages the visitor's analytics consent (unknown / granted / denied) and gates all analytics side-effects (Umami loading, Faro instrumentation, backend browsing events) on that answer. Persists the guest's choice in a first-party cookie via `@guebbit/js-toolkit`, mirrors the convention used by `session.ts` for `isAuth`/`rememberMe`. When a signed-in account holds its own answer (`accountChoice`), that answer overrides the guest cookie and the profile store (not this module) persists it.

## Key elements

- **`AnalyticsConsentChoice`** (type export) — the three-state vocabulary: `'unknown' | 'granted' | 'denied'`.
- **`isAnalyticsConsentEnabled()`** (export) — returns `true` when either Umami or Faro has a configured URL/ID; when `false` the banner, footer link, and `X-Analytics-Consent` header are all suppressed.
- **`useAnalyticsConsentStore`** (Pinia store, export) — the single source of truth for consent state:
  - `choice` — guest answer restored from the cookie on boot.
  - `accountChoice` — boolean pushed in by the profile store; outranks `choice` when defined.
  - `effective` (computed) — the answer that actually applies right now.
  - `promptOpen` (computed) — whether the banner is visible (unanswered **or** reopened).
  - `grant()` / `deny()` — record the answer (cookie for guests, account for signed-in users) and call `syncTracker`.
  - `reopen()` — re-shows the banner for a consent change (GDPR Art. 7(3) withdrawal path).
  - `syncTracker()` — propagates the effective answer to `useObservabilityStore` (Umami + Faro).
  - `trackBrowsing(event)` — fires a backend `createAnalyticsEvent` call; no-ops unless consent is enabled **and** granted; failures are logged and dropped.
  - `setAccountChoice(value)` — called by the profile store to push/clear the account's answer.
- **`COOKIE_NAME` / `COOKIE_DAYS`** (module-private) — `'analyticsConsent'`, 365-day lifetime.
- **`readStoredChoice` / `writeStoredChoice`** (module-private) — thin wrappers over `getCookie`/`setCookie`; the write sets `path: '/'`, `sameSite: 'Lax'`, and `secure` only over HTTPS.

## Relationships

No graph neighbours are registered. At runtime the store interacts with:

- `useObservabilityStore` (`@/infrastructure/observability/store.ts`) — `syncTracker` pushes Umami/Faro consent flags.
- `useSessionStore` (`@/infrastructure/session.ts`) — `recordGuestChoice` checks `isAuth` to decide whether to skip the cookie write.
- `readUmamiConfig` / `readFaroConfig` (`@/infrastructure/observability/config.ts`) — consulted by `isAnalyticsConsentEnabled`.
- `createAnalyticsEvent` (`@api`) — invoked by `trackBrowsing`.

## Notes

- **Guest vs. account split is asymmetric.** While signed in (or `accountChoice` is defined), `recordGuestChoice` bails out without writing the cookie; the profile store is expected to persist the answer instead. The guest cookie is only ever written for truly anonymous visitors.
- **`syncTracker` is not called automatically.** `grant`/`deny` call it, but a logout must also call it so the account's answer stops applying. Callers outside this store must remember to invoke it after state changes that affect `effective`.
- **`trackBrowsing` is fire-and-forget.** A rejected promise is logged at `debug` level and swallowed — a failed page-view send never surfaces to the visitor.
- **Cookie `secure` is conditional.** It follows `location.protocol`, so on plain-HTTP dev environments the cookie is sent unencrypted. Intentional, matching `session.ts`.
- **`reopened` is the only escape hatch** for a visitor who already answered. The banner re-opens, `promptOpen` stays true, and the next `grant`/`deny` overwrites the previous answer.
