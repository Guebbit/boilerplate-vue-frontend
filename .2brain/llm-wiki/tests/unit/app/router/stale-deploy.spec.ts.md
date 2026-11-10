---
source: tests/unit/app/router/stale-deploy.spec.ts
sha256: e0a9d46eb936cdd66695ca6c7f4cf54914a427dc6eb3dcb41df8c452513b30c5
signature: 8833aada2c32a883c8f8b9e1716a723dfde8399aad6f0ad7579cc1cedc950a54
generated_at: 2026-11-10T07:50:13.657107+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/router/stale-deploy.spec.ts

## Purpose

Unit tests for the stale-deploy recovery mechanism: verifies that a page whose lazily-imported route chunk 404s (because a newer deploy replaced the asset manifest) recovers with exactly one reload to the correct target, and never loops.

## Key elements

- **`makeTarget()`** — local helper that stubs the `PreloadErrorSource` interface, capturing the single `addEventListener` handler so the test can invoke it via `.fire()`.
- **`makeStorage()`** — local helper that stubs `sessionStorage` (only `getItem` / `setItem` / `removeItem`) backed by an in-memory `Map`.
- **`describe('recoverFromStaleDeploy', …)`** — the sole test block. Sets up a fresh `storage` and `navigate` mock per case, then exercises five scenarios:
  1. Returns `false` and does not navigate when no preload error was recorded.
  2. Returns `true` and calls `navigate` with the original target URL after a preload error fires.
  3. After the first recovery, a second preload error in the same session is ignored (single-retry guard).
  4. `clearStaleDeployMark(storage)` resets the guard so a *subsequent* deploy's stale chunk can retry once more.
  5. The preload-error flag is consumed even when the retry budget is already spent, preventing it from leaking into an unrelated later failure.

## Relationships

No direct imports or runtime references to `scripts/lighthouse/evaluate.ts` or `tests/cross-cutting/module-map.spec.ts` are visible in this file. The dependency-graph link is likely indirect (shared module under test, or cross-cutting structural checks).

## Notes

- The `storage` and `navigate` arguments are injected explicitly into `recoverFromStaleDeploy` rather than read from globals, which is what makes the tests hermetic.
- The sessionStorage key used by the production code is `'app:stale-deploy-reloaded'` (visible in test 5); tests do not assert the key name directly but rely on the production module reading/writing it.
- `makeTarget` stores only the *last* registered listener; registering a second handler would silently overwrite the first. This matches the single-listener contract of `registerStaleDeployRecovery`.
