---
source: scripts/eslint/theme-token.ts
sha256: 1aa48b5656643739234b3fd0e55b4cd74ccf666ebe46ff07a603c17783b298fb
signature: 72a92d4d8230b651bcb8c960ff0d20f3850632696ac7d5b0a6f566288b610cf9
generated_at: 2026-11-10T02:41:22.008200+00:00
model: ollama:qwen3.8:27b
---

# scripts/eslint/theme-token.ts

## Purpose

A custom ESLint rule for Vue single-file components that enforces a single-source-of-truth policy for colours: every colour in source must be a named theme colour (defined in `src/ui/vuetify/theme.ts`), never a raw hex/rgb/CSS-name literal or an unrecognised theme variable. It exists as an AST-aware editor-integrated rule rather than a test spec so that violations surface at the exact line during editing.

## Key elements

- **`themeToken`** (named export) — the ESLint rule created via `ESLintUtils.RuleCreator`. Takes no options; reports three message IDs: `colorLiteral`, `unknownThemeVariable`, `unknownThemeColor`.
- **`scriptVisitor`** — visitors for `Literal` and `TemplateElement` nodes that run `checkText` on every string and template-literal quasi in the `<script>` block.
- **`templateVisitor`** — extends `scriptVisitor` with a `VAttribute` visitor for `<template>` attributes; delegates static values to `checkText` and dynamic/colour-prop values to `checkColorProp`.
- **`checkText`** — flags a text span as `colorLiteral` (via `isColorLiteral`) and scans for `--v-theme-<name>` variables not in the theme's colour set.
- **`checkColorProp`** — validates that a Vuetify colour prop (`color`, `bg-color`, etc., listed in `DESIGN_POLICY.colorProps`) on a `v-*` component resolves only to known theme colours, walking conditional and logical-expression branches via `choiceLiterals`.
- **`choiceLiterals`** — recursively extracts string literals from `Literal`, `ConditionalExpression`, and `LogicalExpression` nodes (does not descend into call arguments).
- **`attributeName`** — normalises static vs. `v-bind` attribute names so both `color="x"` and `:color="x"` are recognised.
- **`THEME_VARIABLE`** — regex `/--v-theme-([\da-z-]*)/g` for matching Vuetify channel variables in text.

## Relationships

- **`scripts/design-policy.ts`** — the rule imports `DESIGN_POLICY` (for the `colorProps` list), `isColorLiteral()`, and `themeColorNames()` from this module. All three feed the rule's allow-list and detection logic, so the rule's behaviour is entirely derived from the design policy defined there.
- **`scripts/eslint/index.ts`** — registers `themeToken` into the project's custom ESLint plugin so it is available to `vue-eslint-parser`-powered linting.
- **`tests/unit/scripts/eslint/theme-token.spec.ts`** — unit-tests the rule's three findings against representative Vue SFC snippets.

## Notes

- The rule uses `context.sourceCode.parserServices.defineTemplateBodyVisitor` to attach both template and script visitors. If the parser service is absent it falls back to `scriptVisitor` only — meaning template coverage silently disappears without `vue-eslint-parser`.
- `checkText` treats an open-ended template quasi (one whose expression continues with another quasi) as possibly forming a longer `--v-theme-…` name; a variable match that ends exactly at the quasi boundary is skipped to avoid a false positive on a split variable name.
- `choiceLiterals` intentionally does **not** walk `CallExpression` arguments — a call like `t('primary')` is assumed to return user-facing text, not a colour token, so its argument is not validated.
- Colour-prop checking applies only to components whose tag starts with `v-` (Vuetify components); plain HTML elements are ignored.
