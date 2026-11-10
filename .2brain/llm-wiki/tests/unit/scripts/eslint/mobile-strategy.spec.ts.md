---
source: tests/unit/scripts/eslint/mobile-strategy.spec.ts
sha256: 6b583685ea955bb2f12e19bf3f028de45857787633b365ad6750ebe22655db41
signature: 02acf0d640f68b40ea8cc87abed944803282675bf8c8d3601b9caee7d38ce663
generated_at: 2026-11-10T08:19:47.081611+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/eslint/mobile-strategy.spec.ts

## Purpose

Unit tests for the `mobile-strategy` ESLint rule, which enforces mobile-friendly rendering strategies in Vue templates (fullscreen dialogs, restricted data-table usage, and named scroll directives). Every test case is a `.vue` SFC so the rule's template-aware logic is exercised through `vue-eslint-parser`.

## Key elements

- **`RuleTester.describe / RuleTester.it` statics** — bound to vitest's `describe`/`it` so ESLint's `RuleTester` can schedule cases without global `describe`/`it` in scope.
- **`tester` (RuleTester instance)** — configured with `vue-eslint-parser` as the outer parser and `@typescript-eslint/parser` as the inner TS parser; `ecmaVersion: 'latest'`, `sourceType: 'module'`.
- **`tester.run('mobile-strategy', mobileStrategy as never, {…})`** — the single assertion block.
  - *Valid cases* — `<v-dialog>` with `:fullscreen` or literal `fullscreen`; `<v-table>` with `v-focusable-scroll="t('x')"`; `<v-data-table-server>` **only** when the file is `src/ui/organisms/DataTable.vue`; unrelated components like `<v-card>`.
  - *Invalid cases* — `<v-dialog max-width>` (messageId `dialogNotFullscreen`); `<v-data-table>` outside the DataTable organism (messageId `tableOutsideDataTable`); `<v-table>` missing the `v-focusable-scroll` directive or using it without a string name (messageId `scrollWithoutName`).

## Relationships

- **`scripts/eslint/mobile-strategy.ts`** — the rule under test; imported directly and passed to `RuleTester.run`. All valid/invalid cases define the expected behavior of that rule.

## Notes

- The rule is filename-sensitive: `v-data-table-server` is only legal inside `src/ui/organisms/DataTable.vue`. Test cases encode that path to pin the contract.
- `mobileStrategy as never` is a type-level escape hatch so the rule's shape satisfies `RuleTester.run` without changing the rule's public types.
- Because the rule reads the Vue template AST, a plain `espree`-based `RuleTester` would not work; `vue-eslint-parser` (with a TS inner parser) is mandatory for every case.
