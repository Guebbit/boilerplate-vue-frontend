# tests/unit/infrastructure/stores/dialog.spec.ts

## Purpose

Unit tests for the `useDialogStore` Pinia store. They lock down the store's contract: `confirm()` enqueues a question whose resolution is delivered to exactly one caller, `answer()` resolves the oldest pending question (FIFO), a dismissal counts as `false`, and answering an empty queue is a safe no-op.

## Key elements

- **`beforeEach`** — creates a fresh `Pinia` instance and sets it active so each test runs against an isolated store.
- **"queues the question for the host to render"** — asserts `store.queue` gains one entry with the expected `message` and `color` after calling `confirm()`.
- **"resolves true when the viewer accepts"** — verifies the promise returned by `confirm()` settles to `true` after `answer(true)`.
- **"resolves false when the viewer declines or dismisses"** — same, but with `answer(false)`.
- **"answers questions in the order they were asked, one click each"** — fires two `confirm()` calls, answers once, asserts the second is still queued, then answers again and checks both promises resolved in order (`[false, true]`) and the queue is empty.
- **"ignores an answer with nothing asked"** — confirms `answer(true)` on an empty queue does not throw.

## Relationships

The only runtime dependency is the module under test: `@/infrastructure/stores/dialog.ts` (`useDialogStore`). No other project files are imported; test framework imports are limited to `vitest` and `pinia`.

## Notes

- **FIFO is the core invariant.** Each `answer()` call resolves exactly one pending `confirm()` promise in insertion order. There is no way to "cancel" a specific queued question by id.
- **Dismissal ≡ decline.** The store exposes only `answer(true | false)`; a user closing the dialog without choosing is modeled as `false`, not a separate signal.
- **No UI under test.** The doc comment in the source clarifies the host component is a thin Vuetify wrapper; the contract lives entirely in the store, so these tests exercise pure state logic without rendering.
- **`void` vs. captured return.** Tests that don't need the promise use `void store.confirm(...)`; tests that assert on resolution capture the promise and `return` it (or wrap in `Promise.all`) so Vitest awaits it.
