# tests/unit/infrastructure/composables/use-upload-progress.spec.ts

## Purpose

Unit tests for the **axios binding** around the toolkit's upload-progress state machine (`use-upload-progress.ts`). The state machine is tested in the toolkit itself; this spec verifies only what this app adds on top: the `onUploadProgress` callback shape, the 0–1 → percentage conversion, the "no file ⇒ no tracking" guard, and the idle (undefined) vs. in-progress (0) distinction that the UI depends on.

## Key elements

- **`progressCallbackOf(options)`** — test helper that extracts `onUploadProgress` from an `AxiosRequestConfig`, letting tests drive the callback without a real HTTP call.
- **`reportProgress(options, event)`** — fires that extracted callback with a partial `AxiosProgressEvent`.
- **`fileOfSize(bytes, type?)`** — constructs a minimal `File` of a given byte length (contents irrelevant) so tests can exercise the "file present" path without allocating real image data.
- **`describe('useUploadProgress')`** block — eight `it` cases covering:
  - Initial state is `undefined` (idle), not `0`.
  - No file → `send` called with no argument at all (no axios options).
  - File present → `onUploadProgress` is a `Function`.
  - `progress: 0.42` → `uploadProgress.value === 42`.
  - `progress` absent (chunked/compressed) → falls back to `0`.
  - Resolved result is passed through unchanged.
  - Resolved call resets state to `undefined` (not `0`).
  - Rejected call resets state to `undefined` **and** re-throws the original error.

## Relationships

- Imports `useUploadProgress` from `@/infrastructure/composables/use-upload-progress.ts` (the unit under test).
- Uses only vitest built-ins (`describe`, `it`, `expect`, `vi`) and the `axios` type package for `AxiosProgressEvent` / `AxiosRequestConfig` typings.
- No other graph neighbors.

## Notes

- The transport (`send`) is always replaced with a `vi.fn()` or inline function; no real network or axios adapter is involved.
- `afterEach` calls `vi.restoreAllMocks()` — safe to rely on, but individual tests don't use `vi.spyOn`, so the restore is largely defensive.
- The idle-vs-zero distinction (`undefined` vs `0`) is load-bearing for the UI: `FormImageUpload` renders the bar for `0` but hides it for `undefined`. Tests assert both directions explicitly.
- The "no file" test asserts `send` was called with **no argument** (`toHaveBeenCalledWith()`), not `toHaveBeenCalledWith(undefined)` — both read the same at runtime, but the assertion documents the contract.
