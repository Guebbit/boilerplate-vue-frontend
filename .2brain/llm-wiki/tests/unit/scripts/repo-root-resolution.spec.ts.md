---
source: tests/unit/scripts/repo-root-resolution.spec.ts
sha256: 8287102a9914ac93eb873b7ae967ff3805107f1efa027a98062c7c4267670145
generated_at: 2026-10-17T02:45:26.332266+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/repo-root-resolution.spec.ts

## Purpose

Guards against a silent misconfiguration: scripts under `scripts/` that hard-code a fixed number of `..` segments to reach the repo root will silently target the wrong directory if moved one folder deeper. This test scans every `scripts/**/*.ts` file for that pattern, resolves the walk for real, and asserts the result actually is the repo root.

## Key elements

- **`REPO_ROOT`** – The repo root, computed as three levels above this test file.
- **`ROOT_WALK`** – Regex matching `path.resolve(import.meta.dirname, …)` or `path.join(import.meta.dirname, …)` and capturing the argument list so `..` segments can be counted.
- **`RootWalk`** – Interface pairing a file path with its `..`-count.
- **`rootWalks()`** – Globs `scripts/**/*.ts`, reads each file as raw text (not by importing), and extracts every walk via `ROOT_WALK`. Returns a sorted `RootWalk[]`.
- **`'finds the walks it is meant to check'`** – Meta-guard: asserts the regex matched at least one occurrence, preventing a silent regex regression from vacuously passing the suite.
- **`'a script that walks up to the repo root lands on it'`** – Parameterized test (`it.each`): resolves each walk from its originating directory and asserts the result equals `REPO_ROOT` and contains `package.json`.

## Relationships

No graph neighbors. This file depends only on `vitest`, `node:fs`, `node:path`, and `node:url`. It is not imported by any other module.

## Notes

- Files are read as **text** (`readFileSync`), never imported. The scripts execute side-effects (spawning processes, reading `.env`) at module scope, so a dynamic import would trigger them.
- The assertion uses the presence of `package.json` as the "you are at the root" marker rather than a directory-name check, because a short walk could resolve to a valid-looking path (e.g. `scripts/` itself) that happens to be a clean directory.
- `.toSorted()` on the glob results gives `it.each` a deterministic ordering so failure output is stable across runs.
- If you add a new script that walks up, it is picked up automatically—no test change needed. If you remove all such scripts, the meta-guard test will fail.
