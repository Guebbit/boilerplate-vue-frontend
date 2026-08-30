# src/ui/molecules/ListPagination.vue

## Purpose

A thin wrapper around Vuetify's `v-pagination` that solves three UX problems at once: it disappears entirely when a list has only one page, gives each instance a unique `aria-label` so screen readers don't merge two pagers into one landmark, and hands focus to the `<main>` landmark when it unmounts out from under the user's cursor.

## Key elements

- **Props** — `length` (total pages, defaults to 0) and `ariaLabel` (human-readable name for assistive tech, e.g. "Ledger pages").
- **`modelValue`** — a `defineModel<number>` (one-based current page, defaults to 1). Parent components bind with `v-model`.
- **`root` ref** — captured on the wrapper `<div>` so the unmount watcher can check whether focus was inside the pager.
- **Unmount focus watcher** — watches `length > 1`; when the pager transitions from rendered to not-rendered *and* focus was inside it, defers to `nextTick` and focuses `[main[data-main-content]]` to prevent focus falling to `<body>`.
- **Template** — the wrapper `<div>` uses `v-if="length > 1"` and `class="contents"` so it contributes no layout of its own when visible; `v-pagination` is configured with `total-visible=7`, `density="comfortable"`, and `mt-4` spacing.

## Relationships

- **`src/ui/organisms/DataTable.vue`** — the primary consumer. DataTable renders `ListPagination` beneath its table rows, passing the computed page count as `length`, a domain-specific `ariaLabel`, and binding the current page via `v-model`. When a filter shrinks the result set to one page, DataTable's logic causes `length` to drop to 1, triggering the unmount-and-refocus behavior.
- **`docs/reference/src-ui.md`** — the directory-level reference page that lists this molecule among the UI building blocks and links to it.

## Notes

- The component is *self-hiding* (`v-if="length > 1"`), so a parent should not also guard on page count—doing so would leave a dead branch in the template tree.
- The focus-recovery selector is hard-coded to `[main[data-main-content]]`. If the app shell changes that attribute or the main landmark is absent, the fallback silently does nothing.
- `class="contents"` (CSS `display: contents`) keeps the wrapper invisible to layout; don't add padding/margin to it—use the `mt-4` on `v-pagination` for spacing.
- The one-based page convention (`modelValue` starts at 1) matches Vuetify's `v-pagination`; converting to a zero-based index is the parent's responsibility.
