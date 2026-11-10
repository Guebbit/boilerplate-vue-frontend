---
source: scripts/contracts/generate-asyncapi-types.ts
sha256: 937bb36d89119e6af8051a7f46f7630cd52e493f8cf052a44087ae6330d6be3f
signature: b8c7828ebe6a8ae92b158db1204de1bd24629c101a5047238d30dba49a527f9d
generated_at: 2026-11-10T02:24:15.048447+00:00
model: ollama:qwen3.8:27b
---

# scripts/contracts/generate-asyncapi-types.ts

## Purpose

Generates the repository's realtime TypeScript contract types (payload interfaces, channel constants, SSE event maps, and inlined JSON Schemas) from `asyncapi.yaml`. It exists so that both the type system and the runtime SSE-frame validator (`create-sse-client.ts`) stay in lockstep with the published AsyncAPI document, and so a CI gate (`--check`) can fail the build if the generated file drifts from the source contract.

## Key elements

- **CLI flags** — `--out <path>` (required; resolved relative to repo root) and `--check` (dry-run; writes nothing, exits 1 on any mismatch).
- **`resolveMessagePayloadType`** — maps a message name to its *payload* type name (never the possibly-deduped alias), returning `'unknown'` when the message is absent.
- **`collectChannelMessageEntries`** — filters channels via a data-driven predicate (reads the `x-transport` vendor extension) and pairs each channel with its resolved payload type.
- **`inlineReferences`** — recursively replaces every `#/components/schemas/…` `$ref` in a JSON Schema with the target definition, producing a self-contained schema for Zod's `fromJSONSchema`.
- **`renderPayloadSchemas`** — emits the `Record<SseEventName, Record<string, unknown>>` constant carrying inlined schemas.
- **`renderLiteralArray`** / **`renderPayloadMap`** — emit `as const` string arrays and the typed channel→payload interface, respectively.
- **`toPascalCase`** / **`refToTypeName`** / **`toConstantKey`** — naming helpers (PascalCase, `$ref`→type-name, SCREAMING_SNAKE constant keys).
- **`@asyncapi/modelina` `TypeScriptGenerator`** — used for the standard model/alias generation alongside the hand-rolled renderers above.

## Relationships

- **`asyncapi.yaml`** — the sole input document; read at repo root via `readFileSync`.
- **`contracts/asyncapi.generated.ts`** — the output path this repo's caller passes to `--out`; the file is written (or diffed under `--check`) here.
- **`github/workflows/ci.yml`** — invokes this script with `--check` as the drift gate that blocks a merge if the committed generated file no longer matches `asyncapi.yaml`.

## Notes

- **Shared, diverged script.** This file and a backend copy started byte-identical but have diverged: this copy emits inlined JSON Schemas for runtime SSE validation; the backend copy emits Zod queue-payload validators instead. A fix to the channel/message-naming machinery must be ported to the other copy by hand until a shared package exists.
- **Input scope differs by repo.** This repo reads the *public* subset of the contract; the backend reads the whole document (hence only the backend output carries queue payloads).
- **SSE channel detection is data-driven.** The script reads the `x-transport: sse` vendor extension on a channel rather than relying on a name prefix, so renaming a channel does not silently change its classification.
- **ESM-only.** Path resolution uses `import.meta.url` / `fileURLToPath`, not `__dirname`.
- **`Object.hasOwn` over nullish checks.** Several guards deliberately use `Object.hasOwn` because `Record<string, T>` index access is typed as always-defined; a `?.` guard would trip the `no-unnecessary-condition` lint rule.
- **Loose schema typing on purpose.** `renderPayloadSchemas` types the map as `Record<string, unknown>` (not `as const`) so that array values remain mutable, which JSON Schema consumers (and Zod) require.
