---
source: tests/unit/infrastructure/utils/use-reset-on-viewer-change.spec.ts
sha256: 95cd7eae14528c792d8af2cbe9829a1be167d55ff8ff20661687bd903da53106
signature: 7bc162634bac63ce7f7c30a1545b0a400ebd67bd262b33f642d84a9106e3b236
generated_at: 2026-11-10T08:09:00.115079+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/utils/use-reset-on-viewer-change.spec.ts

## Purpose

Unit tests for the `useResetOnViewerChange` composable, verifying that a store's per-person state is reset **only** when the viewer leaves (signs out) or is replaced by a different person — and explicitly **not** on first sign-in or on a same-person record refresh.

## Key elements

- **`viewerOf(id)`** — inline helper that fabricates a minimal viewer object (`id`, `email`, `role`, `verified`) for test fixtures.
- **`reset`** — a `vi.fn()` stub registered as the reset callback passed to `useResetOnViewerChange` in `beforeEach`; all assertions target this spy.
- **`describe('useResetOnViewerChange')`** — single suite with four cases:
  - *stays quiet for the first sign-in* — sets `viewer`, expects no reset.
  - *resets when the person signs out* — sets then clears `viewer`, expects one call.
  - *resets when another account replaces the person* — swaps `viewerOf('a')` → `viewerOf('b')`, expects one call.
  - *stays quiet when the same person's record is refreshed* — reassigns same `id` with a changed `email`, expects no call.

## Relationships

No graph neighbors are listed for this file. It imports `useSessionStore` and `useResetOnViewerChange` but neither appears as a tracked neighbor in the dependency graph.

## Notes

- Every state mutation is followed by `await nextTick()` (from Vue) to let the composable's internal watcher flush before assertions run. Skipping this would cause false negatives.
- The "same person refreshed" test distinguishes identity by `id` alone; it changes `email` to prove the composable isn't doing a shallow object-equality check.
- Pinia is recreated fresh in `beforeEach` via `setActivePinia(createPinia())`, so there is no shared store state between tests.
