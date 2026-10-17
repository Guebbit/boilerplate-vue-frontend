---
source: tests/unit/infrastructure/utils/use-reset-on-viewer-change.spec.ts
sha256: 95cd7eae14528c792d8af2cbe9829a1be167d55ff8ff20661687bd903da53106
generated_at: 2026-10-17T02:40:42.747990+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/utils/use-reset-on-viewer-change.spec.ts

## Purpose

Unit tests for the `useResetOnViewerChange` composable, verifying that a store's per-person state is reset only when the viewer actually leaves (signs out) or is replaced by a different account — and *not* on the initial sign-in or on a refresh of the same person's record.

## Key elements

- **`viewerOf(id)`** — local helper that fabricates a minimal viewer object (`{ id, email, role, verified }`) for use in tests.
- **`describe('useResetOnViewerChange')`** — top-level suite; calls `useResetOnViewerChange(reset)` in `beforeEach` with a fresh Pinia and a `vi.fn()` reset spy.
- **`stays quiet for the first sign-in`** — sets a viewer from `undefined` and asserts `reset` was *not* called.
- **`resets when the person signs out`** — sets a viewer, then sets it back to `undefined`; asserts exactly one reset call.
- **`resets when another account replaces the person`** — swaps viewer `a` for viewer `b`; asserts exactly one reset call.
- **`stays quiet when the same person's record is refreshed`** — replaces viewer `a` with a spread copy whose `email` changed but `id` is the same; asserts no reset call.

## Relationships

No graph neighbors are recorded for this file. It directly imports `useResetOnViewerChange` (the composable under test) and `useSessionStore` (to drive state changes), plus `vue/nextTick` and `pinia` for the reactive test harness.

## Notes

- Every state mutation on `useSessionStore().viewer` is followed by `await nextTick()` — the composable almost certainly relies on a Vue `watch`/`watchEffect`, so the assertion must wait one microtask tick.
- The "same person refresh" test changes the `email` field while keeping the `id` identical, confirming the composable keys on identity (`id`) rather than object reference or field-level diffs.
- A fresh Pinia is installed via `setActivePinia(createPinia())` in `beforeEach`; there is no teardown in `afterEach`, so rely on the per-test Pinia instance for isolation.
