---
source: tests/unit/ui/dialog.spec.ts
sha256: 51ce9fec618625056dcbcca9d5bc0cee5a9f0a8c628597a7b2522c3bdd906835
signature: 51ce9fec618625056dcbcca9d5bc0cee5a9f0a8c628597a7b2522c3bdd906835
generated_at: 2026-11-10T08:25:01.176640+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/dialog.spec.ts

## Purpose

Unit test suite for the `useDialogStore` Pinia store. It verifies the store's core contract: `confirm` enqueues a question and returns a Promise, and `answer` resolves the next queued question with the viewer's boolean decision — in strict FIFO order, one click per question.

## Key elements

- **`beforeEach`** — resets to a fresh Pinia instance (`setActivePinia(createPinia())`) before each test.
- **`describe('useDialogStore')`** — top-level suite containing five `it` blocks:
  - *queues the question* — asserts `store.confirm({ message, color })` pushes a matching entry onto `store.queue`.
  - *resolves true / resolves false* — asserts the Promise returned by `confirm` settles with `true` or `false` respectively after `store.answer(...)`.
  - *FIFO ordering* — enqueues two questions, answers them sequentially, and verifies each Promise resolves with its own answer and the queue drains to zero.
  - *ignores answer with nothing asked* — asserts `store.answer(true)` on an empty queue does not throw.

## Relationships

No graph neighbors are defined for this file. It imports `useDialogStore` from `@/ui/dialog.ts`, `vitest` for the test API, and `pinia` for store isolation, but none of these are tracked as graph edges.

## Notes

- The `// eslint-disable-next-line @typescript-eslint/no-floating-promises` on the first test is intentional: that test only checks queue state and never awaits the Promise.
- The store is designed so a dismissal (closing the dialog) is equivalent to answering `false`; there is no `undefined`/`null` resolution path.
- Tests use `return expect(answer).resolves.toBe(...)` rather than `await` to keep Vitest's native async assertion handling.
