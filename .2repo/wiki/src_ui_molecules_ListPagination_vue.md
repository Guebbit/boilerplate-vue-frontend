# src/ui/molecules/ListPagination.vue

## Purpose

A thin wrapper around Vuetify's `v-pagination` for single lists. It removes itself from the DOM entirely when the list has only one page, supplies a descriptive `aria-label` so multiple paginators on a page are distinguishable to screen readers, and recovers focus to the `<main>` landmark if it unmounts while focus is inside it.

## Key elements

- **Props** — `length` (total pages, defaults to `0`) and `ariaLabel` (human-readable name of what is being paged, e.g. "Stock board pages").
- **`modelValue`** — `defineModel<number>` bound to the current page (one-based, defaults to `1`). Use with `v-model` from the parent.
- **`root` ref** — attached to the wrapper `<div>` so the unmount guard can check whether `document.activeElement` is still inside the component.
- **Unmount focus guard** — `watch(() => length > 1, …)` fires when the pager transitions from rendered → not rendered. If focus was inside the pager, it defers to `nextTick` and calls `.focus()` on `main[data-main-content]`.

## Relationships

No graph-tracked dependencies. The component is a leaf in the dependency graph.

## Notes

- The wrapper `<div>` carries `class="contents"` (CSS `display: contents`), so it does not create a layout box; the child `v-pagination` behaves as a direct child of the parent.
- `v-if="length > 1"` removes the component from the DOM rather than hiding it, which is what triggers the focus-recovery path.
- `total-visible` is hardcoded to **7** pages shown before ellipsis.
- The focus target is the element matching `main[data-main-content]`; if that attribute is missing, the guard silently does nothing.
- Requires Vue ≥ 3.4 (`defineModel`).
