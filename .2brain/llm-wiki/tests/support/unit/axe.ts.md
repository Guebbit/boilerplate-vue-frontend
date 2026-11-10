---
source: tests/support/unit/axe.ts
sha256: 36a80bb9afacc4693780bcd2b3d3cf3295486fac74f9567ae10f669f3ba20b41
signature: f493193243ea9e6706fc8cf558695c7f7cf2762efeee5aee9703200acc47bd3a
generated_at: 2026-11-10T07:39:46.907549+00:00
model: ollama:qwen3.8:27b
---

# tests/support/unit/axe.ts

## Purpose
Centralises the axe-core accessibility audit used across unit specs. Because jsdom cannot compute layout, two axe rules would always produce false negatives; this file disables them in one place and exports a single helper that returns violations as readable strings for easy `toEqual([])` assertions.

## Key elements
- **`JSDOM_OPTIONS`** (const, not exported) – `RunOptions` object that disables the `color-contrast` and `region` rules, which jsdom cannot evaluate correctly.
- **`axeViolations`** (exported) – Runs `axe.run` on a DOM subtree and resolves to `string[]`, one line per violation formatted as `<rule-id>: <first-node-html>`. Returns an empty array when the subtree is clean. Defaults to auditing `document.body`.

## Relationships
Consumed by every unit a11y spec in the repo to audit rendered component output:

- `src/modules/cart/tests/cart-view.spec.ts`
- `src/modules/cart/tests/guest-cart-view.spec.ts`
- `src/modules/cart/tests/merge-report-alert.spec.ts`
- `src/modules/notifications/tests/notifications-bell.spec.ts`
- `tests/unit/app/tours.spec.ts`
- `tests/unit/ui/translation-tabs.spec.ts`

Each spec imports `axeViolations`, calls it against its mounted component's container, and asserts the result equals `[]`.

## Notes
- The `options` parameter **replaces** `JSDOM_OPTIONS` entirely (it is the default argument, not a merge target). A spec that passes custom options to scope to specific rules must re-disable `color-contrast` and `region` itself, or those rules will run and produce noise.
- Only the **first** violating node's HTML is included in each line (`nodes[0]?.html`); additional nodes for the same rule are not listed.
- The function always resolves (it never rejects) as long as `axe.run` resolves; violations are data, not exceptions.
