---
source: src/infrastructure/create-sse-client.ts
sha256: 9a634830446b47fa0f703c265b9ded7b78a1b039aea08cd3cae94ede02f88d4d
signature: 667352241617f15308d4537c89b82f02264edd6e0798c600eb3b2965db2505cc
generated_at: 2026-11-10T03:02:13.085755+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/create-sse-client.ts

## Purpose

A thin, typed wrapper around the browser's `EventSource` that JSON-parses each SSE frame, optionally validates the payload against its AsyncAPI-derived Zod schema, and reconnects with backoff when the browser gives up on a connection (401/429/503 on reconnect). It mirrors the REST response-validation gate (`VITE_VALIDATE_RESPONSES`) so SSE streams get the same contract enforcement without a separate mechanism.

## Key elements

- **`createSseClient<TEventName>(url, eventNames, callbacks)`** — Opens a persistent SSE connection (with credentials for cookie auth), registers one `addEventListener` per typed event name, and returns an `SseClient` handle.
- **`SseClientCallbacks<TEventName>`** — Interface for `onOpen`, `onError`, and the typed `onEvent(eventName, payload)` handler.
- **`SseClient`** — Handle returned to the caller; its `close()` tears down the connection and cancels any pending reopen.
- **`passesContract(eventName, payload)`** — Validates a parsed frame against the cached Zod schema for that event. Returns `true` (forward) or `false` (drop) depending on `isReportOnly()`: dev/test drops mismatches; production logs but forwards them.
- **`payloadSchemaFor(eventName)`** — Lazily builds and caches a Zod schema per event name via `zod.fromJSONSchema` from `SSE_EVENT_PAYLOAD_SCHEMAS`.
- **`REOPEN_DELAYS_MS`** — Backoff schedule (1 s → 30 s, capped) used when the browser closes a source permanently (`readyState === CLOSED`).
- **`payloadSchemas`** — Module-level `Map` cache so the JSON-Schema→Zod conversion happens at most once per event name.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- `parseJsonSafe` uses `undefined` as its failure sentinel; legitimate payloads like `null`, `0`, `false`, `""` are forwarded normally.
- The browser auto-retries while `readyState` is `CONNECTING`; this module only intervenes when it hits `CLOSED` (2), which means the browser has permanently given up.
- In production (`isReportOnly()`), a contract mismatch is logged via `logger.error` but the frame is **still forwarded** to `onEvent`. This is intentional: additive backend drift must not silence a deployed stream. In dev/unit/e2e the frame is dropped.
- `zod.fromJSONSchema` is used directly (not a manual mapping) because the generated schemas carry no `$ref` — each is self-contained.
- The `TEventName` generic on `createSseClient` narrows `onEvent`'s payload type per call site, but the runtime listener registration is still a flat loop over `eventNames`.
