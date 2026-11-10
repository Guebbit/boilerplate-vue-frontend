---
source: src/ui/composables/use-axios-upload-progress.ts
sha256: 79d0b351d600fc3f9e5823c54d3fb5915db9e57d32ca7cd1bdcc2eb0dde84c0b
signature: 1e4f6ea47a988cef515df8fa732eae882a884f7d29e725266e701bfa5387bc91
generated_at: 2026-11-10T06:23:02.065106+00:00
model: ollama:qwen3.8:27b
---

# src/ui/composables/use-axios-upload-progress.ts

## Purpose

Single source of truth for wiring `@guebbit/vue-toolkit`'s upload-progress tracker to this app's Axios client. Every form that submits a picked file (avatar, product image) used to repeat this glue inline; this composable centralises it so the progress bar and the conditional tracking logic live in one place.

## Key elements

- **`AxiosUploadProgress`** (interface) — the contract the composable returns: a `progress` ref (0–1, or the toolkit's idle value) and a `trackUpload` method.
- **`useAxiosUploadProgress()`** — calls `useToolkitUploadProgress<AxiosRequestConfig>` from `@guebbit/vue-toolkit`, maps `AxiosProgressEvent.progress` into the tracker (falling back to `0` when the total size is unknown, e.g. chunked/compressed uploads), and exposes `trackUpload` which delegates to the toolkit's `track` with `{ enabled: !!file }`.
- **`trackUpload<T>(file, send)`** — runs the caller-supplied `send` (an Axios request) with progress tracking attached, but only when `file` is present. Resolves with whatever `send` resolves to.

## Relationships

- **`src/infrastructure/http/index.ts`** — the composable itself does not import this module, but its `trackUpload` contract is built around the Axios request configuration that the infrastructure http client produces. Callers pass a `send` callback that invokes the Axios client exported from that module; the `AxiosRequestConfig` type flows from Axios through this composable into the http layer.

## Notes

- `event.progress` can be `undefined` (chunked or compressed transfers where total size is unknown); the composable coerces it to `0` so the UI bar stays still instead of flickering.
- `trackUpload` is a no-op for progress purposes when `file` is `undefined` — the underlying request still fires, the bar just doesn't animate.
- The `send` callback receives the tracked `AxiosRequestConfig` (with `onUploadProgress` attached) as its single argument; callers must forward it to the Axios call rather than building their own config.
