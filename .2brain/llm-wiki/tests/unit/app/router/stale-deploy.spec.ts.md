---
source: tests/unit/app/router/stale-deploy.spec.ts
sha256: e0a9d46eb936cdd66695ca6c7f4cf54914a427dc6eb3dcb41df8c452513b30c5
generated_at: 2026-10-17T02:32:45.467174+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/router/stale-deploy.spec.ts

## Purpose

Unit tests for the stale-deploy recovery mechanism in the app router. They verify that when a lazily-imported route chunk 404s because a newer deploy replaced the asset manifest, the browser recovers with exactly one reload to the original target and never retries a second time within the same session.

## Key elements

- **`makeTarget()`** — Factory returning a stub `PreloadErrorSource` plus a `fire()` helper. Captures the single event listener registered via `addEventListener` so tests can simulate a preload-error dispatch on demand.
- **`makeStorage()`** — Factory returning a minimal in-memory `sessionStorage` stub (getItem / setItem / removeItem backed by a `Map`), matching the two members `recoverFromStaleDeploy` actually reads and writes.
- **`describe('recoverFromStaleDeploy', …)`** — The test suite. Each `it` block exercises one behavioral contract:
  - No-op (returns `false`, no navigation) when the last failure was not a Vite preload error.
  - Reloads to the failed navigation's own target after a preload error is fired.
  - Marks the reload as spent so a second failure in the same tab does not loop.
  - Allows a retry again after `clearStaleDeployMark` signals a successful navigation landed.
  - Consumes the preload-error flag even when the retry budget is already exhausted, preventing the flag from leaking into an unrelated later failure.

## Relationships

No graph-neighbor files are recorded. The only production dependency is the module under test, `@/app/router/stale-deploy` (imports `registerStaleDeployRecovery`, `recoverFromStaleDeploy`, `clearStaleDeployMark`, and the `PreloadErrorSource` type).

## Notes

- Tests are fully hermetic: the real `sessionStorage`, `window`, and router are never touched. Navigation is a plain `vi.fn()` passed in as an argument, and the `PreloadErrorSource` is a hand-rolled stub rather than a DOM event target.
- The storage stub deliberately omits `length`, `key()`, and iteration — only the three methods the SUT uses are implemented. Adding a real `sessionStorage` mock here would be overkill and is intentionally avoided.
- The "consumes the flag even when retry was already spent" test seeds `storage` with the *reloaded* mark (`'1'`) to simulate a prior successful retry, ensuring the flag is cleared rather than lingering.
