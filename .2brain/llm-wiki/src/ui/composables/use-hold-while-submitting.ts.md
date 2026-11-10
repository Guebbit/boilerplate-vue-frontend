---
source: src/ui/composables/use-hold-while-submitting.ts
sha256: 2ad38d064c6ce3a35c9db0abefb8aae4e20413c66ac5f0fb5dac64b387193f3e
signature: 50a4b4c044ca87725d80b5a66e4a50d94d6f4c10abad2178db5300c214971bf6
generated_at: 2026-11-10T06:23:42.189996+00:00
model: ollama:qwen3.8:27b
---

# src/ui/composables/use-hold-while-submitting.ts

## Purpose

Prevents an optimistic-update rollback from overwriting in-progress form input. While a save is in flight the composable freezes the hydration source, so the store's "put the old record back" path cannot clobber what the user typed. A change is only applied to the form once the server confirms it (i.e., the record's content actually differs from the last held value).

## Key elements

- **`holdWhileSubmitting<T extends object>(busy, source)`** — The sole export. Returns a `ComputedRef<T | undefined>` that:
  - While `busy` is `true`, returns the last held snapshot unchanged.
  - When `busy` is `false`, reads `source()` and updates the held value only if it is structurally different from the previous one.
  - Uses a closure variable `held` (non-reactive) to remember the last accepted snapshot across evaluations.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- **Equality check uses `JSON.stringify`**, not `===` or `Object.is`. The store creates a new object identity on every patch *and* on every rollback, so reference comparison would incorrectly treat a rolled-back save as a change. The stringify comparison treats "same content, new object" as a no-op.
- **`held` is plain mutable state in a closure**, not a `ref`. It survives recomputations but is invisible to Vue's reactivity system; only the `computed`'s return value is reactive.
- **Naming mismatch:** the file follows the `use-*` file convention, but the exported symbol is `holdWhileSubmitting` (no `use` prefix). Import by the actual symbol name.
- **`@module` JSDoc tag** signals consumers should import via a namespace or the single named export; no default export is provided.
- The `source` parameter is a zero-arg function (not a `Ref`), giving callers flexibility to read from a store, a computed, or a plain getter without an extra reactive wrapper.
