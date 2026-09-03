# src/infrastructure/create-sse-client.ts

## Purpose

Thin wrapper around the browser's `EventSource` that opens a single persistent SSE connection, registers one typed listener per event name, JSON-parses each incoming frame, and silently drops frames that fail to parse. It exists to give callers a small, typed surface (`SseClientCallbacks`) over the raw `EventSource` API without repeating the parse-and-filter boilerplate.

## Key elements

- **`SseClientCallbacks`** (exported interface) – Optional `onOpen`, `onError`, and `onEvent` handlers. `onEvent` is generic over `TEventName extends SseEventName` so the payload type is narrowed per event.
- **`SseClient`** (exported interface) – Handle returned to callers; exposes a single `close()` method.
- **`parseJsonData`** (module-private) – Wraps `JSON.parse` in try/catch; returns `undefined` on malformed JSON so the caller can skip the frame.
- **`createSseClient`** (exported) – Factory. Accepts a URL, a readonly array of `SseEventName`s, and optional callbacks. Creates an `EventSource` with `withCredentials: true`, wires up `open`/`error` listeners, then loops over `eventNames` registering one `addEventListener` per name. Returns an `SseClient` handle.

## Relationships

No graph neighbors. The module only imports the `SseEventName` and `SseEventPayload` type aliases from the `@types` package; it exports its own interfaces and the `createSseClient` factory for upstream consumers.

## Notes

- **Failure sentinel is `undefined`, not `null`.** `parseJsonData` returns `undefined` when JSON is invalid, and the caller checks `=== undefined`. This means legitimate payloads of `null`, `0`, `false`, or `""` are still forwarded to `onEvent`.
- **One listener per event name.** The code deliberately calls `addEventListener` inside a `for` loop rather than using a single `onmessage`, so the browser dispatches each typed event individually (matching the `event:` field in SSE frames).
- **`withCredentials: true`** is set unconditionally; the connection relies on the auth cookie rather than a custom header.
- The single `eslint-disable-next-line no-restricted-syntax` on `JSON.parse` is intentional — there is no non-throwing JSON parser, and a bad frame is dropped, not a crash.
