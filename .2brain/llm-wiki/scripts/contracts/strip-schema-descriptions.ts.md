---
source: scripts/contracts/strip-schema-descriptions.ts
sha256: dd1a28f62d94a0886b63d4a46729843ec632bd69d8194b26c8787f67e78141eb
generated_at: 2026-10-16T23:58:25.394604+00:00
model: ollama:qwen3.8:27b
---

# scripts/contracts/strip-schema-descriptions.ts

## Purpose

Post-processing step in the `gen:api` pipeline that removes every `.describe(...)` call orval emits into the generated Zod schema file. These calls carry OpenAPI description text as string literals (~1,700 of them) into the runtime bundle, but the schemas are only ever `.safeParse()`d and never introspected for `.description`, so the strings are dead weight. Orval provides no config flag to suppress them, so this script strips them after generation.

## Key elements

- **`resolveTargetPath()`** — Reads the required `--target <path>` CLI argument, resolves it relative to the repo root, and exits with an error if missing.
- **`stripDescribeVisitor`** — A TypeScript transformer factory. Uses `ts.visitEachChild` (bottom-up) so nested `.describe()` calls (e.g., inside array item schemas) are removed before their parent is evaluated. When a `CallExpression` whose property name is `describe` is found, the node is replaced by its own `.expression`, effectively unwrapping the call while preserving the rest of the chain (`.regex()`, `.min()`, etc.).
- **`--check` flag** — When present, the script compares the source to the stripped output and exits `1` if any `.describe()` calls remain, without writing the file. Useful for CI freshness checks.
- **Main execution flow** — Parses the target file with `ts.createSourceFile`, runs the transformer via `ts.transform`, prints the result with `ts.createPrinter` (LF line endings, comments preserved), then either reports (check mode) or overwrites the file in place.

## Notes

- Must run **after** orval in `gen:api`; exits immediately if the target file does not yet exist.
- Uses the `typescript` package already in the repo's dependencies — no additional install required.
- AST-based rather than regex to avoid false positives on `.describe(` appearing inside description string literals.
- The script uses ESM (`import.meta.url`) because it runs under `tsx` with the repo's ESM configuration.
- The `regenerate` step (`prettier --write contracts/rest`) runs afterward to reformat the stripped output consistently with orval's own formatting.
