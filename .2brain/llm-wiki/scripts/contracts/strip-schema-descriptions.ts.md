---
source: scripts/contracts/strip-schema-descriptions.ts
sha256: d6f424de60e8e40f0297f7e008292800439ae866828143e49d17f1b9e3ce0093
generated_at: 2026-10-02T11:29:47.979559+00:00
model: ollama:qwen3.8:27b
---

# scripts/contracts/strip-schema-descriptions.ts

## Purpose

Post-generation cleanup that removes every Zod `.describe(...)` call from the orval-generated schema file (`contracts/rest/schemas.zod.ts`). Orval emits one for each OpenAPI `description` field (~1,700 total), but the schemas are only ever `.safeParse()`d at runtime — the strings are dead bundle weight. This script runs as the last step of `gen:api`, so both the committed file and the `api-freshness` CI job see the stripped output.

## Key elements

- **`resolveTargetPath()`** — Reads the required `--target <path>` CLI argument, resolves it against repo root, exits with an error if missing.
- **`stripDescribeVisitor(context)`** — A TypeScript `TransformerFactory` that walks the AST via `ts.visitEachChild`. When it finds a `CallExpression` whose target is a `PropertyAccessExpression` named `describe`, it replaces the call with its own `.expression`, effectively unchaining the `.describe(...)` while preserving the rest of the chain (`.regex()`, `.min()`, etc.).
- **`--check` flag** — When present, the script compares the original source to the printed output and exits `1` with a diff hint if any `.describe()` calls remain; when absent, it writes the stripped file in place.
- **CLI contract** — `tsx scripts/contracts/strip-schema-descriptions.ts --target <path> [--check]`.

## Relationships

- **`contracts/rest/schemas.zod.ts`** — The file being transformed (passed via `--target`).
- **`gen:api` npm script** — This script is invoked as its final step, immediately after orval and before prettier's `--write contracts/rest` reformat.
- **`infrastructure/http/validate.ts`** — The sole runtime consumer of the schemas; it only calls `.safeParse()`, which is why the descriptions are safe to remove.
- **`typescript` package** — Used for AST parsing (`ts.createSourceFile`), transformation (`ts.transform`), and printing (`ts.createPrinter`). Already a repo dependency; no new install required.

## Notes

- **AST, not regex.** A regex approach could false-match a literal `.describe(` that appears *inside* one of the description strings themselves. The AST approach avoids this because it operates on call-expression nodes, not text.
- **Single pass handles all nesting.** `ts.visitEachChild` recurses into child nodes before the parent is inspected, so `.describe()` calls nested in array item schemas or deeper chains are stripped in the same traversal — no repeated passes needed.
- **ESM script.** Uses `import.meta.url` (not `__dirname`) to compute `ROOT`; run via `tsx`, not `node`.
- **JSDoc preservation.** The printer keeps all comments; only the `.describe(...)` call nodes (and their string arguments) are removed.
- **Idempotent in `--check` mode.** A second run after stripping reports "no generated `.describe()` calls left to strip" and exits `0`.
