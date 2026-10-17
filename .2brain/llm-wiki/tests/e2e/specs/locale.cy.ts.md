---
source: tests/e2e/specs/locale.cy.ts
sha256: cd46d9e997aefe3d6624e7c9470df4e750f8793569c7fd8b50269d90f00ee7e8
generated_at: 2026-10-17T02:23:23.345072+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/locale.cy.ts

## Purpose

End-to-end Cypress spec for the application's internationalisation layer. Every other spec in the suite runs under `/en`, so the `:locale` router segment, the `localeChoice` guard, the dynamic dictionary import, and the `<html lang>` attribute are only exercised here. It also covers the in-app language switcher, the persistence of a registered visitor's choice, and the presence of API-offered locales that have no client-side dictionary.

## Key elements

- **`describe('Italian locale')`** — Four tests: home page renders with `lang="it"`, page copy and form labels are Italian (not the English fallback), validation messages come from the Italian dictionary, and a *displayed* validation error re-translates when the language changes in place (via the switcher, not a page reload).
- **`describe('switching the language in place')`** — Asserts that clicking the switcher re-renders the current page in Italian, updates `<html lang>`, rewrites the URL to `/it/…`, and removes the old English copy — all without a full page load.
- **`describe('the saved preference')`** — Two tests: a guest's switch does **not** write to any account (proven by the seed user still logging in as `en`); a registered visitor's switch is persisted via `PATCH /account` and re-applied at the next login.
- **`describe('a locale only the API has')`** — Confirms `es` appears in the switcher (announced by the boot manifest) even though no `src/locales/es.json` exists. Product-specific fallback rendering for `es` lives in `src/modules/products/tests/e2e/locale.cy.ts`.
- **`seedAccount` (imported)** — Supplies the canonical email of a seeded user, used to confirm the viewer chip has disappeared after `cy.logout()`.

## Relationships

- **`tests/support/e2e/scenario.ts`** — Imports `seedAccount` to obtain the known email address of the seeded `'user'` account. This is the sole cross-file dependency in the spec; all other fixtures (accounts, server state) are managed by the custom Cypress commands `cy.restore()`, `cy.loginAs()`, and `cy.logout()` defined in the project's `cypress/support` layer.

## Notes

- **Staleness test requires the in-app switcher.** The "re-translates a displayed validation error" test deliberately clicks the switcher instead of calling `cy.visit('/it/login')` because a visit reloads the page and discards the form state — the very condition under test (`revalidateOn` re-running validation on a *surviving* component instance) would not be exercised.
- **Guest vs. registered persistence is asymmetric.** A guest's choice lives only in the tab (URL + `lang` attr); it is never written to the API. A registered visitor's choice is written on the switch and read back from `whoami` at the next login.
- **`es` is intentionally *not* activated here.** The spec only asserts the option is present in the switcher. The per-key fallback behaviour for a locale with no client dictionary is a product-module concern tested elsewhere.
- **Custom commands assumed available:** `cy.restore()`, `cy.loginAs(alias)`, `cy.logout()` — these are not standard Cypress and are defined in the project's support files.
