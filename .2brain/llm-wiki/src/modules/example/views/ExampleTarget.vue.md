---
source: src/modules/example/views/ExampleTarget.vue
sha256: a384768816c608f427b46c042f71c767c42472de793f9edaaecdbd07962c64dd
generated_at: 2026-10-17T00:55:05.113596+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/views/ExampleTarget.vue

## Purpose

Detail (read) screen for a single example record. It hydrates one example from the store by route id, renders it in the shared `ItemDetailLayout` skeleton, exposes a `changeStatus` mutation to `ExampleStatusActions` via provide/inject, and owns the confirm-and-delete flow.

## Key elements

- **Named block** (`ExampleTargetPage`) — SFC name for devtools / `<KeepAlive>`, required because `<script setup>` can't declare one.
- **`watchExample(() => id, { onError })`** — reactive hydration; pulls the record into `currentExample` whenever `id` changes. On 404/403 delegates to `useMissingRecord`.
- **`changeStatus(status)`** — calls `updateExample(id, { status })`, toasts success, or reports a blocking error in place. Exposed to descendants via `provideExample`.
- **`provideExample({ example, changeStatus })`** — the provide-side of the pair that `ExampleStatusActions` injects.
- **`handleDelete()`** — shows a confirmation dialog, then `deleteExample(id)`, toasts success, and navigates to `ExamplesList`.
- **`heroTitle`** (computed) — falls back: `currentExample.title` → route `id` → i18n page title.
- **Two `useBlockingError` instances** — one for the status buttons (rendered beside them), one for the delete button (rendered in the actions slot). Errors stay in-place rather than joining a toast queue.
- **`session.can('update'|'delete', 'Example')`** — gates visibility of the status section, the edit button, and the delete button.

## Relationships

- **`src/modules/example/store.ts`** — consumes `useExampleStore` for `watchExample`, `updateExample`, `deleteExample`, and the `currentExample` ref (via `storeToRefs`).
- **`src/modules/example/provided.ts`** — imports and calls `provideExample` to wire the provide/inject channel.
- **`src/modules/example/components/ExampleStatusActions.vue`** — imported and rendered in the status section; receives `currentExample` and `changeStatus` through the `provideExample` token. This component never touches the store directly.
- **`src/infrastructure/utils/logger.ts`** — no direct import or call in this file; listed as a graph neighbor but not interacted with here.

## Notes

- The `id` prop is **optional**. When absent, `changeStatus` resolves immediately and `handleDelete` is a no-op; the template still renders (with a "loading" placeholder) so the page never crashes on a missing param.
- After a successful delete the component navigates away to `ExamplesList`; there is no "record no longer exists" state to display.
- `watchExample` is invoked **immediately** with a getter (`() => id`), not wrapped in a `watch()`. It is a one-shot reactive subscription managed by the store.
- The status section and the edit/delete buttons are each gated by a **different** `session.can` permission (`update` vs `delete`), so a user can see one without the other.
