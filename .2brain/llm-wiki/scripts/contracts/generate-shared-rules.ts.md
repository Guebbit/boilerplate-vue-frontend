---
source: scripts/contracts/generate-shared-rules.ts
sha256: 51bc90838a9cc18c131521f69669c29e4ef9dacce96ad6199848f811b2952842
signature: 8bbf347b6a553198265abedb2427e6fb953b3db80fa6e85a84d8a7f34a14be81
generated_at: 2026-11-10T02:25:37.451139+00:00
model: ollama:qwen3.8:27b
---

# scripts/contracts/generate-shared-rules.ts

## Purpose

Generates two artifacts for every entry in the shared-rules registry: a JSON Schema file (`shared/rules/schemas/<name>.schema.json`) so other frontends can validate the same YAML without Zod, and a committed TypeScript `as const` file that application code imports. Supports a `--check` mode (used in CI) that writes nothing and exits 1 if any output is stale.

## Key elements

- **`readRules`** (`LoadRules`) — Reads a YAML file from the repo and validates the parsed value against a Zod schema; throws with a line number on syntax errors.
- **`documentOf(rule)`** — Resolves a rule's data: calls `rule.derive(readRules)` if the rule aggregates multiple sources, otherwise reads and validates `rule.source` directly.
- **`formatted(file, content)`** — Runs Prettier over `content` using the project's resolved config (`.prettierrc` / `.editorconfig`) and the file extension to pick a parser, so output matches `prettier:check`.
- **`writeRule(name, rule)`** — For one rule: serialises the Zod schema via `z.toJSONSchema`, renders the TS file via `renderGenerated`, formats both, then hands each to `writeOrCheck`.
- **Top-level promise** — Iterates `Object.entries(SHARED_RULES)`, calls `writeRule` in parallel, and routes any rejection to `failScript`.
- **`ROOT`** — Repo root resolved from `import.meta.url` (ESM context).
- **`FIX_COMMAND`** — The `npm run gen:shared-rules` string embedded in `--check` failure messages.

## Relationships

- **`scripts/contracts/shared-rules/rules.ts`** — Source of the `SHARED_RULES` registry and the `LoadRules` / `SharedRule` types this script consumes.
- **`scripts/contracts/shared-rules/render.ts`** — Provides `renderGenerated`, which produces the TypeScript file body from a rule's metadata and data.
- **`scripts/contracts/generated-file.ts`** — Provides `writeOrCheck`, the shared "write if dirty, else exit 1 on `--check`" helper.
- **`scripts/fail-script.ts`** — Provides `failScript`, the terminal error handler for the top-level promise.
- **`github/workflows/ci.yml`** — Invokes this script in `--check` mode to gate commits on generated-file freshness.

## Notes

- Runs under `tsx` as an ESM script (shebang `#!/usr/bin/env tsx`); path resolution uses `import.meta.url`, not `__dirname`.
- Prettier is called programmatically (not via CLI) so the output is byte-identical to what `prettier:check` expects; the `filepath` option is what selects the parser.
- The module doc-comment states the backend re-runs the same renderer over its own `shared/rules/` directory; the two sides never read each other's files except the synced ones.
- Uses Zod 4's built-in `z.toJSONSchema` exporter (no third-party `zod-to-json-schema` package).
