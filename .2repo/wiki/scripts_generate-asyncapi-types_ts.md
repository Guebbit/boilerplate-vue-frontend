# scripts/generate-asyncapi-types.ts

## Purpose

Generates the TypeScript realtime contract types (payload interfaces, message aliases, per-namespace channel constants/unions, and SSE event payload maps) from `asyncapi.yaml` using `@asyncapi/modelina`. It exists as a single shared script consumed by both repos in the pair—each writes the same `src/types/asyncapi.generated.ts` path but from a different input document (full contract vs. public subset)—so the generated surface stays consistent.

## Key elements

- **`generator`** (`TypeScriptGenerator` instance) – Configured with `interface` model type, union enums, raw property names, and a custom `NAMING_FORMATTER` that funnels through `toPascalCase`. Produces the schema-derived model blocks.
- **`resolveMessagePayloadType(messageName, messages)`** – Resolves a `components.messages` entry to the *payload* type name (via its `$ref`), never the message's own alias. Returns `'unknown'` when the message is undeclared. Central to both the SSE map and the alias block.
- **`collectChannelMessageEntries(channels, messages, prefix)`** – Filters channels by prefix (used with `'observability.'`), extracts the subscribe message ref, and resolves it to a payload type. Output feeds the SSE payload map.
- **`renderChannelNamespace(namespace, channelNames)`** – Emits a `SCREAMING_SNAKE`-keyed `as const` object (e.g. `OBSERVABILITY_CHANNELS`) plus a union type of its values. Namespaces are auto-discovered from channel dot-segments; adding a new prefix requires no script change.
- **`messageTypeBlocks`** – One `export type X = Y;` alias per message, deduplicated via `seenTargets` so multiple messages sharing one payload produce a single alias.
- **`renderPayloadMap` / `renderLiteralArray`** – Render the SSE event-name→payload map interface and readonly string arrays respectively.
- **`buildOutput(modelBlocks)`** – Assembles all sections (models, aliases, channel namespaces, SSE map) into the final file text.
- **`resolveOutputPath()` / `checkOnly`** – CLI plumbing: `--out <path>` (required) and `--check` (writes nothing, exits 1 on diff).

## Relationships

- **`src/types/asyncapi.generated.ts`** – The output artifact. In normal mode the script writes it; in `--check` mode it reads the existing file and diffs against freshly generated content, exiting non-zero on any mismatch. This is the CI gate that prevents a repo from shipping types for a contract it no longer has.

## Notes

- **Byte-identical across repos.** The script header states it must be copied verbatim into both repos of the pair. Divergence causes the two `asyncapi.generated.ts` outputs to drift. Only the *input document* differs between repos.
- **`Object.hasOwn` guard is intentional.** `Record<string, T>` tells TypeScript every key is present, so a `?.` or nullish check triggers `no-unnecessary-condition`. The guard uses `Object.hasOwn` because callers pass names from channel `$ref` fragments that may genuinely be absent from `components.messages`.
- **Alias dedup is order-dependent.** `seenTargets` keeps the *first* declaration-order alias per shared payload shape. `SseEventPayloadMap` is safe because it resolves through the same `resolveMessagePayloadType`, so it never references a deduped alias.
- **`toSorted`** (not `sort`) is used for channel ordering to avoid mutating the source array.
- Unused exports in a given repo are harmless: type-only here, tree-shaken in the other.
