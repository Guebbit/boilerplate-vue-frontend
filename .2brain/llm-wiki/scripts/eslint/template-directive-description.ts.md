---
source: scripts/eslint/template-directive-description.ts
sha256: 8cac85e8146040ac81cbc74106b73b8800219ec0c9a68572dafaba51a996db55
signature: 6aa7774ebc6da736dfc6f87fcd0610a2bf4e49e2f6e28459e133b47561411f65
generated_at: 2026-11-10T02:41:01.650862+00:00
model: ollama:qwen3.8:27b
---

# scripts/eslint/template-directive-description.ts

## Purpose

A custom ESLint rule that flags `eslint-disable` comments inside Vue SFC **template** blocks when they lack a ` -- <reason>` suffix. It plugs a gap: the standard `@eslint-community/eslint-comments/require-description` plugin only inspects script comments, so a bare `<!-- eslint-disable no-undef -->` in a template currently passes unchecked.

## Key elements

- **`DISABLE_DIRECTIVE`** (const regex) — Matches `eslint-disable`, `eslint-disable-line`, and `eslint-disable-next-line` at the start of a comment value.
- **`DESCRIPTION_SEPARATOR`** (const regex) — Matches the ` -- ` (two-or-more dashes) separator that delimits the rule name from its reason, matching the convention `vue/comment-directive` uses.
- **`templateComments(program)`** — Safely extracts the `comments` array from a `vue-eslint-parser` `Program` node's `templateBody`. Returns `[]` for `.ts` files, template-less SFCs, or malformed nodes.
- **`templateDirectiveDescription`** (exported rule) — The ESLint rule itself. Hooks into `Program:exit`, iterates template comments, and reports `missingDescription` for any disable directive that has no ` -- reason`.

## Relationships

- **`scripts/eslint/index.ts`** — Imports and re-exports this rule as part of the project's ESLint plugin rule set, making it available to consumers via the plugin.
- **`tests/unit/scripts/eslint/template-directive-description.spec.ts`** — Unit-test suite that exercises the rule against valid and invalid template comments.

## Notes

- The rule hooks `Program:exit` rather than a `Comment` selector so it only fires once the full file (script + template) has been parsed.
- It intentionally does **not** report unused or no-op disables; that responsibility belongs to `vue/comment-directive`.
- The `templateComments` helper treats `templateBody` as an untyped object and casts at the boundary, because `vue-eslint-parser` doesn't ship structural types for that node.
- The `RuleCreator` docs-link helper points to `docs/tools/design-lint.md#<rule-name>`, so any new rule added alongside this one should follow the same anchor convention.
