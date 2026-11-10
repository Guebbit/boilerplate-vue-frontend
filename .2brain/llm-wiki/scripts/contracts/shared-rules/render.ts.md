---
source: scripts/contracts/shared-rules/render.ts
sha256: c0399897f1b70154487507962a9083205e2fb8d17661e678fb0f007aeaa32ef3
signature: ca3a128ad3c76536e39b5f0fb3bddf4a6cdd7182d21dd581323140132f3fb8c5
generated_at: 2026-11-10T02:26:57.964437+00:00
model: ollama:qwen3.8:27b
---

# scripts/contracts/shared-rules/render.ts

## Purpose

Pure text-rendering half of the shared-rules code generator. Given a parsed (schema-checked) rules document and a `GenerateSpec`, it produces the full source text of a `.generated.ts` file. Because it has no filesystem I/O, it can be exercised directly in unit tests.

## Key elements

- **`renderGenerated(source, spec, document)`** *(exported)* — Top-level entry point. Assembles the `@module` header (naming the source YAML and the regenerate script) plus one block per `spec.exports` entry.
- **`deriveKey(value)`** *(exported)* — Converts a dot-delimited wire string (e.g. `security.api_key.revoked`) into a constant key (`SECURITY_API_KEY_REVOKED`).
- **`renderExport(document, spec)`** *(private)* — Renders a single `export const … = …;` statement with its docblock. Delegates to `renderKeyed` for `keyed-list` shape or to `JSON.stringify` + numeric separators otherwise.
- **`renderKeyed(entries)`** *(private)* — Renders a list of `KeyedEntry` items as an `as const` object literal with one docblock per entry. Throws if two entries derive the same key.
- **`docblock(text, indent?)`** *(private)* — Formats a single-line or multi-line JSDoc comment.
- **`sliceOf(document, field?)`** *(private)* — Returns the sub-object at `field`, or the whole document when `field` is `undefined`. Throws if the named field is absent.
- **`withNumericSeparators(json)`** *(private)* — Inserts underscores into integer literals of 5+ digits (satisfying `unicorn/numeric-separators-style`) while leaving string literals untouched.

## Relationships

- **`scripts/contracts/shared-rules/generate-spec.ts`** — Sole type dependency: provides `GenerateSpec`, `GeneratedExport`, and `KeyedEntry` imported by this module.
- **`scripts/contracts/generate-shared-rules.ts`** — The orchestration script that calls `renderGenerated` (and `deriveKey`) to produce the file content before writing it to disk.
- **`tests/unit/scripts/contracts/shared-rules-render.spec.ts`** — Unit-test suite that walks `renderGenerated`, `deriveKey`, and the private helpers without touching the filesystem.

## Notes

- Output is pre-Prettier; the caller (or a post-processing step) is expected to format the result before writing.
- `withNumericSeparators` deliberately skips anything inside quoted strings via a capture-group alternation in the regex.
- `renderKeyed` enforces key uniqueness at render time—duplicate keys are a hard error, not a silent overwrite.
- The generated header names the source YAML by repo-relative path (`source` parameter) so a reader of the `.generated.ts` knows where to make edits.
