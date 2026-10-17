---
source: src/modules/example/views/ExamplePublished.vue
sha256: db743415a6f75b7de5363ffeeee69620f96709fa895ffc28e2c0550cfbdeafa4
generated_at: 2026-10-17T00:54:50.197112+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/views/ExamplePublished.vue

## Purpose

Public, unauthenticated read page for a single published example. It resolves the route `id` through the store's `fetchPublished` action and renders the result (title, body, owner, date, optional image). A 404 response—regardless of whether the id is a draft, archived, or nonexistent—diverts to the shell's Error page.

## Key elements

- **Named component block (`export default { name: 'ExamplePublishedPage' }`)** — gives the SFC a stable name for `<KeepAlive>` and devtools; required because `<script setup>` cannot set it.
- **`fetchPublished`** (from `useExampleStore()`) — the store action that performs the public fetch by id.
- **`example: Ref<Example | undefined>`** — local reactive holder for the loaded record; `undefined` while loading.
- **`onMissingRecord`** (from `useMissingRecord()`) — composable that handles 404/missing-record rejections and redirects to the Error page.
- **`watch(id, …, { immediate: true })`** — resets `example`, fetches on first render and on every route-id change; chains `.then` / `.catch(onMissingRecord)`.
- **Template components** — `ItemDetailLayout`, `ItemDetailHero`, `CardDetail`, `LazyImage` (shared UI organisms/molecules) compose the rendered card.
- **Props** — `id?: string`, expected to be supplied by the router.

## Relationships

- **`src/modules/example/store.ts`** — Provides `useExampleStore`; this view destructures only `fetchPublished`. The returned record is stored in the view's local `ref`, **not** written back into the store's state, so it does not pollute the signed-in cache.
- **`src/modules/example/tests/example-published-view.spec.ts`** — Unit/mount spec that exercises this component's rendering and fetch behavior.

## Notes

- The fetched result is deliberately kept in a **local ref**, not in the store, because a stranger's single-record read and an owner's list are treated as different data concerns.
- The `watch` fires immediately, so the component works both on initial navigation and on in-page route-param changes (e.g., navigating from one published example to another without a full reload).
- `formatText` is applied only to `ownerName` in the hero; the body uses `whitespace-pre-line` and is rendered raw (no `formatText`).
- The `v-if="example"` gate means the `CardDetail` body area shows a generic loading string until the fetch resolves; there is no explicit error state in the template—errors are handled by the `useMissingRecord` redirect.
