---
source: tests/unit/ui/use-axios-upload-progress.spec.ts
sha256: f1bc7f1ad13b2c3e5bbed585de96ba4f0f1fbfa4e895b87f5562b90caee48527
signature: f1bc7f1ad13b2c3e5bbed585de96ba4f0f1fbfa4e895b87f5562b90caee48527
generated_at: 2026-11-10T08:29:37.782726+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/use-axios-upload-progress.spec.ts

## Purpose

Vitest spec for the `useAxiosUploadProgress` composable. It pins down the two decisions the wrapper makes on top of the underlying toolkit: tracking is activated only when a file is actually attached, and a raw `AxiosProgressEvent` fraction is converted into the 0–100 percentage the progress bar consumes.

## Key elements

- **`describe('useAxiosUploadProgress — trackUpload')`** — two tests covering the attach/no-attach gate:
  - File attached → `send` is called once with `onUploadProgress` present in the options.
  - No file (`undefined`) → `send` is called with no arguments; options are `undefined`.
- **`describe('useAxiosUploadProgress — progress')`** — three tests covering the reactive `progress` ref:
  - Initial value is `0`; a `{ progress: 0.42 }` event yields `42`.
  - An event with no `progress` field (chunked/compressed upload) leaves the value at `0`.
  - After the tracked promise settles (resolve **or** reject), `progress.value` resets to `undefined`.

## Notes

- The composable's own doc comment describes the output as a "0–1 fraction," but the tests assert a **percentage** (0.42 → 42). The test file is the source of truth for the contract.
- After settlement the reactive becomes `undefined`, not `0` or `1`—callers must treat `undefined` as "idle."
- The `trackUpload` call is always awaited via the returned promise (or `.catch(() => {})` for the failure path) to let the composable finish its cleanup before assertions on `progress.value` run.
