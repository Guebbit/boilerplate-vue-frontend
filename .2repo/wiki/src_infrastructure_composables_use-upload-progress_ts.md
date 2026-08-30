# src/infrastructure/composables/use-upload-progress.ts

## Purpose
Binds the `@guebbit/vue-toolkit` upload-progress state machine to axios, giving the five file-upload forms a single shared implementation of progress-bar plumbing instead of duplicating the binding in each form.

## Key elements
- **`useUploadProgress()`** (exported) — Returns `{ uploadProgress, trackUpload }`.
  - `uploadProgress` — reactive ref; `undefined` when idle, `0–100` while a tracked request is in flight.
  - `trackUpload<T>(file, send)` — Wraps an API call so progress is tracked. Passes `undefined` options to `send` when `file` is absent (disables tracking entirely, avoiding a spurious 100% flash on byte-sized payloads). Returns the promise from `send` untouched.
- Internally adapts axios's `AxiosProgressEvent` (0–1 fraction, possibly `undefined` for chunked/compressed bodies) to the toolkit's `onProgress` callback, defaulting to `0` when the fraction is missing.

## Relationships
No other project files import or are imported by this module (no graph neighbors). It is a leaf composable consumed directly by the upload forms.

## Notes
- `event.progress` can be `undefined` (chunked or compressed upload where total size is unknown); the code coerces it to `0` so the bar stays still rather than jittering.
- Passing `file: undefined` to `trackUpload` is the intended "no upload" path — the toolkit's `enabled: false` flag means no progress is reported at all. Do not pass a `File` of zero bytes just to skip tracking; pass `undefined`.
- The composable is intentionally thin: all state-machine logic (appear on start, reset on resolve/reject) lives in `@guebbit/vue-toolkit`. Bugs in progress behavior should be investigated there first.
