---
source: scripts/eslint/design-config.ts
sha256: 0e725e4caf8974dcd3781e4d1adf71ca59377f7ab689664eec5119c9dce8dd69
signature: 07b158ec69d3358097cd56536aa46c402569b757af4886bca77ea3a675f3fc4d
generated_at: 2026-11-10T02:39:58.211668+00:00
model: ollama:qwen3.8:27b
---

# scripts/eslint/design-config.ts

## Purpose

Produces the Tailwind-specific ESLint flat-config blocks that `eslint.config.ts` splices in. It wires the `eslint-plugin-better-tailwindcss` plugin to the project's design policy (severities, restricted classes, canonicalisation) and to the live stylesheet class set read from `src/styles/main.css`, so that a new `@theme` token becomes a recognised class immediately and equivalent arbitrary values are flagged for canonicalisation.

## Key elements

- **`designLintConfig()`** — The sole export. Returns an array of flat-config objects: one global block (files, settings, rules) plus one per-file block for each SFC that has scoped classes.
- **`REPO_ROOT`** — `process.cwd()`, used as the base path for `readStylesheetClasses` and as the implicit root for the plugin's relative `entryPoint`.
- **`CLASS_MAP_SELECTOR`** — A custom `SelectorKind.Variable` selector (name `.*CLASSES`) that teaches the plugin to lint strings inside `const FOO_CLASSES = { … } as const` objects, which its default selectors miss.
- **`CLASS_PROP_SELECTOR`** — A custom `SelectorKind.Attribute` selector (name `.*(?:-class|Class)`) so class strings passed through component props are also linted.
- **`restrictedClasses`** (local) — Merges `DESIGN_POLICY.restrictedClasses` with every `ambiguousUtilities` entry flagged `restrict`, rewriting each anchored pattern to permit a variant prefix (e.g. `md:`).
- **`globalIgnore`** (local) — Union of `ignorePatterns(stylesheets.global)` and `DESIGN_POLICY.vuetifyOwnedClasses`, fed into `no-unknown-classes`.
- **`unknownClassesRule(ignore)`** — Small helper that builds the `[severity, { ignore }]` tuple so the global and per-file blocks share the same shape.

## Relationships

- **`eslint.config.ts`** — Imports and calls `designLintConfig()` to append the Tailwind blocks to the flat-config array.
- **`scripts/design-policy.ts`** — Source of `DESIGN_POLICY`: severities, `restrictedClasses`, `ambiguousUtilities`, `vuetifyOwnedClasses`, `tailwindEntryPoint`, `rootFontSize`.
- **`scripts/eslint/stylesheet-classes.ts`** — Provides `readStylesheetClasses(root)` (parses `@theme` tokens and per-file scoped classes) and `ignorePatterns(classes)` (converts a class list to regex-ignore strings).
- **`tests/unit/scripts/design-lint-config.spec.ts`** — Unit-tests the config shape and rule options produced by `designLintConfig()`.

## Notes

- **Stylistic rules are deliberately off.** Class order, line-wrapping, and variable-syntax rules are treated as formatting concerns, not design signal, and are not enabled here.
- **`restrict` is first-match-wins.** The pattern regex is adjusted from `^name-…` to `(?:^|:)name-…` so a variant prefix like `md:` still matches while keeping the anchor.
- **Rule options replace, not merge.** Each scoped-file block re-declares the full `no-unknown-classes` ignore list (global + its own scoped classes) because the plugin does not merge option objects across blocks.
- **Test/spec files are excluded** (`src/**/tests/**`, `src/**/*.spec.ts`) since they contain fixtures rather than real styling.
- **`process.cwd()` as `REPO_ROOT`** works because ESLint is invoked from the repo root; in jsdom-based specs there is no `file:` URL from which to derive the path, so the spec must ensure `cwd` is correct before calling the function.
