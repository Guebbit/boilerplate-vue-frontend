---
source: tests/unit/kernel/inbox-notices.spec.ts
sha256: 8e7098a36b27b89bb1f7a94aa0fffefd8f402a86c4c0f7cc29d0f679daea9162
signature: 4a741a8cf6cd48d076e588983e399f9028c33a4a545e1d0af891bc492f9f6ef9
generated_at: 2026-11-10T08:09:30.038676+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/kernel/inbox-notices.spec.ts

## Purpose

Unit tests for the `@/kernel/inbox-notices.ts` module. Verifies that `useInboxNotices()` surfaces only messages stamped by the inbox (via `meta.source: 'inbox'`) and that the notice registry (`registerNotices` / `noticeOf`) answers only the codes actually registered, with no prototype-pollution leaks.

## Key elements

- **`put(id, code, readAt?)`** – Local helper that inserts one row into the Pinia `useNotificationsStore()` the same way the inbox store would (persistent, `meta.source: 'inbox'`).
- **`beforeEach`** – Resets Pinia to a fresh instance for every test.
- **`describe('reading the bell from the kernel')`** – Asserts `useInboxNotices()` filters out messages whose `meta.source` is anything other than `'inbox'`.
- **`describe('the notice registry')`** – Asserts `noticeOf` returns the registered entry for a known code, and that `toBeUndefined()` passes for both an unregistered code and a prototype name like `'toString'`.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- The test deliberately does **not** import the inbox store. It simulates inbox writes by calling `useNotificationsStore().addMessage` directly, keeping the dependency graph flat (as stated in the module docblock).
- The `'toString'` assertion in the registry test is an intentional prototype-pollution guard on `noticeOf`.
- `useInboxNotices()` is a ref/computed; the test wraps its read in `effectScope().run(...)` to avoid requiring a component instance.
