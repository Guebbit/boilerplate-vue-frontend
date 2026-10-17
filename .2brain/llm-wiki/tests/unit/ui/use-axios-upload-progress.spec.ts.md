---
source: tests/unit/ui/use-axios-upload-progress.spec.ts
sha256: f1bc7f1ad13b2c3e5bbed585de96ba4f0f1fbfa4e895b87f5562b90caee48527
generated_at: 2026-10-17T02:47:42.069400+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/use-axios-upload-progress.spec.ts

## Purpose

Unit tests for the `useAxiosUploadProgress` composable, covering its two core responsibilities: conditionally wiring an `onUploadProgress` callback into an Axios request only when a file is actually attached, and converting the raw 0–1 `AxiosProgressEvent.progress` fraction into the 0–100 integer percentage the progress bar consumes.

## Key elements

- **`describe('useAxiosUploadProgress — trackUpload')`** — verifies that `trackUpload(file, send)` passes an options object containing `onUploadProgress` when a `File` is supplied, and calls `send()` with no arguments at all when the file is `undefined`.
- **`describe('useAxiosUploadProgress — progress')`** — three tests covering the `progress` ref:
  - Starts at `0` the instant tracking begins (before any network event).
  - Maps an `AxiosProgressEvent` fraction (`0.42`) to `42`.
  - Falls back to `0` when the event object carries no `progress` field (chunked/compressed requests).
  - Resets to `undefined` (idle) after the tracked promise settles, regardless of success or rejection.

## Relationships

No graph neighbors recorded. The only external import is the production composable `@/ui/composables/use-axios-upload-progress.ts`.

## Notes

- The `progress` ref is tri-state: `undefined` (idle) → `0` (tracking started) → `0–100` (in-flight) → `undefined` (settled). Consumers should treat `undefined` as "no active upload" rather than a 0 % value.
- Tests use `vi.fn` as the `send` callable to capture the options object; they do not hit the network.
- An `eslint-disable-next-line` comment suppresses `no-unsafe-assignment` because Vitest's `expect.any()` returns `any` by design.
