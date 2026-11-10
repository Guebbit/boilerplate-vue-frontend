---
source: tests/cross-cutting/list-url-state.spec.ts
sha256: 059784ac779e44775cbbd77b526e9f9c72e56e7fb40998e718a9d17e7c7176b3
signature: cac68f3337ca2ab0a7604ed8eafb33a7e60e0a626044e69ab08f85f406890f90
generated_at: 2026-11-10T06:37:35.904740+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/list-url-state.spec.ts

## Purpose

A convention-enforcement test that guarantees every module component mounting the shared `<ListPagination` pager also calls `useListUrlState` to keep filters and page in the URL. It exists to prevent drift: a paged list that skips the composable would lose bookmarkable, reloadable, shareable state, and this test is the single tripwire that catches that omission.

## Key elements

- **`NO_URL_STATE`** — An explicit exemption registry (`Readonly<Record<string, string>`) mapping file paths to a human-readable reason why that component legitimately has no URL state to persist. Adding an entry here is the only sanctioned way to opt out.
- **`sourceFiles()`** — Recursively lists every non-test `.vue`/`.ts` file under `src/`, repo-relative.
- **`sourceOf(file)`** — Reads and returns the text of a single source file.
- **`pagedFiles()`** — Narrows `sourceFiles()` to `src/modules/**/*.vue` files whose source contains the string `<ListPagination`; this is the population the rule applies to.
- **Canary assertion** (`finds the paged lists it means to check`) — Asserts `pagedFiles().length >= 15` so that a rename or refactor of the pager component cannot silently zero out the sweep and let the test pass vacuously.
- **Enforcement assertion** (`has every paged list call…`) — Collects paged files that neither call `useListUrlState(` nor appear in `NO_URL_STATE` and asserts the set is empty.

## Relationships

No dependency-graph neighbors. The test references `useListUrlState` and `<ListPagination` purely by string-matching source text; it does not import either symbol. It also reads the four component files listed in `NO_URL_STATE` only through the generic `sourceOf` helper, not via imports.

## Notes

- This is a **convention/guardrail test**, not a behavioral test. It checks source text for the presence of a function call, not runtime state.
- The scan is scoped to `src/modules/**/*.vue` only; composable files or non-module pages that might paginate are outside its reach by design.
- The exemption list is intentionally small and requires a written justification. If you find yourself wanting to add an entry, the string should explain *why* a URL parameter would be meaningless (fixed order, no filter, in-memory-only data, or state owned by a parent component).
- The `>= 15` canary threshold is arbitrary but must exceed the real count; if the codebase shrinks below it, the test will fail and the threshold needs updating alongside the refactor.
