---
source: tests/unit/scripts/eslint/template-directive-description.spec.ts
sha256: 9e123f432469b07ddd4e3a83051c30e62d6153a2ce61b1da57bdf6725023042f
signature: 02acf0d640f68b40ea8cc87abed944803282675bf8c8d3601b9caee7d38ce663
generated_at: 2026-11-10T08:20:21.845801+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/eslint/template-directive-description.spec.ts

## Purpose

Unit tests for the `templateDirectiveDescription` ESLint rule. Verifies that the rule correctly flags `eslint-disable` directives inside Vue `<template>` blocks when they carry no descriptive comment (e.g. `<!-- eslint-disable-next-line vue/no-v-html --`) while leaving well-documented directives and non-directive comments untouched.

## Key elements

- **`tester`** – A `RuleTester` instance configured with `vue-eslint-parser`, `ecmaVersion: 'latest'`, and `sourceType: 'module'`. Every test case uses `filename: 'a.vue'` so the SFC template is actually parsed and `templateBody.comments` is populated.
- **`tester.run('template-directive-description', …)`** – The sole test invocation. Contains:
  - **3 valid cases** – directive *with* a trailing `-- reason` comment; a plain HTML comment that is not a directive; a `.vue` file with no `<template>` block at all.
  - **3 invalid cases** – `eslint-disable-next-line`, bare `eslint-disable`, and `eslint-disable-line` each without a description; all expect a single error with `messageId: 'missingDescription'`.
- **`RuleTester.describe = describe; RuleTester.it = it;`** – Explicitly wires vitest's `describe`/`it` into ESLint's `RuleTester` statics (vitest does not expose globals by default).

## Relationships

- **`scripts/eslint/template-directive-description.ts`** – The rule under test. The spec imports its sole export `templateDirectiveDescription` and supplies it to `RuleTester` for validation. All behavioral assertions (valid/invalid arrays, the `missingDescription` message id) exercise that rule's logic directly.

## Notes

- The rule parameter is cast `as never` to satisfy `RuleTester`'s type signature; this is a known ESLint test-harness workaround, not a type error in the rule itself.
- The `vue-eslint-parser` dependency is critical: without it the default parser never produces `templateBody.comments`, and the rule would see no comments at all. If the parser config is removed or changed, every test silently becomes "valid."
- Only the three directive forms (`disable`, `disable-next-line`, `disable-line`) are covered. Other hypothetical directive spellings are not tested here.
