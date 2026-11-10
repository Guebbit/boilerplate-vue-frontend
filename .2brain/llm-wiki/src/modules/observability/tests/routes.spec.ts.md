---
source: src/modules/observability/tests/routes.spec.ts
sha256: 78d51a53ccd45bbcf7365f68755b0a6bcb31e00c28224cb507ca2fc1e3586ab8
signature: a275a23333c70224919e5d478f6fced6802f7c6d39445f0c0ee2883577e2ccf8
generated_at: 2026-11-10T04:55:25.214525+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/tests/routes.spec.ts

## Purpose

Vitest suite that verifies every observability route explicitly declares its access and permission metadata. A route that silently loses its access field would still render and pass all other tests, effectively becoming public; this file is the only guard against that regression.

## Key elements

- **`byName(name)`** — small helper that looks up a `RouteRecordRaw` by its `name` property from the imported `routes` array.
- **`it.each([...])` — per-route access assertions** — parameterized over three routes (`Admin`, `AuditLog`, `RealtimePlayground`). For each, asserts the record exists, `meta.access` equals the expected value, and `meta.can` equals the expected `[action, subject]` tuple (or `undefined`).
- **`'declares no route this file does not know about'`** — asserts the sorted list of route names is exactly `['Admin', 'AuditLog', 'RealtimePlayground']`. Catches a newly added route that has no access decision recorded here.

## Relationships

- **`src/modules/observability/routes.ts`** — the sole dependency. The test imports its default export (a `RouteRecordRaw[]`) and asserts directly on those records. No router instance, locale prefix, or app-level setup is involved.

## Notes

- Expected values are **hardcoded in the test**, not read back from the route records. This is deliberate: if a route's `meta` were deleted, deriving expectations from the record would trivially pass.
- The "no unknown route" test doubles as a **change gate**: adding a fourth route to `routes.ts` without extending this test's name list will fail CI, forcing an explicit access decision.
- Because assertions target the raw route array (not a resolved `VueRouter`), the test runs without locale prefixes or the rest of the application.
- The file-header comment references `docs/theory/modules.md` for the convention that domain-specific invariants live with the domain rather than in a platform-wide spec.
