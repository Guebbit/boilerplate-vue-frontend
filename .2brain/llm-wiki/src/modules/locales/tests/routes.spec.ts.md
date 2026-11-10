---
source: src/modules/locales/tests/routes.spec.ts
sha256: 3f5d9a8bf5a662daeb8d429eaa6633d24c68e1fe40d045e3fa914fcf120b031a
signature: 80ba74e07580eb1dd5344a530f266c81581b1ea72219e98615c81971bac7651d
generated_at: 2026-11-10T04:44:47.562825+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/tests/routes.spec.ts

## Purpose

Pins the `meta.access` and `meta.can` declarations on every locales route by name. It verifies that each route *states* its intended access level (auth vs. public, and the specific RBAC permission), complementing the router-level spec which verifies enforcement is *attached*. It is a self-contained check against the module's own route records — no resolved router, locale prefix, or app shell required.

## Key elements

- **`byName(name)`** — module-scoped helper that finds a `RouteRecordRaw` in the imported `routes` array by its `name` property; returns `undefined` if no match.
- **`it.each([...])` block** — four parameterised cases asserting each known route name is defined and carries the exact `meta.access` string (`'auth'`) and `meta.can` array (`[action, subject]`).
- **"declares no route this file does not know about"** — asserts the sorted list of all route names equals the four expected names, catching any route added without an explicit access decision.

## Relationships

- **`src/modules/locales/routes.ts`** — the sole subject under test and the only dependency. The spec imports its default export (the `routes` array of `RouteRecordRaw` objects) and inspects each record's `name`, `meta.access`, and `meta.can` fields. No other module interaction occurs.

## Notes

- All four routes declare `meta.access: 'auth'`; three use `meta.can: ['update', 'Locale']`, while `EntityTranslations` deliberately uses `['read', 'Translation']` to keep the translation-read permission separable from `locales.update`.
- The "no unknown routes" test is the guard against silently shipping an unguarded route (e.g. a future bulk dictionary-import endpoint) — it will fail on any new name not listed in the `it.each` array.
- Routes are looked up by string name against the raw array, not via `router.resolve`, so the test runs in complete isolation from Vue Router's runtime.
