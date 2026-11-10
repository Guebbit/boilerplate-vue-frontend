---
source: src/ui/molecules/ListPagination.vue
sha256: 0ea05963fa08ddb2ca392b44f429fb5ea6da97651c9c879b00cb927057e9d3c6
signature: 0ea05963fa08ddb2ca392b44f429fb5ea6da97651c9c879b00cb927057e9d3c6
generated_at: 2026-11-10T06:28:14.670712+00:00
model: ollama:qwen3.8:27b
---

# src/ui/molecules/ListPagination.vue

## Purpose

A thin wrapper around Vuetify's `v-pagination` that solves three problems the raw component doesn't handle: it removes itself from the DOM when there is only one page (so screen readers and tests don't see a useless landmark), it lets the caller supply a meaningful `aria-label` (Vuetify defaults every instance to "Pagination Navigation", which collides when a page has two pagers), and it relocates focus to a caller-chosen landmark if the pager unmounts while focus is inside it.

## Key elements

- **`defineProps`** — `length` (total pages), `ariaLabel` (accessibility name), `focusFallback` (selector for focus relocation, defaults to `'main'`), `testId` (data-test hook, defaults to `'pagination'`).
- **`defineModel<number>`** — two-way binding for the current page (one-based, defaults to `1`), passed through to `v-pagination`'s `v-model`.
- **`useDisplay().mobile`** — drives `total-visible`: 3 pages shown below the `sm` breakpoint, 7 above it.
- **`MOBILE_PAGES` (constant `3`)** — the page-count used on narrow viewports alongside the two arrow buttons.
- **`watch(() => length > 1, …)`** — fires when the pager transitions from rendered → unrendered; if `document.activeElement` was inside the root, it defers to `nextTick` and focuses `focusFallback`.
- **Template** — a single `<div v-if="length > 1" class="contents">` wrapping `<v-pagination>`. The `contents` display class makes the wrapper invisible to layout.

## Relationships

None. The file has no recorded graph neighbors; it imports only from `vue` and `vuetify` and receives all configuration through props.

## Notes

- The focus-relocation watch intentionally only acts on the *unmounting* edge (`rendered === false && wasRendered === true`); it never pulls focus when the pager appears.
- `focusFallback` is a **CSS selector string**, not a template ref — callers pass something like `'#ledger'` or the default `'main'`. The ui-kit deliberately does not hard-code app-specific layout.
- `class="contents"` (`display: contents`) is used so the wrapper div adds no box of its own; without it the `mt-4` margin and the `v-pagination` internal spacing would interact oddly with the parent's flex/grid.
- `testId` exists so a page with two pagers can distinguish them in tests, mirroring the convention used by `DataTable`'s `rowTest`.
- The `nextTick` call is marked with an `eslint-disable` for floating promises because the callback is a simple `querySelector?.focus()` that cannot reject.
