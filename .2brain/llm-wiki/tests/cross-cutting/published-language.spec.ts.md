---
source: tests/cross-cutting/published-language.spec.ts
sha256: e245e2ebcf2194748d56a3c4617442b4f0f51efda05d6439d67e98941cb64f39
generated_at: 2026-10-17T02:01:51.133253+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/published-language.spec.ts

## Purpose

A cross-cutting architectural test that enforces the rule "a module publishes exactly what a sibling imports." It scans every module's `index.ts` barrel against all source-file imports and fails if any export has no sibling consumer or if a barrel exists for a module nobody imports. It exists to catch the slow rot of barrels accumulating dead exports that outlive their reason.

## Key elements

- **`listFiles(directory)`** — Recursively collects every `.ts` and `.vue` file under a directory.
- **`clauseNames(clause)`** — Splits a `{ a, type b, c }` clause into name strings, stripping `type` prefixes.
- **`moduleNames()`** — Returns the directory names inside `src/modules/`.
- **`publishedBy(name)`** — Reads a module's `index.ts` and returns the set of exported names (resolving `as` aliases to the caller-facing name), or `undefined` if no barrel exists.
- **`consumedFromBarrels()`** — Walks all source files, matches `import { … } from '@/modules/<target>'`, and builds a `Map<module, Set<importedName>>`. Skips self-references (a module is never a consumer of itself, including its own specs).
- **`describe('a barrel publishes exactly what a sibling imports')`** — Three assertions:
  - *Canary*: at least one module has a barrel, so the sweep isn't vacuous.
  - *No dead exports*: every published name is imported by at least one sibling.
  - *No pointless barrels*: every module that has an `index.ts` is imported by at least one sibling.

## Relationships

- **`tests/unit/docker/security-txt-entrypoint.spec.ts`** — No import or logical dependency between the two files. They are independent test suites in different directories; the graph link is positional (both are test files) rather than functional.

## Notes

- Parsing is regex-based, not AST-based. It only recognises `export { … }` / `import { … }` syntax; `export default`, `export const`, or `export *` are invisible to the check.
- Import resolution is hard-coded to the `@/modules/<name>` alias pattern. Relative imports (`../cart/store`) are not counted as barrel consumers, which is intentional: they bypass the barrel by design.
- `as`-clause asymmetry is deliberate: publishing resolves to the *alias* (what the caller writes), consuming resolves to the *original* name (what the barrel actually exports).
- The canary uses `≥ 1`, not an exact count, so deleting an entire domain won't accidentally green the suite by removing the only barrel.
- A module's own spec files are excluded from the consumer scan. If a spec imports its own barrel, the test treats that as self-talk, not a valid cross-module dependency.
