---
source: scripts/audit/code-shape/scripts/shallow-candidates.ts
sha256: f72cd4a8517ed739c5c8bdae091a1c4cf7b0929a6044ff62f18080f14462b3cc
signature: 43143640ac8f596f9f4c18195f561920d93b4fa1b06cf233fc12d09c8f3e6a60
generated_at: 2026-11-10T02:19:12.942214+00:00
model: ollama:qwen3.8:27b
---

# scripts/audit/code-shape/scripts/shallow-candidates.ts

## Purpose

A `@module` (no default export) that counts the facts the `code-shape` audit uses to judge shallow code: small bodies with few users, pure pass-through bodies, optional parameters no caller supplies, and files with few importers. It resolves references through the TypeScript checker (not text search) so aliases, re-exports, and shorthand properties all count as one use. It is Vue-aware: `.vue` SFCs appear in the program as virtual `.vue.ts` sources. The module only produces counts and structural facts; all verdicts live in `scripts/audit/code-shape/SKILL.md`.

## Key elements

- **`FunctionFacts`** (exported) — per-function record: file, line, name, body line count, reference count, referencing files, optional `forwardsTo` callee, `optionalNeverPassed` param names, and `published` flag.
- **`FileFacts`** (exported) — per-file record: file path, export count, importing files, `published` flag.
- **`ShallowReport`** (exported) — the four candidate lists (`smallAndRare`, `passThroughs`, `optionalNeverPassed`, `lazyFiles`) handed to the audit's agent.
- **`collectUsage(program, relativeOf)`** — walks every identifier in project source files once, resolving through `targetOf`, and returns a `Map<Symbol, Usage>` with reference counts, files, and per-call argument counts.
- **`targetOf(checker, identifier)`** — resolves an identifier to its ultimate symbol, handling shorthand property assignments and import-alias chains.
- **`namedFunctionOf(node)`** — extracts a `NamedFunction` (name, body, parameters) from a function declaration or a variable holding an arrow/function expression; skips overloads.
- **`soleCall(body)`** — returns the single call a body consists of (arrow body, `return f(x)`, or `f(x);`), unwrapping parens and `await`.
- **`forwardTarget(declared)`** — determines whether a body is a pure pass-through by comparing parameter names (including `...rest`) to the single call's arguments in order.
- **`optionalNeverPassed(declared, use)`** — identifies optional parameters at or past the max argument count any direct call supplies; returns `[]` if any use is not a direct call.
- **Constants** — `SMALL_BODY_LINES` (3), `FEW_USERS` (2), `FEW_EXPORTS` (2), `BARREL` regex, `NEVER_A_CANDIDATE` regex, `LAID_OUT_FILE` regex: thresholds and exclusion patterns that gate candidacy.
- **`PLUMBING`** — a `Set` of `SyntaxKind` values (import/export specifiers, clauses) used to skip identifiers that are wiring, not uses.

## Relationships

- **`scripts/audit/code-shape/scripts/generate-shallow-candidates.ts`** — imports the exported interfaces (`FunctionFacts`, `FileFacts`, `ShallowReport`) and the internal analysis functions (`collectUsage`, `namedFunctionOf`, `forwardTarget`, `optionalNeverPassed`, etc.) to assemble the concrete `ShallowReport` that the audit agent consumes.

## Notes

- The file is a `@module` with no default export; only the three interfaces are publicly exported. All analysis helpers are module-private.
- "Small" is measured in **lines** (≤ 3 including braces), not statement count, so a 30-line promise chain in one statement does not qualify.
- A function is flagged as a pass-through only when the parameter list (by name, including `...rest`) matches the call's arguments **in order**; any positional difference disqualifies it.
- `optionalNeverPassed` is reported only when **every** reference is a direct call (`callArguments.length === references`); a use as a callback or passed by reference suppresses the flag.
- `NEVER_A_CANDIDATE` and `LAID_OUT_FILE` encode project conventions (module barrel layout, SFC components, tests, generated code) — changing module layout or the barrel convention requires updating these regexes.
- `relativeOf` is injected as a parameter so the generator can map virtual `.vue.ts` paths back to their real `.vue` names for reporting.
