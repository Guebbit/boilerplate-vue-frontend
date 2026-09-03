# src/modules/users/tests/routes.spec.ts

## Purpose

Pins the `meta.access` declaration on every users-module route by name. It reads the raw route records directly (not a resolved router), so it needs no locale prefix or app context. Its role is to prove the access declarations are *present*; a separate router spec proves enforcement is *attached*. Together they ensure a route cannot silently become public.

## Key elements

- **`byName(name: string): RouteRecordRaw | undefined`** — local lookup helper; finds a route record in the imported `routes` array by its `name` field.
- **`describe('users route access')`** — the sole test block.
- **`it.each([...])`** — parameterized assertion: for each `(name, access)` pair (`UsersList`, `UserCreate`, `UserTarget`, `UserEdit` → `'admin'`), asserts the route exists and its `meta.access` matches exactly.
- **`it('declares no route this file does not know about')`** — guardrail test: compares the sorted list of all route names in `routes` against the sorted list of names hardcoded in the `it.each` table. Fails if a new route is added to `routes.ts` without a corresponding entry here.

## Relationships

- **`src/modules/users/routes.ts`** — the sole import. The test reads the exported `routes` array (typed as `RouteRecordRaw[]`) and inspects each record's `name` and `meta.access` fields. No mocking; it exercises the real array as the module ships it.

## Notes

- Expected access values are **hardcoded**, not derived from the source. This is deliberate: if `meta.access` is accidentally removed from a route, the assertion `toBe('admin')` fails rather than passing vacuously.
- The "no unknown route" test is a **completeness gate**: adding a route to `routes.ts` without updating this spec breaks the build, forcing the developer to make an explicit access decision.
- Uses `toSorted()` (immutable) rather than `sort()` to avoid mutating the route-name arrays.
- The file lives under `tests/` within the users module, co-located with the domain it documents (per the module convention referenced in the header comment).
