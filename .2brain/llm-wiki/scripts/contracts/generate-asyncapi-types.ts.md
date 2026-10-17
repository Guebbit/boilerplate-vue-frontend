---
source: scripts/contracts/generate-asyncapi-types.ts
sha256: 4e93e323d9f205240e7f9e9ff95c8253c348a3130e9a42e502b2ab1b7fc35609
generated_at: 2026-10-16T23:57:24.348531+00:00
model: ollama:qwen3.8:27b
---

# scripts/contracts/generate-asyncapi-types.ts

## Purpose

Generates the frontend's realtime contract types (payload interfaces, channel constants, SSE event-name/payload maps, and inlined JSON Schema maps) from the bundled `asyncapi.yaml`. It exists so the frontend repo has a typed, build-time-checked view of every SSE channel its dashboard consumes, without hand-maintaining those types. This copy is the frontend half of a paired shared script; the backend copy diverges in output (queue-payload Zod validators vs. inlined JSON Schema for `create-sse-client.ts`).

## Key elements

- **`resolveOutputPath()`** – Reads the required `--out` CLI argument; exits 1 if missing. Resolves to an absolute path under the repo root.
- **`checkOnly` flag** – When `--check` is passed, the script compares generated output against the existing file and exits 1 on mismatch without writing.
- **`toPascalCase` / `refToTypeName`** – Naming helpers that convert AsyncAPI component names into TypeScript identifiers.
- **`resolveMessagePayloadType(messageName, messages)`** – Resolves a message's `$ref` to the actual payload type name (not the possibly-deduped message alias). Returns `'unknown'` when the message is undeclared.
- **`collectChannelMessageEntries(channels, messages, select)`** – Filters channels by a predicate (e.g. `x-transport === 'sse'`) and returns sorted `{channelName, messageType}` pairs.
- **`inlineReferences(schema, schemas)`** – Recursively replaces every `$ref` with its target so the resulting JSON Schema is self-contained for `Zod.fromJSONSchema`.
- **`renderPayloadSchemas`** – Emits a `Record<SseEventName, Record<string, unknown>>` constant of inlined JSON Schemas per SSE event.
- **`renderLiteralArray`** – Emits a `readonly` literal string-array export (`as const`).
- **`renderPayloadMap`** – Emits a typed event-name → payload-type interface.
- **`toConstantKey`** – Converts a channel name (minus namespace prefix) to a `SCREAMING_SNAKE` key for the namespace constant object.
- **`AsyncApiChannel` / `AsyncApiMessage` / `JsonSchema` / `AsyncApiDocument`** – Minimal structural interfaces describing the slice of AsyncAPI 3.0 this script reads.
- **`x-transport`** – Vendor extension read from the channel; value `'sse'` marks a channel as SSE-pushed.

## Relationships

No graph neighbors are recorded. The script is a leaf in the dependency graph: it reads `asyncapi.yaml` and writes to a path supplied via `--out` (caller in this repo: `contracts/asyncapi.generated.ts`). The generated file is consumed by `create-sse-client.ts` (runtime SSE-frame validation via `Zod.fromJSONSchema`) and by other frontend modules that import the typed channel constants. The backend repo maintains a byte-diverged copy of this script that emits queue-payload Zod validators instead.

## Notes

- **Paired-script drift is manual.** A fix to the channel/message-naming machinery must be mirrored in the backend copy by hand until the generator ships as a shared package.
- **SSE detection is data-driven, not name-based.** Channels are selected by `x-transport: 'sse'`, not by a name prefix. Renaming a channel does not change which map it lands in.
- **`Record<string, AsyncApiMessage>` is a lie.** Index access is typed as always-present, but callers pass names derived from `$ref` that may not exist in `components.messages`. The guard uses `Object.hasOwn` specifically to satisfy `no-unnecessary-condition`.
- **`--out` is required** (no default), unlike the backend copy which hardcodes a path.
- **ESM script.** Uses `import.meta.url` for `ROOT` resolution; runs via `tsx`.
- **`renderPayloadSchemas` types the map loosely** (`Record<string, unknown>`) because `as const` would make arrays `readonly`, which JSON Schema consumers reject.
- **`--check` is the CI gate** that prevents shipping types for a contract the repo no longer bundles.
