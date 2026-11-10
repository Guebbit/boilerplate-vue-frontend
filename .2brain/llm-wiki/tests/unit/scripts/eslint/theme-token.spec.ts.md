---
source: tests/unit/scripts/eslint/theme-token.spec.ts
sha256: eedfd3c96de156b46fb4bb531ad18268a415e1f171f5b26b5d7f069e39f8392d
signature: d32090462165f8a35e7f7ad9e029957dea123c8c717c3985c8f2e943366c4dcf
generated_at: 2026-11-10T08:20:38.707415+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/eslint/theme-token.spec.ts

## Purpose

Unit tests for the `theme-token` ESLint rule, verifying that it correctly flags hard-coded colour literals and unknown theme tokens while accepting legitimate Vuetify theme references. The rule is exercised separately through a TypeScript parser (`.ts` sources) and `vue-eslint-parser` (`.vue` sources) so that template-level colour attributes and inline styles are also covered.

## Key elements

- **`RuleTester.describe` / `RuleTester.it` statics** — Wired to Vitest's `describe`/`it` so ESLint's `RuleTester` can run under Vitest (which does not expose globals).
- **`scriptTester`** — A `RuleTester` configured with `@typescript-eslint/parser`; runs valid/invalid cases against plain `.ts` code (string literals, template literals).
- **`templateTester`** — A `RuleTester` configured with `vue-eslint-parser` (and `tsParser` as the `<script>` parser); runs valid/invalid cases against `.vue` SFCs, exercising `color`/`bg-color` props, `:style` bindings, and `<div style="…">` attributes.
- **`themeToken`** — The rule under test, imported from `scripts/eslint/theme-token.ts` and cast `as never` to satisfy `RuleTester`'s typing.
- **Message IDs asserted** — `colorLiteral` (hard-coded colour), `unknownThemeColor` (not a valid Vuetify theme name), `unknownThemeVariable` (invalid `--v-theme-*` variable name).

## Relationships

- **`scripts/eslint/theme-token.ts`** — The sole subject under test; the spec imports `themeToken` and feeds it through `RuleTester.run` against both parser configurations. No other project code is imported or referenced.

## Notes

- Two separate `RuleTester` instances are required because `vue-eslint-parser` is what exposes `<template>` to the rule; a single TS-parser tester would miss all template cases.
- The `themeToken as never` cast works around a type mismatch between the rule's ESLint type and `RuleTester`'s expected signature; it is safe at runtime.
- Valid-case comments in the file (e.g. "A hash link is not a hex colour", "A colour prop on a component that is not Vuetify's") document intentional *non*-detections — these are behavioural contracts, not just examples.
- The last invalid template case (`<template><div /></template><script setup lang="ts">…`) confirms the rule also catches colour literals inside the `<script>` block of a `.vue` file when run through the template tester.
