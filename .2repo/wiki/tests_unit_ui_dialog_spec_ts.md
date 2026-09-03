# tests/unit/ui/dialog.spec.ts

## Purpose

Unit tests for the `useDialogStore` Pinia store, verifying its queue-based confirm-dialog contract: questions are queued in order, each resolved by exactly one `answer()` call, and dismissal is equivalent to `false`. The file exists to pin down this store-level API without involving any component rendering.

## Key elements

- **`beforeEach` hook** – Creates a fresh Pinia instance per test via `setActivePinia(createPinia())`.
- **`describe('useDialogStore')`** – Block containing five `it` cases:
  - *queues the question for the host to render* – Asserts `store.confirm(opts)` appends to `store.queue` and preserves `message`/`color`.
  - *resolves true when the viewer accepts* – Confirms that `answer(true)` resolves the pending promise with `true`.
  - *resolves false when the viewer declines or dismisses* – Confirms `answer(false)` resolves with `false`.
  - *answers questions in the order they were asked, one click each* – Verifies FIFO: first `answer` resolves only the first promise; the second remains in the queue until the next `answer`.
  - *ignores an answer with nothing asked* – Ensures `answer()` on an empty queue is a safe no-op (does not throw).

## Relationships

- **`@/ui/dialog.ts`** – The SUT; provides `useDialogStore` (exposes `confirm`, `answer`, `queue`).
- **`pinia`** – Supplies `createPinia` / `setActivePinia` for store instantiation in tests.
- **`vitest`** – Test runner (`describe`, `it`, `expect`, `beforeEach`).

## Notes

- Tests are written against the store's **public API** (`confirm`, `answer`, `queue`); no Vuetify component or DOM is exercised.
- The `color` field is passed through opaquely—tests only assert it round-trips, not its semantic meaning.
- Each test that produces a promise uses `return expect(promise).resolves…` or an explicit `Promise.all` chain; forgetting the `return` would cause the assertion to run after the test has already passed.
