---
source: tests/e2e/specs/journeys/at2-fix-a-typo-in-the-dictionary.cy.ts
sha256: 196d7693b388794bf137cbf1194bdb876685092d08ff48e49a938ddd580bf618
generated_at: 2026-10-17T02:07:31.144371+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/at2-fix-a-typo-in-the-dictionary.cy.ts

## Purpose

End-to-end test (journey AT2) that walks an editor through the dictionary board: fixing a Spanish hero string, clearing it to verify English fallback, completing a brand-new key across all five languages so the "incomplete only" filter hides it, and performing a file-based replace import that purges omitted entries from the Frontend app while leaving the API app's entries intact.

## Key elements

- **`HERO_KEY` / `HERO_ENGLISH` / `HERO_SPANISH`** – Fixture strings for the hero-title key used in the edit, save, and fallback steps.
- **`NEW_KEY`** (`e2e.at2.typo`) – A key that does not exist in any seed data; the test creates it in all five languages.
- **`COLUMNS`** – The five language native names in fill order (English, Español, Français, Italiano, 日本語).
- **`cellOf(key, nativeName)`** – Locates a dictionary cell by `data-key` attribute and finds the language-specific `<input>` via its `aria-label`.
- **`filterBoardTo(key)`** – Types a key into the board's text filter and asserts the row is visible.
- **`describe` / `it` block** – A single test with sequential `cy.step` sections covering: edit + save, storefront verification, clear + English fallback, new-key completion + incomplete-filter check, replace-import, and cross-app isolation.

## Relationships

No graph neighbors are recorded for this file. It depends on the `locales` module (declared via the `requires-module` comment) and exercises the `/en/locales/dictionary` and `/en/locales` routes.

## Notes

- The test assumes **Spanish ships no locale file**, so clearing the Spanish cell falls back to English rather than a shipped Spanish file. Italian, by contrast, has a shipped file (referenced in the module docstring but not exercised in this spec).
- The clear icon is hover-only; the click uses `{ force: true }` to bypass visibility. The same pattern applies to the "incomplete only" checkbox and the import-mode radio — all Vuetify widgets that require interaction outside normal pointer flow.
- `beforeEach` calls `cy.visit('/en')` → `cy.restore()` → `cy.visit('/en')` again; the double-visit resets any in-progress UI state after the DB restore.
- The replace-import step uses `Cypress.Buffer.from` to construct an inline JSON file (`es.json`) with a single entry (`e2e.at2.kept`), then asserts exactly one `entry-value-field` remains for Frontend while the API app retains its two entries.
