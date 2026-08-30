# src/infrastructure/create-sse-client.ts

## Purpose

Thin, framework-agnostic wrapper around the browser's `EventSource`. It opens a single SSE connection, registers one listener per typed event name, JSON-parses each frame, and silently drops frames that fail to parse. Exists so callers get a small, typed API without managing `EventSource` lifecycle or payload decoding themselves.

## Key elements

- **`SseClientCallbacks`** (interface) — Optional `onOpen`, `onError`, and a generic `onEvent` handler whose payload is narrowed by the event name via `SseEventPayload<TEventName>`.
- **`SseClient`** (interface) — Handle returned to callers; exposes a single `close()` method.
- **`createSseClient(url, eventNames, callbacks?)`** (exported function) — Constructs an `EventSource` with `withCredentials: true`, wires up `open`/`error` listeners, then iterates `eventNames` to attach a per-name listener. Each listener runs the frame through `parseJsonData` and forwards to `callbacks.onEvent`. Returns an `SseClient` handle.
- **`parseJsonData(rawData)`** (internal helper) — Attempts `JSON.parse`; returns `undefined` on failure so the caller can skip the frame. All other falsy values (`null`, `0`, `false`, `""`) pass through as legitimate payloads.

## Relationships

- **`src/types/realtime.ts`** — Provides the `SseEventName` and `SseEventPayload` types imported from the `@types` alias. The generic `onEvent` signature and the per-frame payload cast both depend on these contracts.
- **`src/modules/realtime/store.ts`** — Consumes `createSseClient` (and its `SseClientCallbacks`) to subscribe to typed SSE events and fold them into the realtime store's state.
- **`docs/api/asyncapi-workflow.md`** — Documents the server-side SSE event schema that `SseEventName` / `SseEventPayload` mirror; useful as a reference when interpreting event payloads received through this client.

## Notes

- `withCredentials: true` is hardcoded; the connection is expected to rely on an auth cookie rather than an `Authorization` header.
- The `undefined` return from `parseJsonData` is a deliberate failure sentinel. Do not replace it with `null` — `null` is a valid payload.
- `JSON.parse` is wrapped in a `try/catch` with an eslint-disable for `no-restricted-syntax`; a malformed frame is dropped, never re-thrown.
- One `addEventListener` call is made **per event name**, so each SSE event type gets its own dispatch path rather than a single `"message"` listener.
