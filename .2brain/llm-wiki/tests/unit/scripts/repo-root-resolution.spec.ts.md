---
source: tests/unit/scripts/repo-root-resolution.spec.ts
sha256: 8287102a9914ac93eb873b7ae967ff3805107f1efa027a98062c7c4267670145
signature: c568b63e853a9e33622f69ac8ea54e5e6bc4f275172628a2c00db86e539471df
generated_at: 2026-11-10T08:23:04.856422+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/repo-root-resolution.spec.ts

## Purpose

Guards against a silent mis-resolution class of bug: any `scripts/` file that climbs to the repo root with a hard-coded number of `..` segments will silently retarget if the file is moved one folder deeper. This test reads every `scripts/**/*.ts` file as **text**, extracts each `path.resolve/join(import.meta.dirname, …)` walk, and asserts the result actually lands on the repo root (identified by the presence of `package.json`).

## Key elements

- **`REPO_ROOT`** – Constant; resolves to three levels above the test file (the repo root).
- **`ROOT_WALK`** (regex) – Matches `path.resolve(import.meta.dirname, …)` and `path.join(import.meta.dirname, …)`, capturing the argument list so the `..` segments can be counted.
- **`RootWalk`** (interface) – Pairs a source file path with the number of `..` levels it climbs.
- **`rootWalks()`** – Globs `scripts/**/*.ts` from the repo root, reads each file as a UTF-8 string, and returns every `RootWalk` found via the regex.
- **Guard test** (`finds the walks it is meant to check`) – Asserts `rootWalks().length > 0`; without it, a broken regex would make the parametrized test vacuously pass.
- **Parametrized test** (`$file climbs $levels level(s) and reaches the repo root`) – For each walk, resolves the path upward by the captured number of levels and asserts the result equals `REPO_ROOT` and contains `package.json`.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- **Text reading, not importing.** The scripts under test spawn child processes and read `.env` at module scope, so importing them for inspection would execute them. The test deliberately reads source as a string instead.
- **`package.json` as the marker.** The assertion checks for `package.json` rather than matching a directory name, because `scripts/` itself is a valid resolved path but holds no manifest—exactly the scenario a short walk would produce.
- **Regex is the single point of failure.** If `ROOT_WALK` stops matching (e.g., after a refactor renames `import.meta.dirname`), every assertion passes with zero walks checked. The guard test exists solely to catch this, but only as long as the regex itself is still correct.
- **Sorted, flat output.** `rootWalks()` returns results in sorted file order with all walks in a file flattened, making the `it.each` labels deterministic.
