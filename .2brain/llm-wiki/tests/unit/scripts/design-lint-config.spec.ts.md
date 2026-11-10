---
source: tests/unit/scripts/design-lint-config.spec.ts
sha256: 0f41b56071c5432a60697fa0e33b4d2a54201499043143887e46d00b6bdbfbcb
signature: 60899da9e5485b8f8bef10b4f082d7db4110f8f1a0492928057036573d32a372
generated_at: 2026-11-10T08:14:17.312436+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/design-lint-config.spec.ts

## Purpose

Vitest suite that exercises the Tailwind CSS half of the design lint end-to-end: it feeds Vue `<template>` snippets through an ESLint instance built with the `better-tailwindcss` plugin and the project's `@theme`, then asserts which rule IDs fire. The file exists to catch regressions in the lint config—broken stylesheet paths, missing scale entries, or misconfigured restricted lists—by turning them into explicit test failures rather than silent "unknown class" noise.

## Key elements

- **`eslint`** (module-level const) – An `ESLint` instance with `overrideConfigFile: true`, the Vue flat base config, `reportUnusedDisableDirectives: 'error'`, and the spread output of `designLintConfig()`.
- **`ruleIdsOf(template, script?)`** – Helper that wraps a snippet in a `.vue` SFC, lints it via `lintText` at `src/snippet.vue`, and returns the array of reported `ruleId` values (or `[]`).
- **`describe('design lint, Tailwind class rules')`** – The single suite; every `it` blocks a specific rule or interaction:
  - Canonical-spelling enforcement (`enforce-canonical-classes`)
  - Restricted / arbitrary-value blocking (`no-restricted-classes`)
  - Duplicate and conflicting classes (`no-duplicate-classes`, `no-conflicting-classes`)
  - Hoisted `*_CLASSES` const detection
  - Unknown-class reporting vs. app/Vuetify utilities (`no-unknown-classes`)
  - Vuetify interop (elevation, `position-fixed`, radius mapping, `rounded-class` prop)
  - Tailwind shadow-scale removal in favour of `elevation-*`
  - Restricted utility list (arbitrary values, `bg-white`, `z-999`, etc.)
  - Token / scale-step / refinement allow-lists (`z-toast`, `w-1/2`, variant chains)
  - Reasoned `eslint-disable` acceptance and unused-disable rejection

## Relationships

- **`scripts/eslint/design-config.ts`** – Imported as `designLintConfig()` and spread into the ESLint override config. This is the sole production dependency of the test; every assertion in the suite depends on that function correctly wiring the `better-tailwindcss` plugin, resolving the project stylesheet for its `@theme`, and exporting the rule set under test.

## Notes

- The test file intentionally lints against `src/snippet.vue` (a virtual path) so that the plugin's relative-path resolution of the stylesheet still succeeds; changing the working directory or the stylesheet location will break every case at once.
- `reportUnusedDisableDirectives` is set to `'error'` at both the linter and Vue-rule levels, so a stray `<!-- eslint-disable … -->` that matches no rule is itself a test failure—use this to confirm disable directives are actually needed.
- The "refused" and "lets through" tests iterate arrays and collect offenders into a local list, then assert the list is empty; a single new restricted entry (or a newly allowed token) will surface as one name in the diff rather than a bare boolean.
- Vuetify-specific classes (`elevation-*`, `surface-glow`, `position-fixed`) are treated as *known* only when the design config explicitly whitelists them; they are not inferred from any Vuetify source.
