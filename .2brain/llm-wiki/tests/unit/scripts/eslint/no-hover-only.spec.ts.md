---
source: tests/unit/scripts/eslint/no-hover-only.spec.ts
sha256: e17fd54e1d9b5d696ae547dd62635825812c2f2a7faa48fa90a45bacbf0536c2
signature: 02acf0d640f68b40ea8cc87abed944803282675bf8c8d3601b9caee7d38ce663
generated_at: 2026-11-10T08:19:56.598110+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/eslint/no-hover-only.spec.ts

## Purpose

Unit tests for the `no-hover-only` ESLint rule. Validates that the rule correctly flags interactions reachable only via hover or gesture (e.g. hover-only menus, context-menu-only actions, clipped `title` tooltips) while accepting patterns that provide an alternative input path (click, tap, full-width text).

## Key elements

- **`RuleTester.describe` / `RuleTester.it` assignment** — Binds vitest's `describe`/`it` to RuleTester's static properties because vitest does not expose them as globals.
- **`tester` (RuleTester instance)** — Configured with `vue-eslint-parser` wrapping `@typescript-eslint/parser` so that `.vue` single-file templates are parsed.
- **`tester.run('no-hover-only', …)`** — The test suite itself:
  - **`valid` array** — 7 cases that must *not* produce errors: `@mouseenter` paired with `@click`, plain `@click`, `v-menu` with both `open-on-hover` and `open-on-click`, `v-menu` with no hover props, `draggable="false"`, `:draggable="false"`, and a `title` on non-clipped text.
  - **`invalid` array** — 8 cases that *must* produce errors, each asserting the expected `messageId`: `hoverHandler` (`@mouseenter`, `@pointerover`), `openOnHover` (`v-menu open-on-hover` alone), `gestureOnly` (`@contextmenu`, `draggable`+`@drop`, `v-touch`), and `hoverTitle` (`:title`/`title` on `line-clamp-*` or `truncate` elements).

## Relationships

- **`scripts/eslint/no-hover-only.ts`** — The rule under test. This spec imports its `noHoverOnly` export and feeds it through RuleTester to verify diagnostic messages and pass/fail behavior against Vue template snippets.

## Notes

- The rule is cast `as never` to satisfy RuleTester's type signature; this is a known RuleTester + custom-rule typing friction, not a runtime concern.
- All test snippets use `filename: 'a.vue'` so the Vue parser activates; omitting it would cause the template to be treated as invalid JS.
- The `gestureOnly` messageId appears twice in the `draggable`+`@drop` case, indicating the rule reports *each* violating node separately rather than collapsing to one diagnostic.
