---
source: src/ui/directives/focusable-scroll.ts
sha256: fee39789be8a8c5802318ec97bba217e817be4475307ab3fa1dbaef8ade7b5a0
signature: 2c479fe83d1a1823c091a6331ffec59b3fd70ffd71a593d61cf6d916d010c4aa
generated_at: 2026-11-10T06:26:27.749648+00:00
model: ollama:qwen3.8:27b
---

# src/ui/directives/focusable-scroll.ts

## Purpose

Fixes the axe `scrollable-region-focusable` violation on Vuetify's `v-table` by making the internal `.v-table__wrapper` div keyboard-focusable and, when a string is passed, a named `region` landmark. Exists because `v-table` exposes no prop, slot, or ref for that inner scroller.

## Key elements

- **`WRAPPER_SELECTOR`** — constant (`.v-table__wrapper`); the only way to reach Vuetify's internal scroll container.
- **`vFocusableScroll`** (exported `Directive<HTMLElement, string | undefined>`) — two hooks:
  - `mounted` — queries the wrapper, sets `tabIndex = 0`. If the bound value is a non-empty string, also sets `role="region"` and `aria-label`.
  - `updated` — if the bound value is a non-empty string, refreshes `aria-label` on the wrapper.

## Relationships

None (no graph neighbors).

## Notes

- Apply the directive to the `<v-table>` element itself, e.g. `<v-table v-focusable-scroll="'Revenue'">`, not to the inner div.
- Omitting the value (or passing `undefined`) still makes the wrapper focusable but does **not** add `role` or `aria-label`, so it is not announced as a named landmark.
- `role="region"` is set only in `mounted`. The `updated` hook refreshes `aria-label` but never (re-)sets `role`. If the bound value transitions from `undefined` to a string after initial mount, `role="region"` will be absent.
