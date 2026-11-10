---
source: scripts/eslint/no-hover-only.ts
sha256: 9b538e7257d495e65aff0bb63e1b6390e3e4160fccd786c058b6feaaa68326b0
signature: f803198831afbd8876b3e2aadaa0c7279a8612078776467ea835ff225ef11fd9
generated_at: 2026-11-10T02:40:39.141942+00:00
model: ollama:qwen3.8:27b
---

# scripts/eslint/no-hover-only.ts

## Purpose

A custom ESLint rule (`no-hover-only`) that flags Vue template elements whose interactions are reachable only via hover or mouse gesture. The four checks catch hover handlers without a `@click` fallback, `open-on-hover` menus without `open-on-click`, gesture-only affordances (context menu, drag/drop, `v-touch`), and native `title` tooltips on text-truncated elements. The goal is to surface UI that is unusable on touch devices or with a keyboard.

## Key elements

- **`noHoverOnly`** (export) — The rule created via `ESLintUtils.RuleCreator`; no options, four message IDs (`hoverHandler`, `openOnHover`, `gestureOnly`, `hoverTitle`).
- **`HOVER_EVENTS`** — Set of pointer events (`mouseenter`, `mouseover`, `pointerenter`, `pointerover`) treated as hover.
- **`GESTURE_EVENTS`** — Set of events (`contextmenu`, `dragstart`, `drag`, `dragover`, `drop`) treated as gesture-only.
- **`HOVER_MENU_TAGS`** — Tags (`v-menu`, `v-list-group`) for which `open-on-hover` triggers the `openOnHover` check.
- **`TRUNCATING_CLASS`** — Regex matching Tailwind classes that clip text (`truncate`, `line-clamp-*`, `text-ellipsis`).
- **`checkElement`** (internal) — Walks one element's attributes and performs all four checks in order.
- **`directiveName`, `argumentOf`, `listensFor`, `setsAttribute`, `staticClasses`** — Small helpers that read the `vue-eslint-parser` template AST (static attrs and directives) without importing the parser directly.

## Relationships

- **`scripts/eslint/index.ts`** — Registers `noHoverOnly` in the local ESLint plugin's rule map so it is available as `local/no-hover-only`.
- **`tests/unit/scripts/eslint/no-hover-only.spec.ts`** — Unit tests exercising each of the four message IDs and their pass/fail conditions.

## Notes

- The rule accesses the template AST through `context.sourceCode.parserServices.defineTemplateBodyVisitor`; if the parser service is absent it returns an empty listener. This means the rule is a no-op outside `vue-eslint-parser` contexts.
- `TRUNCATING_CLASS` is tested only against **static** `class` attribute strings (`staticClasses` helper). Dynamically bound classes (`:class="…`") are not inspected for truncation.
- Tailwind hover-utility classes (e.g. `hover:underline`) are explicitly **out of scope**; the file header notes they belong to the separate `no-restricted-classes` rule.
- `setsAttribute` excludes both static `attr="false"` and bound `:attr="false"` (literal), so `draggable="false"` or `:draggable="false"` will not trigger a finding.
