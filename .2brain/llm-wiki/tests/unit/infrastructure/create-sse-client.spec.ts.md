---
source: tests/unit/infrastructure/create-sse-client.spec.ts
sha256: a800c09fc277397283d98fe9c6354d0f23567ae0fce6cb4ed8741bfa40a7be19
generated_at: 2026-10-17T02:34:32.885962+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/create-sse-client.spec.ts

## Purpose

Unit tests for the `createSseClient` infrastructure module. Verifies that the SSE client correctly routes named AsyncAPI events to caller callbacks, exposes lifecycle hooks (`onOpen`, `onError`, `close`), handles malformed frames, enforces AsyncAPI contract validation (gated behind `VITE_VALIDATE_RESPONSES`), and reconnects with exponential backoff when the browser permanently closes a source.

## Key elements

- **`EventSourceMock`** — local class that records listeners per event name, exposes `emit()` to fire them, and a `close` spy. Stands in for the browser's `EventSource`.
- **`source` (module-level `let`)** — always points at the most recently constructed mock; the stubbed global `EventSource` constructor reassigns it on each instantiation.
- **`closeForGood()`** — helper that sets `source.readyState = 2` (CLOSED) and emits an `'error'` event, simulating the browser giving up on the connection (as opposed to its own retry loop where `readyState` stays 0/1).
- **`beforeEach` block** — creates a fresh `EventSourceMock`, stubs global `EventSource` with a class whose constructor returns the mock, and calls `vi.resetModules()` so every test gets a clean module graph.
- **Main `describe('createSseClient')`** — tests: named-event routing with JSON parsing, `onOpen` / `onError` callbacks, `client.close()` delegating to the source, silent skip of invalid-JSON frames, and independent dispatch of all three observability event types.
- **`describe('with contract validation on')`** — stubs `VITE_VALIDATE_RESPONSES=true`; verifies a conformant frame is forwarded, a non-conformant frame is dropped with a `logger.error` naming the offending field, and in `PROD` mode the frame is logged *and* forwarded (mirroring REST behavior).
- **`describe('when the browser gives up on the connection')`** — uses fake timers to assert exponential backoff (1 s → 2 s → 4 s → capped), that the wait counter resets on a successful `open`, and that errors on a source still in the browser's retry phase trigger no reconnection.

## Relationships

No graph neighbors are listed for this file. The tests dynamically import `@/infrastructure/create-sse-client` (the module under test) and `@/infrastructure/utils/logger` (spied on in contract-validation cases), but those edges are not reflected in the dependency graph.

## Notes

- Every test body uses a dynamic `import()` inside an `it` callback rather than a top-level import, paired with `vi.resetModules()` in `beforeEach`. This is deliberate: it forces a fresh module evaluation so module-level state (e.g., the backoff counter) doesn't leak between tests.
- The `EventSource` stub uses `class { constructor() { …; return source; } }` — the `return` in the constructor replaces the `this` binding, so `new EventSource()` yields the mock directly. An eslint-disable comment documents why the class body is not "extraneous."
- Contract-validation tests require `vi.unstubAllEnvs()` in `afterEach` to avoid contaminating sibling tests.
- The reconnection suite toggles `vi.useFakeTimers()` / `vi.useRealTimers()` per test; forgetting the `afterEach` restore would break any timer-sensitive test that follows.
- The file is truncated in the source snapshot; the final test (starting with "ope…") is incomplete.
