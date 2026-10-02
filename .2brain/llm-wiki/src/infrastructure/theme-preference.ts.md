---
source: src/infrastructure/theme-preference.ts
sha256: 12639c83a81595e1030fb68324b9c8f3749cf8424033f8c1a11753b8282e00b8
generated_at: 2026-10-02T12:03:04.746274+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/theme-preference.ts

## Purpose

Persists the visitor's explicit light/dark theme pin as a first-party cookie (`themePreference`). It exists so the boot theme can be resolved before first paint (read once by `ui/vuetify/index.ts`) and so the user's toggle in `AppNavigation.vue` survives browser restarts without a separate storage mechanism.

## Key elements

- **`ThemePreference`** (type) — union `'light' | 'dark'`. The third visual state ("system") is represented by the *absence* of a cookie, not a stored value.
- **`readThemePreference()`** — calls `getCookie('themePreference')`; returns the pinned theme or `undefined` if the cookie is missing or holds an unexpected value.
- **`writeThemePreference(theme)`** — calls `setCookie('themePreference', …)` with 365-day expiry, `path: '/'`, `SameSite: Lax`, and `Secure` set only when the page is served over HTTPS.
- **`COOKIE_NAME` / `COOKIE_DAYS`** — internal constants (`'themePreference'`, `365`) shared by both functions.

## Relationships

No files are recorded as graph neighbors. The module doc-block notes two consumers that are *not* imported here but call into it:

- `ui/vuetify/index.ts` — calls `readThemePreference()` at boot to pick the initial Vuetify theme.
- `AppNavigation.vue` — calls `writeThemePreference()` when the user toggles the theme switch.

The only runtime dependency is `@guebbit/js-toolkit` (for `getCookie` / `setCookie`), which is shared with `analytics-consent.ts` and `session.ts`.

## Notes

- "System" mode is the *lack* of a cookie, not a `'system'` value. Any code checking for a stored value must treat `undefined` as "follow OS," not as an error.
- `readThemePreference` silently coerces any unrecognized cookie value (e.g. leftover from a different build) to `undefined` — it does not throw or log.
- The `Secure` flag is conditional on `location.protocol`; over plain HTTP the cookie is still set, just without `Secure`. This mirrors the pattern in `session.ts`.
- The 365-day expiry is intentional: there is no "stale" state that needs to fall back, so a long TTL avoids surprise resets.
