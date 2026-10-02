---
source: scripts/contracts/generate-asyncapi-types.ts
sha256: 8232ec1502fff1fda4436d3808531d7f0389bd01a3ead4c3044be388834df2dc
generated_at: 2026-10-02T11:27:45.927911+00:00
model: ollama:qwen3.8:27b
---

# scripts/contracts/generate-asyncapi-types.ts

## Purpose

CLI script that reads `asyncapi.yaml` and emits a TypeScript file (`contracts/asyncapi.generated.ts`) containing realtime contract types: payload interfaces, message aliases, per-namespace channel constants, SSE event-name/payload maps, and fully inlined JSON Schema maps. The schema maps exist so `create-sse-client.ts` can validate SSE frames at runtime via Zod's `fromJSONSchema`. A `--check` flag enables a no-write, exit-on-mismatch mode for CI gating.

## Key elements

- **`resolveOutputPath()`** — Reads the required `--out` CLI argument; exits 1 if missing.
- **`checkOnly`** — Boolean set when `--check` is present; suppresses file writes and exits 1 on mismatch.
- **`toPascalCase(value)`** — Sanitizes an AsyncAPI name into a PascalCase identifier.
- **`refToTypeName(reference)`** — Extracts the final segment of a `#/components/...` `$ref` and PascalCases it.
- **`resolveMessagePayloadType(name, messages)`** — Resolves a message name to its *payload* schema type (not the message alias), returning `'unknown'` if undeclared.
- **`collectChannelMessageEntries(channels, messages, select)`** — Filters channels by a predicate (data-driven, e.g. `x-transport`) and returns sorted `{channelName, messageType}` pairs.
- **`inlineReferences(schema, schemas)`** — Recursively replaces every `$ref` with the inlined target schema.
- **`renderPayloadSchemas(...)`** — Emits `export const <name>: Record<SseEventName, Record<string, unknown>>` with inlined JSON.
- **`renderLiteralArray(exportName, values)`** — Emits a `readonly` string-array constant.
- **`renderPayloadMap(interfaceName, entries)`** — Emits a `Record`-style interface mapping channel names to payload types.
- **`toConstantKey(channelName, prefix)`** — Strips a namespace prefix and converts the remainder to SCREAMING_SNAKE.
- **`renderChannelNamespace(namespace, channelNames)`** — Emits a per-namespace channel constant object and its union type.
- **`AsyncApiDocument`, `AsyncApiChannel`, `AsyncApiMessage`, `JsonSchema`** — Local interfaces describing the expected shape of the YAML document.
- **`@asyncapi/modelina`** (`TypeScriptGenerator`, `typeScriptDefaultModelNameConstraints`) — Used for generating the payload/alias interface blocks.

## Relationships

No graph neighbors are tracked. The script's input is `asyncapi.yaml` (repo root) and its output is consumed by `create-sse-client.ts` (SSE frame validation via the inlined schema map).

## Notes

- **Shared with a backend repo.** The two copies diverged: this copy emits the inlined-JSON-Schema map; the backend copy emits queue-payload Zod validators instead. Any fix to the channel/message-naming machinery must be applied to **both** copies by hand until the generator is extracted into a shared package.
- **Different input scope.** This repo generates from the *public subset* of the contract; the backend uses the full document. Only the backend output carries queue payloads.
- **`x-transport` over name prefix.** SSE channels are identified by the `x-transport: sse` vendor extension on the channel, not by an `observability.` name prefix. A channel outside that namespace could share the prefix without being SSE.
- **Loose typing on `renderPayloadSchemas`.** The return is typed `Record<string, unknown>` rather than `as const` to avoid `readonly` array types that JSON Schema consumers reject.
- **`Object.hasOwn` guards.** Used deliberately (instead of nullish checks) to satisfy `no-unnecessary-condition` lint, because `Record<string, T>` makes index access look always-present to TypeScript even when a key may be absent at runtime.
