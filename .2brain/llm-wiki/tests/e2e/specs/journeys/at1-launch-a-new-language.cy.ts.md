---
source: tests/e2e/specs/journeys/at1-launch-a-new-language.cy.ts
sha256: 8d55a2f89dcdd71f36f0f38c3aaa4703c3206864cdd022f9844e2197c85c1d71
signature: 631443d0f78503cd5e17e3ed544a063af37d1003120cf894eef474a7e9b14f85
generated_at: 2026-11-10T06:49:43.802158+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/at1-launch-a-new-language.cy.ts

## Purpose

End-to-end Cypress journey (AT1) that walks the full lifecycle of launching a new language (`de`): an editor registers it inactive, populates its frontend dictionary three ways (manual key, JSON import with merge, inline edit), trims and exports it, activates it, verifies guest-visible storefront rendering and product-translation behavior in both active and draft (inactive) states, and finally confirms the fallback `en` language is undeletable while the new one deletes cleanly.

## Key elements

- **`TAG`** (`'de'`) — the language tag under test; not present in the seed and has no shipped app file.
- **`IMPORTED`** — the two-key nested dictionary shape used for the JSON-import step.
- **`BY_HAND`** / **`EDITED_RESET`** — the values added manually and then overwritten by an inline edit.
- **`LocaleRow` / `LocalesAnswer`** — narrow interfaces over the `GET /locales` response shape the test reads.
- **`offeredToGuests()`** — hits the public API via `cy.task('guestApi')` and classifies the tag as `'absent'`, `'listed-off'`, or `'offered'`.
- **`openEntriesOfNewLanguage()`** — navigates to the new language's entries page and filters to the Frontend app.
- **`downloadedExport()`** — reads the `${TAG}.json` file from the Cypress downloads folder.
- **`describe` / `it` block** — a single long journey (`it`) with `cy.step` markers; `beforeEach` restores state via `cy.restore()`.

## Relationships

- **`tests/support/e2e/harness.ts`** — the sole import source; provides `loginDevice` and `requestAsDevice`, which are used to perform an authenticated `PATCH /locales/translations/product/:id` call for the draft-translation step.

## Notes

- The "not offered yet" assertion is made **as a guest** (via the API task), not through the editor's own UI, because editors can read inactive languages while guests cannot.
- `force: true` is applied to the import-submit click because a toast from the prior save overlaps the dialog button.
- The test is deliberately a single `it` (journey style); `cy.step` calls provide readable failure context rather than separate test isolation.
- The trailing comment references `shared/rules/authorization-roles.yaml` for the `locales.any.*` permission set, indicating the editor role is the one under exercise (not admin).
- The `requires-module: locales` comment at the top is a build/CI directive, not a JS import.
