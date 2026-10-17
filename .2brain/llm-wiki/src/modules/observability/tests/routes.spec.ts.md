---
source: src/modules/observability/tests/routes.spec.ts
sha256: 78d51a53ccd45bbcf7365f68755b0a6bcb31e00c28224cb507ca2fc1e3586ab8
generated_at: 2026-10-17T01:12:53.335079+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/tests/routes.spec.ts

## Purpose

Verifies that every observability route record declares the expected `meta.access` and `meta.can` values, and that no route exists without an explicit access decision. It guards against a route silently becoming public by losing its `meta` declaration — a failure no other test in the suite would catch.

## Key elements

- **`byName(name)`** — Local helper that looks up a `RouteRecordRaw` by its `name` property within the imported `routes` array.
- **`it.each` access-declaration test** — Asserts that `Admin`, `AuditLog`, and `RealtimePlayground` each define `meta.access === 'auth'` and the correct `meta.can` tuple (`['read', 'ObservabilitySnapshot']` or `['read', 'AuditLog']`).
- **Exhaustiveness test** (`'declares no route this file does not know about'`) — Compares the sorted list of route names against the hard-coded triple above, so a newly added route without an access entry fails immediately.

## Relationships

- **`src/modules/observability/routes.ts`** — Imports the default export (the array of `RouteRecordRaw`) and asserts directly on those records. It deliberately does *not* resolve them through the application router, so no locale prefix or app context is required.
- A companion router spec (referenced in the module doc-block) proves enforcement is wired up; this file proves the declarations are present on the records themselves.
- Module co-location rationale is documented in `docs/theory/modules.md`.

## Notes

- Every expected access value is written out explicitly rather than derived from the records under test. This is intentional: a missing `meta.access` makes a route indistinguishable from a public one, and deriving expectations from the same data would mask that failure.
- The test asserts against raw route records, not a mounted router, so it runs without the rest of the application.
- If you add a new observability route, the exhaustiveness test will fail until you add a corresponding row to the `it.each` table.
