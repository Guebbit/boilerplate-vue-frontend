---
source: src/modules/products/tests/routes.spec.ts
sha256: 98979d7c978fa27bc4ff4c7287bc099bf08e7fa07fda797cc22772cbb583fbea
generated_at: 2026-10-17T01:33:46.494081+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/products/tests/routes.spec.ts

## Purpose

Table-driven assertions that every route in the products module declares the expected `meta.access` and `meta.can` values, plus a closed-set guard that fails if a new route is added without an explicit access decision. It validates declarations directly on the route records (no resolved router, no locale prefix), complementing the router spec which proves enforcement is attached.

## Key elements

- **`byName(name)`** — helper that looks up a single `RouteRecordRaw` from the imported `routes` array by its `name` property.
- **`it.each([...])`** — table-driven test verifying each of the four routes (`ProductsList`, `ProductCreate`, `ProductTarget`, `ProductEdit`) declares the exact `meta.access` string and `meta.can` tuple (or `undefined` for public routes).
- **"declares no route this file does not know about"** — closed-set check: sorts all route names from `routes` and asserts equality against the hardcoded list of four names. Fails the moment an unlisted route appears.

## Relationships

- **`src/modules/products/routes.ts`** — imported directly (`import routes from '../routes'`). This test file's sole source of truth; it reads the raw `RouteRecordRaw[]` and asserts on each record's `meta` fields. No other module is touched.

## Notes

- The expected values are **written out explicitly** per route (not derived or computed), so a silent change to a route's `meta` is caught even if the access model itself is refactored.
- The closed-set test uses `toSorted()` for order-independent comparison; adding a new route to `routes.ts` without adding it to this test's expected array will fail the build.
- This file proves declarations are *present*; the router-level spec (elsewhere) proves enforcement is *wired up*. They cover different failure modes.
- No mocking, no app bootstrap, no locale router — the test imports the static route array and inspects it in place.
