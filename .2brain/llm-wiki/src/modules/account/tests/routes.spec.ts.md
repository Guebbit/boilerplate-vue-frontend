---
source: src/modules/account/tests/routes.spec.ts
sha256: a42aff6d0718ae1f6cebc9e32337795f56f3aecf16b1e28327e3dd364d783eaa
signature: f678a35e8d815a9c2afeb617bba452ff88e88fa9671b0565d33cebc62f584fde
generated_at: 2026-11-10T03:41:08.798914+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/routes.spec.ts

## Purpose

Vitest spec that pins the `meta.access` value declared on every account route. It asserts directly against the module's raw route records (not a resolved router), so no locale prefix or full app context is needed. Its job is to guarantee that the *declaration* exists and is correct; the router-level spec separately proves that enforcement is actually attached to those declarations.

## Key elements

- **`byName(name)`** — helper that finds a `RouteRecordRaw` in the imported `routes` array by its `name` field.
- **`describe('account route access')`** — the sole test suite.
  - **`it.each([...])('%s declares access: %s', …)`** — table-driven test asserting each of the 15 named routes exists and carries the exact expected `meta.access` (`'guest'`, `'auth'`, or `undefined`).
  - **`it('declares no route this file does not know about', …)`** — sorted-name equality check that fails if a new route is added to `routes` without a corresponding entry in the expected list (i.e., without an explicit access decision).

## Relationships

- **`src/modules/account/routes.ts`** — the only import. The spec reads the `routes` array exported there and never mutates it. Every assertion is a pure read of that module's route definitions.

## Notes

- `meta.access === undefined` is the intentional marker for public routes; the spec treats `undefined` as a first-class expected value, not an absence.
- The expected access values are written out literally per the module doc comment — they are *not* derived from route paths or other heuristics, so a refactored route that silently drops `meta.access` will fail rather than pass vacuously.
- The "no unknown route" guard means adding a new route to `routes.ts` requires a deliberate decision here; the test will fail until the new route is listed with its access level.
- The spec intentionally does **not** exercise the router, middleware, or redirect logic — that coverage belongs to the router-level spec.
