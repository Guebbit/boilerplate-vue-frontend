---
source: src/infrastructure/utils/use-stale-record.ts
sha256: 9e116d204d57f87cd766be275339f4aa1edc9c2dbbdb05d447b31c68788d488e
signature: 6feb64e8a2cc7b00e61e9635cb16133c6ae8eea990982a98870c4c78373e4c0d
generated_at: 2026-11-10T03:15:47.835004+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/utils/use-stale-record.ts

## Purpose

A Vue composable that centralises 412 (Precondition Failed) handling for a single edit form. When a save is rejected because the record changed on the server, it flags the form as stale, surfaces a non-fatal warning, and lets the user explicitly reload the latest copy — it never auto-resends the conflicting edit.

## Key elements

- **`UseStaleRecordReturn`** — interface describing the composable's public surface: `isStale` (reactive flag), `handle` (detect 412 → show warning → return `true` to short-circuit the caller's `.catch`), `reloadLatest` (clear flag + re-fetch record), `clear` (reset flag before the next save attempt).
- **`useStaleRecord(blocking, reload)`** — the composable factory. Takes a subset of `useBlockingError` (`warn`/`clear`) and a `reload` callback that re-reads the record (refreshing the ETag). Returns the `UseStaleRecordReturn` object.

## Relationships

- **`logger.ts`** — listed as a graph neighbor but not imported or directly referenced in this file's source; no interaction to document here.

## Notes

- `handle` is designed to be called *first* inside a save's `.catch`. Returning `true` signals the caller to stop; returning `false` means the error is not a 412 and normal error handling proceeds.
- The warning uses the i18n key `generic.error-stale-record` — it is intentionally a *warning*, not an error, because the request itself was well-formed; only the server copy moved.
- `reloadLatest` clears both the `isStale` flag and the blocking-error message before invoking `reload`, so the UI resets in one step.
- The `reload` callback is opaque to this composable — the caller is responsible for it actually re-fetching the record and updating the local ETag for the next `If-Match` header.
