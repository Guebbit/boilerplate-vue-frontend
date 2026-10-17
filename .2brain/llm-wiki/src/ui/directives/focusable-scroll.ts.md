---
source: src/ui/directives/focusable-scroll.ts
sha256: 39a6b4da0940425729e7cd9f7e70bf40874d24e833e6c20e88ecab61be084eaa
generated_at: 2026-10-17T01:57:40.107543+00:00
model: ollama:qwen3.8:27b
---

# src/ui/directives/focusable-scroll.ts

## Purpose

A Vue custom directive that retrofits Vuetify's `v-table` inner scroll wrapper (`.v-table__wrapper`) with keyboard focusability (`tabindex="0"`) and an optional accessible region name, resolving the axe `scrollable-region-focusable` violation for keyboard and screen-reader users.

## Key elements

- **`vFocusableScroll`** (exported `Directive<HTMLElement, string | undefined>`) — Applied to the `<v-table>` element. On `mounted` it locates the `.v-table__wrapper` child, sets `tabIndex = 0`, and (if a string value is bound) adds `role="region"` and `aria-label`. On `updated` it refreshes `aria-label` if the bound value changes.
- **`WRAPPER_SELECTOR`** (module-private const) — The CSS selector `'.v-table__wrapper'` used to find the scrollable div Vuetify renders inside the table.

## Relationships

No graph neighbors are recorded for this file. It imports only the `Directive` type from `vue`; no other project modules depend on or are depended upon by this file.

## Notes

- The directive is applied to the **outer** `<v-table>` element but mutates the **inner** `.v-table__wrapper` child via `querySelector`. If Vuetify changes that internal class name, the directive silently no-ops (`if (!wrapper) return`).
- The bound value is optional (`string | undefined`). Without it the wrapper is still focusable but is **not** announced as a named landmark region — useful when you only need the axe fix without adding a landmark to the page's navigation structure.
- The directive does not clean up on `unmounted`; it relies on Vue destroying the element (and its attributes) when the `v-table` is removed.
