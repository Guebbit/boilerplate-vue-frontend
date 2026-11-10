---
source: tests/unit/infrastructure/theme-preference.spec.ts
sha256: 9682d88b6bd79d2e1e406f8686942ee4004137e4aa0c3af377e7bd1312d612fa
signature: 3939bc2cac4a0e5f54bf1da380ebb2f625353de9a9396a0b63bafc467e66c0e2
generated_at: 2026-11-10T08:04:03.920452+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/theme-preference.spec.ts

## Purpose

Unit tests for the cookie round-trip of `readThemePreference` / `writeThemePreference` in `@/infrastructure/theme-preference.ts`. Verifies that a theme preference written to a `themePreference` cookie is read back correctly, that unrecognised values are treated as "no preference", and that writes overwrite prior values.

## Key elements

- **`cookieJar()`** – local helper that parses `document.cookie` into a plain `{ name: value }` object for assertions.
- **`beforeEach`** – calls `deleteCookie('themePreference')` (from `@guebbit/js-toolkit`) to clear state between tests, because jsdom persists cookies for the entire file.
- **`describe('readThemePreference')`** – three cases: no cookie → `undefined`; round-trip of a written value; unrecognised value (`'system'`) → `undefined`.
- **`describe('writeThemePreference')`** – two cases: persists `'light'`; overwrites a prior `'light'` with `'dark'`.

## Relationships

No graph neighbors are tracked for this file. It imports `readThemePreference` / `writeThemePreference` from `@/infrastructure/theme-preference.ts` and `setCookie` / `deleteCookie` from `@guebbit/js-toolkit` (the same toolkit the module under test uses internally).

## Notes

- jsdom does **not** reset `document.cookie` between tests; the `beforeEach` cleanup is mandatory and intentionally uses the same toolkit `deleteCookie` the module itself calls (not a raw `document.cookie = ''` assignment).
- `'system'` is Vuetify's "no explicit choice" state. It is **not** a value the module ever writes to the cookie; if it appears (stale build, hand-edit) the reader must treat it identically to a missing cookie.
- The cookie mechanism mirrors `analytics-consent.ts` — same toolkit, same rationale (see that module's docs for background).
