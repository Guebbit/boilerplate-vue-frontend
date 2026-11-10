---
source: src/modules/locales/tests/translation-drafts.spec.ts
sha256: 5aa9a3eef7ae1a32d8e8a649ead0eac9b25216e78f58bfbee4aa60d5ec7cebfd
signature: 5aa9a3eef7ae1a32d8e8a649ead0eac9b25216e78f58bfbee4aa60d5ec7cebfd
generated_at: 2026-11-10T04:45:16.291248+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/tests/translation-drafts.spec.ts

## Purpose

Vitest spec for `toUpdateEntityTranslationsBody`, verifying the save-payload contract of the entity-translations editor: blank input fields are serialized as `null` (clearing the stored value) rather than being omitted, and removed locales are represented as `null`.

## Key elements

- **`describe('toUpdateEntityTranslationsBody')`** – top-level suite covering the function's three output shapes.
- **Test: "sends null for a blank field so the stored value is cleared"** – asserts that a locale with one populated and one blank field produces `{ fields: { title, description: null }, origin: 'human' }`.
- **Test: "keeps a locale whose every field is blank, as all-null fields"** – asserts that a fully blank locale is *retained* in the output as `{ fields: { title: null, description: null }, origin: 'human' }` rather than being dropped.
- **Test: "sends null for a removed locale"** – asserts that passing `null` as a locale value (locale removed by the user) yields `{ it: null }` in the body.

## Relationships

- **`src/modules/locales/domain/index.ts`** – barrel re-export; the test imports `toUpdateEntityTranslationsBody` from `../domain`, which resolves through this index.
- **`src/modules/locales/domain/translation-drafts.ts`** – the module that defines `toUpdateEntityTranslationsBody`; the test exercises its public behavior directly.

## Notes

- The function under test is imported from the domain barrel (`../domain`), not from the implementation file directly. If you move or rename the function, both the barrel and this import must stay in sync.
- The three tests encode a deliberate distinction: blank *fields* → `null` value, blank *locale* (all fields) → `null`-field object (locale preserved), removed *locale* → `null` key value. Do not collapse these cases when refactoring.
