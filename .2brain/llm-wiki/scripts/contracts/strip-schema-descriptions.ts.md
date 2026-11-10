---
source: scripts/contracts/strip-schema-descriptions.ts
sha256: dd1a28f62d94a0886b63d4a46729843ec632bd69d8194b26c8787f67e78141eb
signature: 727077b7392d47acc196cc2c6f9fb91f5bb382855fc936a5b1897e2f31a70b9a
generated_at: 2026-11-10T02:27:47.274216+00:00
model: ollama:qwen3.8:27b
---

# scripts/contracts/strip-schema-descriptions.ts

## Purpose

Strips every `.describe(...)` call from orval-generated Zod schema files. Orval has no flag to suppress OpenAPI `description` text, and the resulting string literals (~1,700) are dead weight in the runtime bundle because the schemas are only ever `.safeParse()`d, never introspected for `.description`. The script runs as the last step of `gen:api`, after orval emits the file, so both the committed output and the `api-freshness` CI job see the stripped version.

## Key elements

- **`resolveTargetPath()`** — Reads the required `--target <path>` CLI argument and resolves it against the repo root. Exits with an error if the flag is missing.
- **`stripDescribeVisitor`** — A `ts.TransformationContext` transformer factory. For each `CallExpression` whose callee is a property-access named `describe` (detected via `ts.isPropertyAccessExpression`), it replaces the call with its `.expression` (the rest of the member chain). Uses `ts.visitEachChild` (post-order), so nested `.describe()` calls (e.g., on an array item schema) are stripped in the same single pass.
- **`checkOnly`** (from `--check` flag) — When set, the script compares original vs. stripped text and exits `1` with a message if they differ, instead of rewriting. Intended for CI.
- **Main flow** — `readFileSync` → `ts.createSourceFile` → `ts.transform` → `ts.createPrinter().printFile` → `writeFileSync` (or diff-report under `--check`).

## Relationships

No dependency-graph neighbors are recorded for this file. Functionally, it operates on the orval-generated Zod schema file (referenced in its header comment as `contracts/rest/schemas.zod.ts`) and is invoked as the final step of the `gen:api` npm script.

## Notes

- Runs as ESM (`tsx` + `import.meta.url`); there is no `__dirname`.
- The transform is AST-based, not regex, specifically to avoid matching a `.describe(` literal that could appear *inside* a description string.
- After the script writes the file, `regenerate` runs `prettier --write contracts/rest` to re-format, same as it does for orval's raw output.
- The script refuses to run if the target file does not yet exist, prompting the user to run `npm run gen:api` first.
- `ts.createPrinter` uses `LineFeed` newlines explicitly; JSDoc comments are preserved (`removeComments` defaults to `false`).
