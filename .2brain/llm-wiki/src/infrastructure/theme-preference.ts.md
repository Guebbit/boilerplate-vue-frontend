---
source: src/infrastructure/theme-preference.ts
sha256: a8ea7ad30996db569db8bb2da5069b85dcbf47d59e8b484848d10025a8be4296
signature: 1f4bf9dc9ed8148c9dd1851f70978173121ddd9b47d3028d7cdbbc2d8f2b91d8
generated_at: 2026-11-10T03:10:20.598489+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/theme-preference.ts

## Purpose

Persists the visitor's explicit light/dark theme choice as a first-party cookie (via `@guebbit/js-toolkit`), so the app can restore the correct theme on the next visit without re-defaulting to the OS preference.

## Key elements

- **`ThemePreference`** — exported type; the union `'light' | 'dark'`. The third Vuetify state (`'system'`) is deliberately *not* a member of this union; it is represented by the cookie being absent.
- **`readThemePreference()`** — reads the cookie and returns the value only if it is exactly `'light'` or `'dark'`; otherwise returns `undefined` (covers first visit, cleared cookie, or a value written by a different build).
- **`writeThemePreference(theme)`** — sets the cookie with a 365-day lifetime, `path: '/'`, `sameSite: 'Lax'`, and `secure` enabled only when the page is served over HTTPS.
- **`COOKIE_NAME`** — constant derived from `BROWSER_STORAGE_NAME.themePreference` (imported from `@/infrastructure/browser-storage.ts`).
- **`COOKIE_DAYS`** — constant `365`; the choice is long-lived because there is no "stale" theme to expire.

## Notes

- `'system'` is **not** a stored value; the absence of the cookie *is* the system-following state. Any code treating `readThemePreference()`'s return as a three-way union will be wrong.
- The `secure` attribute is conditional (`location.protocol === 'https:'`) so the cookie is still set on local/dev HTTP pages, but will not be sent over plain HTTP in production.
- `sameSite: 'Lax'` means the cookie is not sent on cross-site sub-resource requests; it is only relevant for top-level navigation and form posts.
