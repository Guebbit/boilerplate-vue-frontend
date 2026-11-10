---
source: src/infrastructure/utils/use-ambient-error.ts
sha256: b8deba729f3dce1b7a648979e0e68a846b7c39514d3802c4ccab2dc84d9201e8
signature: 03295bd6c059b14bb794e57f5039b37608af421d6bb7e91cc15fd7a11d5933d8
generated_at: 2026-11-10T03:14:10.529080+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/utils/use-ambient-error.ts

## Purpose

Composable that returns a ready-to-use error handler for **ambient** (fire-and-forget) background reads. When a background fetch rejects, the returned handler toasts the error messages instead of blocking the UI — the "ambient failure" side of the pattern described in `docs/theory/request-flow.md#blocked-vs-ambient-failures`.

## Key elements

- **`useAmbientError()`** *(only export)* — Resolves `useNotificationsStore()` and returns a `(error: unknown) => void` handler. The handler delegates to `notifyErrorMessages(addMessage, error)`, which extracts toast-worthy messages and pushes them into the notifications store.

## Relationships

- **`src/infrastructure/utils/logger.ts`** — No direct import in this file. Likely a transitive dependency reached through `notifyErrorMessages` (imported from `errors.ts`), which may log to the shared logger before or alongside surfacing toast messages.

## Notes

- Must be called inside a component's `setup` (or another composition-API context) so the notifications store can be resolved; calling it inside an event handler will fail to access the store.
- Intended usage pattern: `fetchX().catch(onAmbientError)` where `onAmbientError = useAmbientError()`.
- Companion to `useMissingRecord` (the "record is not there" half of the same failure taxonomy). Do not confuse the two — ambient errors are unexpected rejections; missing records are expected 404s.
- The parameter is typed `unknown`, not `Error`. `notifyErrorMessages` is responsible for safe extraction of messages.
