---
source: tests/unit/infrastructure/http/url.spec.ts
sha256: 218966eb124ef4a678720e947a246a3657e1a5278dbdb940940793746705d4e5
signature: 218966eb124ef4a678720e947a246a3657e1a5278dbdb940940793746705d4e5
generated_at: 2026-11-10T08:00:35.719584+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/http/url.spec.ts

## Purpose

Unit tests for the `toPathname` normalisation function, which converts a raw URL (relative, absolute, or undefined) into a bare pathname. Correct output is critical because two downstream consumers — the response-schema route table and `refresh.ts`'s excluded-paths set — rely on exact-shape string comparison; a missing slash or residual query string causes a route to be silently skipped.

## Key elements

- **`describe('toPathname')`** — single test block covering all public behaviour of the function.
- **`toPathname` (imported from `@/infrastructure/http/url`)** — the unit under test. Seven cases verify:
  - `undefined` → `'/'`
  - Relative path passed through unchanged (`/products` → `/products`)
  - Absolute `https` URL → pathname extracted
  - Absolute `http` URL → pathname extracted
  - Query string stripped from relative and absolute URLs
  - Leading slash added when absent (`products` → `/products`)

## Relationships

- No graph neighbors are registered for this file. (The module under test, `@/infrastructure/http/url`, is imported directly but does not appear in the dependency graph for this spec.)

## Notes

- The file's doc block explicitly names the two consumers (response-schema table and `refresh.ts`) and warns that every normalisation case is load-bearing; the test comments reinforce *why* each case matters (e.g., the `^\/` anchor in route patterns, paginated-request schema validation).
- Tests are written as plain value comparisons (`toBe`), not snapshot tests, so any change to `toPathname`'s output shape will fail immediately rather than silently updating a snapshot.
