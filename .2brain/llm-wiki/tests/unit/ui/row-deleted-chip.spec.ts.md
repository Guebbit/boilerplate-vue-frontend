---
source: tests/unit/ui/row-deleted-chip.spec.ts
sha256: b18d0e71ed0388339ccfa05c1fb7d8d488740ab893e80008bfcafc894ec657b3
signature: 228858870041af0b41b3e4c14c3dd122ab81b2f95602ede8c718e3c2110d601c
generated_at: 2026-11-10T08:28:32.311350+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/row-deleted-chip.spec.ts

## Purpose

Unit tests for the `RowDeletedChip.vue` component, verifying that the "Deleted" marker renders the correct i18n label, exposes the `data-test="row-deleted"` hook (the contract e2e specs rely on), and applies the expected Vuetify chip styling (small, tonal, warning).

## Key elements

- **`mountChip()`** – Helper that mounts `RowDeletedChip` with the `vuetify` and `i18n` plugins registered globally.
- **`describe('RowDeletedChip')`** – Contains three assertions:
  - Rendered text equals `enMessages.generic.deleted`.
  - A `[data-test="row-deleted"]` attribute is present.
  - The inner `VChip` receives `size: 'small'`, `variant: 'tonal'`, `color: 'warning'`.
- **`beforeAll(() => loadLocale('en'))`** – Loads the English locale before any test runs.

## Notes

- The `data-test="row-deleted"` hook is a **cross-layer contract**: changing or removing it will break e2e specs that locate soft-deleted rows. The component file's doc comment calls this out explicitly.
- The component is intentionally presentational (fixed label, colour, size). The caller is responsible for the `v-if` that gates its visibility, so there is no "not mounted" test here.
