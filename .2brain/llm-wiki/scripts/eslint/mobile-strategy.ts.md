---
source: scripts/eslint/mobile-strategy.ts
sha256: bef25a36b368563ba6c927e58a95dd6d9053ae871c1cdc0eb55818434fb96d00
signature: c6abebc770f30d1c6bf288d3e965d36d64d886ffff788999cbcb394db42b63ff
generated_at: 2026-11-10T02:40:25.671280+00:00
model: ollama:qwen3.8:27b
---

# scripts/eslint/mobile-strategy.ts

## Purpose

Defines the `mobile-strategy` ESLint rule for Vue templates. It enforces three phone-specific patterns: dialogs must bind `fullscreen`, data tables must be rendered through a designated wrapper component, and plain `<v-table>` elements must carry a named `v-focusable-scroll` directive so their scroll region is keyboard-reachable.

## Key elements

- **`mobileStrategy`** (exported) — The ESLint rule, created via `ESLintUtils.RuleCreator`. Reports at the offending element's line with one of three `messageId`s: `dialogNotFullscreen`, `tableOutsideDataTable`, `scrollWithoutName`. Takes no options.
- **`hasAttribute(element, name)`** — Checks whether a template element carries a static attribute (`fullscreen`) or a `v-bind` directive (`:fullscreen`).
- **`directiveNamed(element, name)`** — Locates a `v-<name>` directive on the element (e.g. `v-focusable-scroll`); returns the full `TemplateAttribute` so the caller can also inspect its value.
- **`checkElement`** (inner) — The per-`VElement` dispatcher: routes to the dialog, table-wrapper, or scroll-name check based on the tag name from the imported policy constant.
- **`TemplateElement` / `TemplateAttribute`** — Lightweight structural types describing the subset of the `vue-eslint-parser` AST the rule reads.
- **`MessageIds`** — Union of the three finding identifiers.

## Relationships

- **`scripts/design-policy.ts`** — Provides the `DESIGN_POLICY` constant, whose `mobileStrategy` property supplies all tag names, binding names, directive names, and the single allowed "owner" file path used by this rule. Changing tags or the owner file is done there, not in this rule.
- **`scripts/eslint/index.ts`** — Aggregates/exports this rule so it can be added to a shared ESLint config or plugin.
- **`tests/unit/scripts/eslint/mobile-strategy.spec.ts`** — Unit tests exercising the three findings (positive and negative cases) against this rule.

## Notes

- The rule only activates when the parser exposes `defineTemplateBodyVisitor` (i.e. `vue-eslint-parser`). Without it, `create` returns an empty listener and the rule is silently a no-op.
- `context.filename` is normalized (`\\` → `/`) before the `endsWith` owner check, so it works on Windows paths.
- The `scrollWithoutName` check requires the directive to have a **value** (`directive?.value == null` triggers the report); a bare `v-focusable-scroll` without an argument is still flagged.
- The docs URL is auto-generated as `docs/tools/design-lint.md#<rule-name>`; keep that page in sync if message wording changes.
