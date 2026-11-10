---
source: tests/e2e/specs/locale.cy.ts
sha256: cd46d9e997aefe3d6624e7c9470df4e750f8793569c7fd8b50269d90f00ee7e8
signature: cd46d9e997aefe3d6624e7c9470df4e750f8793569c7fd8b50269d90f00ee7e8
generated_at: 2026-11-10T07:23:54.929236+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/locale.cy.ts

## Purpose

Cypress e2e spec that exercises the application's locale layer end-to-end using Italian (`/it`) as the non-English target. Every other spec in the suite visits `/en/…`, so this file is the only place the `:locale` router segment, the `localeChoice` guard, dynamic dictionary imports, `<html lang>` attribute, in-place language switching, and persisted language preferences are actually verified against a second language.

## Key elements

- **`seedAccount`** (imported from `scenario.ts`) — used in the "saved preference" block to assert the seed user's email disappears after logout, proving the session was truly ended without relying on locale-dependent UI copy.
- **`describe('Italian locale')`** — four tests covering: home-page rendering + `<html lang>`, Italian page copy vs. English fallback, Italian form labels, Italian validation messages (including the schema-thunk / `revalidateOn` staleness path exercised via the in-app switcher).
- **`describe('switching the language in place')`** — verifies a `router.replace`–driven switch re-translates the current page, updates `<html lang>`, and moves the URL to the new locale prefix without a full reload.
- **`describe('the saved preference')`** — asserts that a guest's switch writes no account data (seed user stays English on next login) and that a registered visitor's choice persists across logout/login via `PATCH /account`.
- **`describe('a locale only the API has')`** — confirms the `es` option appears in the switcher (announced by the API manifest) even though no `src/locales/es.json` exists in this app.

## Relationships

- **`tests/support/e2e/scenario.ts`** — sole imported dependency; provides `seedAccount('user')` whose `.email` property serves as a locale-independent assertion target (checked for absence) to confirm the session ended, independent of any translated nav labels.

## Notes

- The staleness test (Italian validation error re-translation) deliberately navigates through the in-app switcher, **not** `cy.visit('/it/login')`; a visit would reload the page, destroy the component instance, and vacuously pass.
- The "guest writes nothing" test is structured as a negative proof: it logs in as the seed user *after* the guest switch and asserts `lang` is still `en`, relying on the seed user's stored preference.
- The `es`-locale block is intentionally minimal (switcher offer only). Per-key fallback behaviour for Spanish is tested in `src/modules/products/tests/e2e/locale.cy.ts`, where the seeded demo data actually contains a Spanish override.
- All `beforeEach` hooks call `cy.restore()` (a custom command) to reset application state between tests.
