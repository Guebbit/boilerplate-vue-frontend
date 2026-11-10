---
source: tests/cross-cutting/journey-headers.spec.ts
sha256: 1c4c26875f391a6e5bfe41e85908cdb5dbd813f3ed386e57ba6329b7e8a0a4e4
signature: 0e2c6a083fd04ec512157bb3c82a28a20eb0b2a634bd306b34eb560d249cc4e6
generated_at: 2026-11-10T06:37:23.804563+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/journey-headers.spec.ts

## Purpose

Validates that every cross-module e2e spec under `tests/e2e/specs/` carries a well-formed `// requires-module:` header (naming only real modules, or `none`). This guarantees `npm run demo:remove` can safely delete journey specs alongside the modules they depend on. It exercises the same checker logic used by the unit tests in `scripts/demo/demo-remove-tests.spec.ts`, but against the actual repository tree.

## Key elements

- **`REPO_ROOT`** — resolved two levels above this file; the base path passed to the scanner helpers.
- **`it('name only real modules, and every journey carries one')`** — calls `headerProblems` with the repo root and the set of known module names, asserts the result is an empty array.
- **`it('reads as many files as an independent glob finds')`** — canary test: independently globs `tests/e2e/specs/**/*.ts` and asserts `scannedSpecFiles` returns the same count, guarding against a silent scan-miss being mistaken for "no problems."

## Relationships

- **`scripts/demo/demo-remove-tests.ts`** — provides `headerProblems` (validates headers against a set of known module names) and `scannedSpecFiles` (returns the number of spec files the scanner actually read). This spec is the integration-level consumer of that module's public API.
- **`scripts/module-manifest.ts`** — provides `moduleGroups`, the canonical list of module names. The spec derives the valid-name set from its keys and passes it to `headerProblems` so the checker can flag typos or references to deleted modules.

## Notes

- The file lives under `tests/cross-cutting/` rather than inside any module folder because it verifies specs that span multiple modules; no single module "owns" it.
- The canary test exists specifically to catch a regression where the glob inside `headerProblems` silently matches zero files, which would make the first test pass vacuously.
