# tests/unit/infrastructure/create-sse-client.spec.ts

## Purpose

Unit tests for the `createSseClient` factory (from `@/infrastructure/create-sse-client`), verifying that it correctly wires an `EventSource` to named AsyncAPI SSE events and lifecycle callbacks without requiring a real server.

## Key elements

- **`EventSourceMock`** — Local helper class that stores listeners by event name and exposes `emit()` to trigger them, plus a `close` spy. Stands in for the browser `EventSource`.
- **`beforeEach` setup** — Recreates the shared `source` mock, stubs the global `EventSource` with a constructor that *returns* the mock instance, and calls `vi.resetModules()` so the next dynamic import re-evaluates the module under test.
- **`describe('createSseClient')`** — Six `it` blocks covering:
  - Routing a named SSE event's JSON payload to `onEvent(name, payload)`.
  - Firing `onOpen` on the `open` event.
  - Firing `onError` with the raw error `Event`.
  - Calling `close()` on the returned handle delegates to `EventSource.close()`.
  - Silently dropping frames whose `data` is not valid JSON.
  - Dispatching three distinct observability event types in order to the same `onEvent` callback.

## Relationships

No graph neighbors are recorded for this file. It imports only Vitest and the module under test via dynamic `import()`.

## Notes

- Every test uses `import('@/infrastructure/create-sse-client')` inside the test body (not a top-level import) combined with `vi.resetModules()` in `beforeEach`. This ensures each test gets a fresh module evaluation and a fresh `EventSource` stub — a deliberate pattern to avoid shared-state leakage between tests.
- The `EventSource` global stub is a class whose *constructor* returns the shared `source` mock rather than calling it. An `eslint-disable` comment documents this intentionally unusual shape.
- The `onEvent` callback receives the **parsed** payload (not the raw `MessageEvent`), which is the contract this test suite pins down for the implementation.
