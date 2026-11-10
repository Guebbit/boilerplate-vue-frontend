---
source: scripts/eslint/stylesheet-classes.ts
sha256: 7398e0804f306da04e9f984cfc1ebf8e28a726f06a1d86a4d5e7c9b8f9b3f183
signature: d943b2c31a7c8db954b12e203f794d55736d04c02300de5fd18e2741298d16fc
generated_at: 2026-11-10T02:40:52.307625+00:00
model: ollama:qwen3.8:27b
---

# scripts/eslint/stylesheet-classes.ts

## Purpose

Reads the project's CSS class definitions from `src/**/*.css` files and Vue SFC `<style>` blocks, splitting them into **global** classes (valid in any file) and **scoped** classes (valid only in the SFC that defines them). This lets the `no-unknown-classes` ESLint rule derive its allow-list from the codebase itself instead of maintaining a hard-coded list.

## Key elements

- **`StylesheetClasses`** (interface) — the return shape: a `global` `ReadonlySet<string>` and a `scopedByFile` `ReadonlyMap<string, ReadonlySet<string>>` keyed by forward-slash relative path.
- **`classesOfCss(css)`** (exported) — extracts class names from a CSS string via PostCSS `walkRules` and the `CLASS_SELECTOR` regex. Returns a `Set<string>`.
- **`readStylesheetClasses(root)`** (exported) — the main entry point. Globs `src/**/*.css` and `src/**/*.vue` under `root`, parses SFCs with `vue/compiler-sfc` `parse` (block-splitting only, no compilation), and returns a `StylesheetClasses` object.
- **`ignorePatterns(names)`** (exported) — converts an iterable of class names into sorted, anchored, regex-escaped strings (`^name$`) suitable for `no-unknown-classes`' `ignore` option.
- **`addBlockClasses`** (internal) — routes a single `<style>` block's classes into the global set or the per-file scoped map based on the block's `scoped` flag.
- **`CLASS_SELECTOR`** (internal regex) — matches `.className` tokens in a selector string, including inside `:deep(.name)`.

## Relationships

- **`scripts/eslint/design-config.ts`** — consumes `readStylesheetClasses` and `ignorePatterns` to build the `ignore` array passed to the `no-unknown-classes` rule, so the rule's allowed-class list always reflects the current stylesheets.
- **`tests/unit/scripts/eslint/stylesheet-classes.spec.ts`** — unit tests covering `classesOfCss`, `readStylesheetClasses`, and `ignorePatterns`.

## Notes

- Scoped classes are keyed by **forward-slash** relative paths (backslashes are normalized). A scoped class used outside its defining SFC styles nothing and will be flagged.
- `vue/compiler-sfc` `parse` is used only to split an SFC into its `<script>`/`<style>`/`<template>` blocks; no Vue compilation occurs.
- `CLASS_SELECTOR` is a simple global regex over the raw selector string, not a full CSS selector parser. It correctly picks up classes inside pseudo-selectors like `:deep(.foo)` but will also match any dotted token in the selector text.
- `ignorePatterns` sorts names alphabetically before escaping and anchoring, producing deterministic output.
