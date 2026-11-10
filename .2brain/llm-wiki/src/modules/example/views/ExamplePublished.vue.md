---
source: src/modules/example/views/ExamplePublished.vue
sha256: 2c74c0af1127b9ec8d840c1a68abcd027bc195f7310f70ee1b1c6b8de1bc0692
signature: 3c42d8d26a0dd5db9e52573b999e440b7fba925cfdfe3b34b1662fe42c60edff
generated_at: 2026-11-10T04:28:38.899936+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/views/ExamplePublished.vue

## Purpose

Public (no-auth) detail page that displays a single published example by its route `id`. It fetches the record via a store action, renders it inside the shared detail-layout organisms, and delegates 404 handling (draft, archived, or missing id) to the `useMissingRecord` composable.

## Key elements

- **Component name block** (`export default { name: 'ExamplePublishedPage' }`) — separate `<script>` block required to give the SFC a stable name for `<KeepAlive>` and devtools, since `<script setup>` cannot set one.
- **`id` prop** (`string | undefined`) — the route parameter identifying which published example to show.
- **`fetchPublished`** — destructured from `useExampleStore()`; the single async call that retrieves the record.
- **`example` ref** (`ref<Example>()`) — holds the loaded record; `undefined` while loading or when no fetch occurred.
- **`onMissingRecord`** — from `useMissingRecord()`; the `.catch` handler that navigates to the shared Error page on 404.
- **`watch` on `id`** (`immediate: true`) — resets `example`, skips if `id` is falsy, otherwise fetches and assigns. Fires on mount and on every route-id change.
- **Template** — `ItemDetailLayout` → `ItemDetailHero` (title, owner, lucide icon) + `CardDetail` (optional `LazyImage`, `whitespace-pre-line` body, published-by line). Falls back to a `generic.loading-state` string while `example` is `undefined`.

## Relationships

- **`src/modules/example/store.ts`** — provides `useExampleStore`; this view calls its `fetchPublished` action. No other store members are used here.
- **`src/modules/example/tests/example-published-view.spec.ts`** — unit/integration tests that mount this component and exercise the happy path, loading state, and 404 branch.

## Notes

- The `id` prop is **optional**; when absent the watch body returns early and the template shows the loading string indefinitely. Routes that guarantee `id` should be preferred.
- `immediate: true` means the first fetch happens during the same tick as mount (no separate `onMounted` call).
- 404 is handled entirely by `useMissingRecord` (navigates away); this component never renders its own error markup.
- The non-setup `<script>` block must stay above `<script setup>` and contains *only* the `name` export — adding reactive logic there would break the setup-compilation expectations.
