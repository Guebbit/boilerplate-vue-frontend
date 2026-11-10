---
source: tests/unit/infrastructure/create-sse-client.spec.ts
sha256: c89343e48310b00e2074929de7cc660808c5e8df890740d61b44f354d17a2872
signature: 1d30d7df7b753bb7e8c599fa6f164ef3ce3842a84d89e08f8afe8ddef8d25f4b
generated_at: 2026-11-10T07:54:56.724989+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/create-sse-client.spec.ts

## Purpose

Unit tests for `createSseClient` (from `@/infrastructure/create-sse-client`). Verifies that the SSE client correctly routes named AsyncAPI events to callbacks, handles lifecycle events, tolerates malformed frames, enforces contract validation, and reconnects with exponential backoff when the browser gives up on a connection.

## Key elements

- **`EventSourceMock`** — A lightweight stand-in for the browser `EventSource` API. Tracks registered listeners, exposes `emit()` to simulate server-sent events, and exposes `close` as a `vi.fn()` so tests can assert teardown.
- **`source` (module-level `let`)** — References the most recently constructed mock. Because the global `EventSource` constructor is stubbed to return a fresh `EventSourceMock` on every call, tests always operate on the *current* connection.
- **`closeForGood()`** — Helper that sets `readyState = 2` and fires an `error` event, mimicking the browser's final connection-closed signal (as opposed to a transient retry).
- **`describe('createSseClient')`** — Top-level suite. Uses dynamic `import()` of the module under test inside each `it` so that `vi.resetModules()` in `beforeEach` guarantees a clean module graph per test.
  - Tests event routing (single and multi-event), `onOpen`/`onError` callbacks, `client.close()` delegation, and silent dropping of non-JSON frames.
- **`describe('with contract validation on')`** — Stubs `VITE_VALIDATE_RESPONSES=true`. Confirms valid frames pass through, invalid frames are dropped with a field-level `logger.error`, and that production + `VITE_CONTRACT_THROW` vs. production-without-throw behave differently (drop vs. log-and-forward).
- **`describe('when the browser gives up on the connection')`** — Uses `vi.useFakeTimers()`. Asserts exponential backoff delays (1 s → 2 s → 4 s) between reconnections and that the delay sequence resets after a successful `open`.

## Relationships

No graph neighbors are recorded for this file. It imports the module under test (`@/infrastructure/create-sse-client`) and, in the contract-validation suite, `@/infrastructure/utils/logger` — both via dynamic `import()` at test-execution time rather than at the top level.

## Notes

- **Dynamic imports are intentional.** Every `it` block re-imports the SUT so that `vi.resetModules()` in `beforeEach` forces a fresh module evaluation. Static top-level imports would defeat this.
- **`EventSource` stub returns the mock instance, not a subclass.** The constructor body executes `source = new EventSourceMock(); return source;` — an assignment-based return, not prototype inheritance. This is why the eslint-disable for `no-extraneous-class` is needed.
- **`readyState` values:** The mock starts at `0` (CONNECTING). `closeForGood` sets it to `2` (CLOSED), which is the signal the client interprets as "the browser will not retry — we must."
- **Contract-validation tests mutate environment via `vi.stubEnv`.** They do *not* rely on a `.env` file; `VITE_VALIDATE_RESPONSES`, `PROD`, and `VITE_CONTRACT_THROW` are set inline per test.
- **Truncated file.** The last test in the reconnection suite is cut off mid-expression; the full file likely contains additional backoff-reset assertions.
