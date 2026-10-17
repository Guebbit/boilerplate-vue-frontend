---
source: src/infrastructure/theme-preference.ts
sha256: 4b553e4269ef4b3779059f0f45cb3050246481e803ac30e77c163285800cc008
generated_at: 2026-10-17T00:12:26.026987+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/theme-preference.ts

## Purpose

Persists the visitor's explicit light/dark theme override as a first-party cookie, following the same pattern as `analytics-consent.ts` (cookie-backed, `@guebbit/js-toolkit`-mediated, no `localStorage`). Read once at boot to set the initial Vuetify theme before first paint; written back when the user toggles the theme.

## Key elements

- **`ThemePreference`** (type) — `'light' | 'dark'`. The `'system'` state is deliberately *not* a member; it is represented by the absence of the cookie.
- **`readThemePreference()`** — Reads the `themePreference` cookie via `getCookie`. Returns the pinned value or `undefined` if absent/invalid.
- **`writeThemePreference(theme)`** — Writes the value via `setCookie` with 365-day expiry, `path: '/'`, `sameSite: 'Lax'`, and `secure` set only when the page is HTTPS.
- **`COOKIE_NAME` / `COOKIE_DAYS`** — Internal constants (`'themePreference'`, `365`).

## Relationships

No graph neighbors are recorded. Per the module doc, the consumers are `ui/vuetify/index.ts` (reads at boot) and `AppNavigation.vue` (writes on toggle).

## Notes

- `'system'` is the *absence* of the cookie, not a stored sentinel. Any value other than exactly `'light'` or `'dark'` is treated as `undefined` by `readThemePreference`, so a legacy or external cookie won't corrupt the state.
- `secure` is derived from `location.protocol` at call time rather than hard-coded, matching the convention in `session.ts`.
- The 365-day TTL is intentional: there is no "stale" value to expire, unlike a consent flag.
- This file introduces no new dependencies; `@guebbit/js-toolkit` is already in the project.
