---
source: src/modules/example/composables/use-example-transition.ts
sha256: a5dd6b3b4efc0e6638fb46d588debdd5f4ea023b4d42a9ea95ccaad7f7d0a6d7
signature: 09847e786ffb4e9c23ccc8b68041a683265720c20faf2207edf59713e04e5225
generated_at: 2026-11-10T04:21:56.532094+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/composables/use-example-transition.ts

## Purpose

Composable that applies a lifecycle event (status transition) to a routed example and handles the 409 "someone got there first" conflict: on success it toasts; on 409 it blocks the UI in place and forces a cache-bypassing re-read so the record reflects what the server now offers. It exists so both the detail screen and the edit screen share one transition path.

## Key elements

- **`useExampleTransition(id: () => string | undefined)`** — the sole export. Takes a *lazy* id accessor (read at call time, not at setup time).
- **`changeStatus(event: ExampleEvent): Promise<void>`** — calls `store.transitionExample(target, event)`; on success adds a notification; on 409 reports the blocking error and calls `store.fetchExample(target, { forced: true })` to re-read. Returns an already-resolved promise if `id()` is `undefined`.
- **`error`** — reactive blocked-state message (from `useBlockingError`), rendered in place by the calling view.
- **`clearError()`** — resets the blocked state; called at the top of each `changeStatus` invocation.

## Relationships

- **`src/modules/example/store.ts`** — provides `useExampleStore` and the `ExampleEvent` type. This composable calls `transitionExample` (the write) and `fetchExample` with `{ forced: true }` (the conflict re-read).
- **`src/modules/example/views/ExampleTarget.vue`** — caller: the detail/status screen that displays the current state and triggers transitions.
- **`src/modules/example/views/ExampleEdit.vue`** — caller: the edit screen, which also uses this composable for its action buttons.
- **`src/modules/example/tests/use-example-transition.spec.ts`** — unit tests for the composable's success, 409, and missing-id paths.

## Notes

- The `id` parameter is intentionally a function, not a value, so the composable can be called once at setup while the route param is resolved later.
- On a 409 the forced re-read (`{ forced: true }`) drops the stale `If-Match` ETag (see `infrastructure/http/etag.ts`), meaning the next PATCH from an open edit form goes out **unconditional**.
- Non-409 failures still surface through `report(error_)` (the blocking-error mechanism) but do **not** trigger a re-read.
- The composable follows the "two callers or it doesn't earn its place" convention stated in its module doc comment; if only one view needs transitions, inline the logic instead.
