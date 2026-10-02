---
source: src/infrastructure/create-sse-client.ts
sha256: a3c3daf244895e414365b656393366eaea4d7a7d527b2df8911688bb695ed748
generated_at: 2026-10-02T11:54:25.193758+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/create-sse-client.ts

## Purpose

Provides a typed, one-connection SSE client on top of the browser's `EventSource`. It opens a single persistent stream, registers one listener per declared event name, JSON-parses each incoming frame, and (when `VITE_VALIDATE_RESPONSES` is on) validates the payload against the AsyncAPI-derived Zod schema before forwarding it to the caller. It is the SSE counterpart to `orvalMutator`'s response validation.

## Key elements

- **`createSseClient(url, eventNames, callbacks?)`** — Main export. Opens an `EventSource` with `withCredentials: true`, attaches `open`/`error` handlers, and registers a per-event listener that parses and (optionally) validates each frame. Returns an `SseClient` handle.
- **`SseClientCallbacks`** (interface) — Optional `onOpen`, `onError`, and a generic `onEvent` callback whose `TEventName` parameter narrows the payload to the correct contract type.
- **`SseClient`** (interface) — The handle returned by `createSseClient`; exposes `close()` to tear down the connection.
- **`parseJsonData(rawData)`** (private) — Safe `JSON.parse`; returns `undefined` on failure so callers can distinguish a bad frame from a legitimate `null`/`0`/`false`/`""` payload.
- **`payloadSchemas` / `payloadSchemaFor(eventName)`** (private) — Lazily builds and caches one Zod schema per event name via `zod.fromJSONSchema` from the generated `SSE_EVENT_PAYLOAD_SCHEMAS` map. A build with validation off never pays for the conversion.
- **`passesContract(eventName, payload)`** (private) — Gates a parsed frame on the Zod schema when validation is enabled; logs mismatched fields via `logger.error` and drops the frame.

## Relationships

No graph neighbors are listed. The file's runtime dependencies are internal:

- **`@/infrastructure/http/validate.ts`** — `shouldValidateResponses()` controls the validation gate.
- **`@/infrastructure/utils/logger.ts`** — `logger` used for contract-failure diagnostics.
- **`@types`** — `SSE_EVENT_PAYLOAD_SCHEMAS` (generated from `asyncapi.yaml` via `npm run gen:asyncapi`), plus the `SseEventName` / `SseEventPayload` type maps that drive both the listener registration loop and the Zod validation.

## Notes

- **`undefined` is the parse-failure sentinel.** `parseJsonData` deliberately returns `undefined` (not `null`) on bad JSON so that legitimate payloads of `null`, `0`, `false`, or `""` still flow through. Callers check `payload === undefined`, not a truthiness test.
- **Validation is additive, not blocking.** When `VITE_VALIDATE_RESPONSES` is off, every well-formed JSON frame is forwarded unchanged. When on, a frame that fails the Zod schema is *dropped and logged*—there is no rejection path back to the server because the listener is fire-and-forget.
- **Schemas are whole, no `$ref`.** The generated JSON Schemas carry no references, so `zod.fromJSONSchema` can import each one independently without a registry.
- **`withCredentials: true`** is hard-coded; the SSE connection relies on the auth cookie and cannot switch to a token header.
