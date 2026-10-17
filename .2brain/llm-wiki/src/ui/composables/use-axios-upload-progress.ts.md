---
source: src/ui/composables/use-axios-upload-progress.ts
sha256: 79d0b351d600fc3f9e5823c54d3fb5915db9e57d32ca7cd1bdcc2eb0dde84c0b
generated_at: 2026-10-17T01:56:54.292839+00:00
model: ollama:qwen3.8:27b
---

# src/ui/composables/use-axios-upload-progress.ts

## Purpose

Single composable that adapts `@guebbit/vue-toolkit`'s `useUploadProgress` to this app's Axios-based API calls, so that every file-upload form (avatar, product image, etc.) gets a consistent 0–1 progress bar without repeating the wiring.

## Key elements

- **`AxiosUploadProgress`** (interface) — the shape returned by the composable:
  - `progress: Ref<number | undefined>` — bindable 0–1 fraction (or the toolkit's idle value) for a progress bar.
  - `trackUpload(file, send)` — runs the caller's API call with upload tracking attached; tracking is automatically disabled when `file` is `undefined`.
- **`useAxiosUploadProgress()`** (exported function) — the sole public entry point. Instantiates the toolkit tracker with an Axios `onUploadProgress` handler and returns the `AxiosUploadProgress` object.

## Relationships

- **`src/infrastructure/http/index.ts`** — the Axios client configured there is the transport that callers pass (via the `send` callback) into `trackUpload`. This composable does not import the infrastructure module directly; the connection is at the call site, where an API function built on the shared Axios instance is forwarded as `send`.

## Notes

- When `event.progress` is `undefined` (chunked or compressed responses where total size is unknown), the handler reports `0` rather than `undefined` to keep the bar visually stable.
- `trackUpload` is the only place the `enabled: !!file` guard lives — callers should **not** add their own conditional; passing `undefined` for `file` is sufficient to skip tracking.
- The composable is generic in `T` (the return type of `send`) so callers get typed responses without a cast.
