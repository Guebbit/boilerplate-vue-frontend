---
source: src/infrastructure/utils/use-stale-record.ts
sha256: 9e116d204d57f87cd766be275339f4aa1edc9c2dbbdb05d447b31c68788d488e
generated_at: 2026-10-02T12:07:06.790699+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/utils/use-stale-record.ts

## Purpose

Vue composable that handles a **412 Precondition Failed** response on an edit-form save. When the server rejects the write because the record changed underneath the user, it displays an inline warning (not an error), exposes a "reload latest" action, and deliberately never re-sends the stale payload on its own. It is the client-side half of the conditional-write (`ETag` / `If-Match`) flow.

## Key elements

- **`UseStaleRecordReturn`** – interface for everything the composable returns:
  - `isStale: Ref<boolean>` – reactive flag that drives the "reload latest" UI.
  - `handle(error): boolean` – call first in a save's `.catch`; returns `true` only when the error is a 412 (and shows the warning), so the caller can short-circuit.
  - `reloadLatest(): Promise<unknown>` – clears the stale state and delegates to the caller-supplied `reload` (expected to re-fetch the record *and* refresh the `ETag`).
  - `clear(): void` – resets `isStale` without re-fetching; used before the next save attempt.
- **`useStaleRecord(blocking, reload)`** – the composable. Accepts a `Pick<UseBlockingErrorReturn, 'warn' | 'clear'>` (the form's existing error-slot) and a `reload` thunk; returns a `UseStaleRecordReturn`.

## Relationships

- **`use-blocking-error.ts`** – the composable consumes a `warn`/`clear` pair from the form's `useBlockingError()` instance to display and dismiss the stale-record message. Type-only import of `UseBlockingErrorReturn`.
- **`errors.ts`** – imports `isPreconditionFailed` to identify 412 rejections.
- **`@/i18n`** – imports `translate` for the `generic.error-stale-record` message key.

## Notes

- `handle` is intentionally **not** a generic error handler; it must be the *first* call in the `.catch` chain. Returning `false` means "not my error, keep going."
- `reloadLatest` does **not** re-issue the save. After the user reloads, the form re-enters its normal save flow with a fresh `ETag`.
- The `blocking` parameter is a structural `Pick`, not a full `UseBlockingErrorReturn` — the composable only needs the message slot, not the error-state management.
- The doc comment references `docs/theory/request-flow.md#conditional-writes` and the transport's `etag.ts` for the server-side half of the contract.
