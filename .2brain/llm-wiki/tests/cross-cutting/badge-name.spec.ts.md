---
source: tests/cross-cutting/badge-name.spec.ts
sha256: 1748c1b275b19a3bc510b44cb1a6a092f393e11d51347a198ac4b78d1dc5b493
generated_at: 2026-10-17T01:59:55.882706+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/badge-name.spec.ts

## Purpose

Static-analysis guard that every `<v-badge>` in shipped Vue components carries an accessible name (`label`, `aria-label`, or `aria-hidden`). A missing name is visually invisible and uncatchable by lint, so the invariant is pinned here rather than enforced by a shared component (which would only cover two of the four badge surfaces and still miss the icon-button case).

## Key elements

- **`componentFiles(directory)`** — Recursively collects every `.vue` path under `src/`, pruning any `tests/` subdirectory.
- **`badgeTagsOf(source)`** — Extracts the full opening tag of each `<v-badge>` in a file's source. Uses a character-by-character, quote-aware walk so a `>` inside an attribute value (e.g. a ternary in `:content`) does not terminate the tag early.
- **`isNamed(tag)`** — Regex check for `label`, `:label`, `aria-label`, `:aria-label`, or `aria-hidden` as a whole-word attribute. Satisfying any one of these is considered "named."
- **`badgesInSource()`** — Combines the above into a flat `{ file, tag }[]` across all collected components.
- **`describe('a badge says what it counts')`** — Two tests:
  - *"names every v-badge the app renders"* — asserts the `unnamed` list is empty; failure message names the offending file.
  - *"is checking the badges it is meant to be checking"* — canary: asserts at least one badge was found, so a scanner regression (rename, wrapper refactor) can't make the first test pass vacuously.

## Relationships

No direct code dependency on the graph neighbours (`use-inbox-lifecycle.spec.ts`, `http-etag.spec.ts`). They are linked as sibling test files in the repo; this spec neither imports from nor is imported by either.

## Notes

- Runs as a **source scan**, not a component render — it reads `.vue` files from disk via `node:fs`. It assumes CWD is the repo root (`process.cwd()`).
- The quote-aware scanner exists because a naive `/<v-badge[^>]*>/` regex would truncate at a `>` inside a bound expression, silently dropping attributes that follow (e.g. a `label` placed after `:content`). The file's docblock calls this out as the one failure mode the guard must avoid.
- `aria-hidden` is accepted as a valid "name" on the theory that a truly decorative badge is an intentional claim, not an accident of omission.
- The canary floor is deliberately `≥ 1` (not a specific count) so deleting a badge from one feature does not disable the guard.
- Adding a new badge surface (a fifth component, a wrapper) requires no change here — the scan is structural, not whitelist-based.
