---
source: scripts/eslint/index.ts
sha256: 946b8541963ff154458382c7ca55fb82048c08b3a211febb78214262758247f9
signature: 946b8541963ff154458382c7ca55fb82048c08b3a211febb78214262758247f9
generated_at: 2026-11-10T02:40:04.089390+00:00
model: ollama:qwen3.8:27b
---

# scripts/eslint/index.ts

## Purpose
Registry that aggregates the four project-local ESLint rules into a single default export (a rule-name → implementation map). It exists so `eslint.config.ts` can reference all custom rules through one import, and so each rule remains independently unit-testable via `RuleTester`.

## Key elements
- **Default export** — an object with four keys (`'mobile-strategy'`, `'no-hover-only'`, `'template-directive-description'`, `'theme-token'`), each mapped to the corresponding rule implementation imported from its sibling module.
- **Imports** — pulls one named rule factory from each sibling file (`./mobile-strategy`, `./no-hover-only`, `./template-directive-description`, `./theme-token`).

## Relationships
- **`eslint.config.ts`** — the sole consumer; imports this default export to register the custom rules under their short names.
- **`scripts/eslint/mobile-strategy.ts`** — provides the `mobileStrategy` rule implementation.
- **`scripts/eslint/no-hover-only.ts`** — provides the `noHoverOnly` rule implementation.
- **`scripts/eslint/template-directive-description.ts`** — provides the `templateDirectiveDescription` rule implementation.
- **`scripts/eslint/theme-token.ts`** — provides the `themeToken` rule implementation.

## Notes
- Rule names in the exported map (kebab-case) are the identifiers used in `eslint.config.ts`; the imported symbols are camelCase.
- One file per rule is a hard convention: each rule file is individually importable and unit-tested under `tests/unit/scripts/eslint/`.
- These rules are intentionally **not** published as a standalone plugin — they encode conventions specific to this repository.
