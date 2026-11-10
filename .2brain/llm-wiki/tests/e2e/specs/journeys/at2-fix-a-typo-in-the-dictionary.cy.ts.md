---
source: tests/e2e/specs/journeys/at2-fix-a-typo-in-the-dictionary.cy.ts
sha256: 93ffe2e6a977410f7dc1f1bc64d3cbc4e5095ed83b59d66f84588f4c180a01af
signature: 1686457b161ed86c768066c0069993c29a29708a40851340cbe20418ff5d4fe4
generated_at: 2026-11-10T06:50:20.332655+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/at2-fix-a-typo-in-the-dictionary.cy.ts

## Purpose

Cypress E2E journey test for the **AT2** acceptance criterion: an editor fixes a typo in the dictionary board (a multi-language column view), verifies the storefront reflects the correction, clears the entry to confirm English fallback (Spanish ships no locale file), completes a brand-new key in all five languages so it drops out of the "incomplete only" filter, and replaces Spanish's Frontend dictionary from a file import while confirming the API app of the same language is untouched. It also exercises import validation (invalid JSON) and duplicate-key rejection.

## Key elements

- **`HERO_KEY`** – `'home-page.hero-title'`, the dictionary key used for the typo-fix and clear scenarios.
- **`HERO_ENGLISH` / `HERO_SPANISH`** – Expected storefront hero strings (fallback vs. corrected).
- **`NEW_KEY`** – `'e2e.at2.typo'`, a key created in all five columns to test the "incomplete only" filter.
- **`COLUMNS`** – The five language native names in board order: English, Español, Français, Italiano, 日本語.
- **`cellOf(key, nativeName)`** – Returns a Cypress chain to the input cell for a given key in a given language column, located via `data-test=dictionary-cell` + `data-key` and `aria-label`.
- **`filterBoardTo(key)`** – Types a key into the dictionary filter text input to narrow the board to a single row.
- **`describe('AT2 · Fix a typo in the dictionary')`** – Single `it` block with sequential `cy.step` calls covering: board open state, type-and-save, storefront verification, clear-with-confirm dialog, new-key completion, file import (replace mode), cross-app isolation, invalid-JSON rejection, duplicate-key guard, API-app baseline, and empty-filter message.

## Relationships

No graph neighbors are recorded for this file. It is a leaf E2E spec with no imports from other project modules beyond the implicit Cypress global and the `locales` feature flag (see Notes).

## Notes

- The leading `// requires-module: locales` comment gates this test behind the `locales` feature flag; it will be skipped or fail if that module is absent.
- The test is intentionally **one long `it`** with many `cy.step` calls rather than separate specs, because later steps depend on state left by earlier ones (e.g., the cleared cell, the new key, the replaced dictionary).
- `force: true` is used on the clear-icon click because the icon is only visible on hover; the test author notes that the press itself is the behavior under test.
- Spanish is deliberately the language with **no shipped locale file**, so clearing its cell falls back to English. Other languages (e.g., Italian) would fall back to their own file.
- `beforeEach` calls `cy.visit('/en')` → `cy.restore()` → `cy.visit('/en')` to reset application state between (the single) test run.
- File import uses `Cypress.Buffer.from` to construct an in-memory `es.json` rather than relying on a fixture on disk.
