# tests/e2e/specs/locale.cy.ts

## Purpose

Cypress e2e spec that exercises the entire locale layer end-to-end: the `:locale` URL segment, the `localeChoice` guard, dynamic dictionary loading, `<html lang>`, per-key fallback, and the persisted language preference. It exists because every other spec only visits `/en/…`, meaning the locale machinery was untested in any non-English language.

## Key elements

- **`describe('Italian locale')`** — Visits `/it` routes and asserts: home page renders with `<html lang="it">`; product page copy is Italian (`Lista prodotti`); login form labels are Italian; validation messages come from the Italian schema; a validation error already on screen re-translates when the in-app switcher is used (via `router.replace`, not a page reload).
- **`describe('switching the language in place')`** — Clicks the `[data-test=language-switcher]` UI on `/en`, verifies the page copy swaps, the URL moves to `/it`, and the old English copy is gone.
- **`describe('the saved preference')`** — Confirms a guest's switch writes nothing to any account (seed user stays `en` at next login); confirms a registered user's choice persists across logout/login (`PUT /account` → `whoami` → re-applied). Uses `cy.loginAs`, `cy.logout`, `cy.skipUnlessDemo`.
- **`describe('a locale only the API has')`** — Exercises Spanish (`/es`), which has **no** bundled `src/locales/es.json`. Asserts: Spanish appears in the switcher (announced by the API manifest); `/es/products` renders with per-key fallback to English for missing keys; switching to Spanish triggers a runtime `GET /locales/es/messages` fetch, verified via `performance.getEntriesByType('resource')` rather than `cy.intercept`.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- **Custom commands relied on:** `cy.resetState()`, `cy.skipUnlessDemo()`, `cy.loginAs(username)`, `cy.logout()` — defined elsewhere in the Cypress support layer.
- **Resource-timing buffer:** The "locale only the API has" download test explicitly raises `performance.setResourceTimingBufferSize(10_000)` because the dev server's module-load traffic would otherwise evict the entry from the default 250-slot ring buffer.
- **Staleness test design:** The "re-translates a displayed validation error" test deliberately uses the in-app switcher instead of `cy.visit('/it/login')`. A visit would destroy the component instance and the on-screen error, defeating the assertion. The switcher performs a `router.replace` on the same route record, preserving the component state.
- **Per-key fallback semantics:** A missing key in a runtime-downloaded locale falls back to `fallbackLocale` (English) key-by-key — it does **not** fall back wholesale to a bundled language or show raw keys.
- **Guest vs. registered persistence:** A guest's locale choice lives only in the tab (URL); a registered user's choice is written to their account and read back at login. The spec asserts both paths explicitly.
