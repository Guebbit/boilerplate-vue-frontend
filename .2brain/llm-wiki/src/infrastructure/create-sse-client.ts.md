---
source: src/infrastructure/create-sse-client.ts
sha256: c0531fc21ccb554a94bf7c733433ee888bb8c039c2da34a60ab5349efdc3516e
generated_at: 2026-10-17T00:08:54.755822+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/create-sse-client.ts

## Purpose

Provides a typed, auto-reconnecting Server-Sent Events client that wraps the browser's `EventSource`. It JSON-parses each frame, optionally validates payloads against AsyncAPI-derived Zod schemas (behind the same `VITE_VALIDATE_RESPONSES` gate as REST), and transparently reopens the stream after the browser gives up on a connection (e.g. 401/429/503 on reconnect).

## Key elements

- **`SseClientCallbacks<TEventName>`** — Callback interface (`onOpen`, `onError`, `onEvent`). The generic `TEventName` narrows the payload type on `onEvent`.
- **`SseClient`** — Handle with a single `close()` method that tears down the source and cancels any pending reopen.
- **`createSseClient(url, eventNames, callbacks)`** — Main export. Opens an `EventSource` with `withCredentials: true`, registers one `addEventListener` per event name, and returns the `SseClient` handle.
- **`parseJsonData`** — Safe `JSON.parse`; returns `undefined` on malformed input so callers can skip bad frames.
- **`payloadSchemas` / `payloadSchemaFor`** — Lazy, cached `Map<SseEventName, ZodType>`. Schemas are built on first use via `zod.fromJSONSchema` from the generated `SSE_EVENT_PAYLOAD_SCHEMAS`.
- **`passesContract`** — Validates a parsed payload against its event's schema. In production (report-only) mismatches are logged but forwarded; in dev/test they are dropped.
- **`REOPEN_DELAYS_MS`** — Backoff schedule (1 s → 30 s, capped) for reopening after the browser closes the source permanently.

## Relationships

No graph-neighbor files are documented for this module. It imports:

- `SSE_EVENT_PAYLOAD_SCHEMAS`, `SseEventName`, `SseEventPayload` from `@types` (generated from `asyncapi.yaml`).
- `isReportOnly`, `shouldValidateResponses` from `@/infrastructure/http/validate.ts` (shared REST/SSE validation gate).
- `logger` from `@/infrastructure/utils/logger.ts`.

## Notes

- `undefined` is the sentinel for "JSON parse failed"; `null`, `0`, `false`, `""` are all legitimate payloads and must not be dropped.
- Reconnection logic only triggers when `readyState === 2` (CLOSED). While the browser is still in CONNECTING state it retries on its own—this module does not interfere.
- `withCredentials: true` is unconditional; the backend authenticates SSE via the session cookie, so removing it will break auth.
- Contract validation is **additive-tolerant in production**: a new optional field on the backend will not silence a deployed frontend (mirrors the REST `orvalMutator` behavior).
- Zod schemas are built lazily per event name, so a build with validation off never pays the JSON-Schema→Zod conversion cost.
