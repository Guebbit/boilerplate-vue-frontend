---
source: tests/unit/ui/focusable-scroll.spec.ts
sha256: 25893706b3f46f7ac6add13c29b5dafcc8fea693335eab0888a26342be1fd0f0
generated_at: 2026-10-17T02:45:45.844886+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/focusable-scroll.spec.ts

## Purpose

Unit test for the `v-focusable-scroll` directive as applied to a Vuetify `v-table`. It pins the DOM contract required by the axe `scrollable-region-focusable` rule: the inner scroller element must be keyboard-focusable and, when given a name, exposed as a labelled region.

## Key elements

- **`mountTable(name?)`** — helper that mounts a minimal `<v-table>` with the `v-focusable-scroll` directive bound to a `label` prop; returns a Vue Test Utils wrapper.
- **`'makes the scroller focusable and names it as a region'`** — asserts `.v-table__wrapper` receives `tabindex="0"`, `role="region"`, and `aria-label` equal to the supplied name.
- **`'leaves the outer table alone'`** — asserts the outer `.v-table` element has **no** `tabindex`.
- **`'still makes it focusable, without a role, when given no name'`** — asserts `tabindex="0"` is present but `role` and `aria-label` are absent when the name is `undefined`.
- **`'follows a name that changes'`** — asserts the `aria-label` updates reactively when the bound prop changes at runtime.

## Relationships

No graph neighbors are listed for this file. It imports `vFocusableScroll` from `@/ui/directives/focusable-scroll` (the system under test) and the `vuetify` plugin from `@/ui/vuetify` to provide the `VTable` component.

## Notes

- The directive targets `.v-table__wrapper` (the scrollable inner element), **not** the `.v-table` root. Tests explicitly verify the outer element is untouched.
- When no accessible name is supplied, the directive still applies `tabindex="0"` but omits `role` and `aria-label` entirely (it does not set `role="region"` with an empty label).
- The name is reactive: changing the bound prop updates `aria-label` without remounting.
