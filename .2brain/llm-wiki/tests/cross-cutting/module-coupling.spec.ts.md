---
source: tests/cross-cutting/module-coupling.spec.ts
sha256: f3f7ce32d4251907af036e858a477c5845de156e98685092d4dcf46f9f89b46e
signature: 77aabae84bc4a2e4175bb10b2a824b94921ce76e5ac8d68238949bded82b6b7d
generated_at: 2026-11-10T06:37:55.391455+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/module-coupling.spec.ts

## Purpose

Cross-cutting static-analysis test that enforces a module's `@api` (generated REST client) calls stay within the backend modules declared in its `dependsOn` coupling. It closes a gap left by the ESLint boundary rules: those rules prevent a module from importing a sibling's *source*, but say nothing about calling another module's *backend operation* through the shared `@api` barrel.

## Key elements

- **`listFiles(directory)`** — recursively collects `.ts`/`.vue` files, skipping any path that contains a `tests/` segment.
- **`clauseNames(clause)`** — parses a `{ … }` import clause into bare names, stripping `type` prefixes and `as` aliases.
- **`moduleNames()`** — returns every subdirectory name under `src/modules`.
- **`apiImportsOf(file)`** — regex-extracts every name a file imports from `@api`.
- **`backendModulesCalledBy(moduleName)`** — for a module, returns the `Set` of backend modules whose operations it calls via `@api` (self-calls excluded). Uses `OPERATION_MODULES` to resolve an imported name to its owning module.
- **Three `it` blocks:**
  1. *Canary — module discovery:* asserts `moduleNames()` is non-empty so an empty sweep can't be mistaken for a clean pass.
  2. *Canary — call discovery:* asserts at least one cross-module `@api` call exists, guarding against a silent regex/path regression.
  3. *Violation check:* collects every `(module → owner)` pair not covered by `moduleDependsOn[module]` and expects the list to be empty.

## Relationships

- **`contracts/rest/operation-modules.ts`** — imports `OPERATION_MODULES`, a generated map of operation function name → owning backend module. The test uses this map to resolve which backend module an `@api` import targets.
- **`scripts/module-manifest.ts`** — imports `moduleDependsOn`, the per-module declared coupling list. The test's final assertion compares actual `@api` call targets against this set.

## Notes

- **Spec-file exemption:** `listFiles` filters out any path containing `/tests/`, mirroring the same convention in `published-language.spec.ts`. A spec importing `@api` is exercising the contract, not a runtime cross-module call.
- **Types vs. functions:** `OPERATION_MODULES` maps only generated *functions* (operations). Types and enums re-exported from `@api` are absent from the map, so they are naturally ignored by the coupling check.
- **Purely static:** the test reads source files and runs regexes; it never compiles or executes the imported modules.
- **Vacuous-pass guards:** the two canary tests exist specifically because "no violations" is meaningless if the regex, file walk, or `OPERATION_MODULES` lookup silently fails.
