---
source: src/modules/cart/tests/routes.spec.ts
sha256: 284834997c61d55cd5359edc7e86c2570653436b0228c141d84f26328bf3faaa
signature: 9020eb3a703bfc868f3886082a4242390dc7acac28dec0ab5197b85517b0df89
generated_at: 2026-11-10T04:09:26.076367+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/routes.spec.ts

## Purpose

Verifies that every route declared in the cart module has an explicit, correct `meta.access` value and no unintended permissions. This guards against a route silently losing its access declaration and becoming publicly reachable — a failure no other test in the suite would catch.

## Key elements

- **`byName(name)`** — local helper that finds a `RouteRecordRaw` in the imported route list by its `name` property.
- **`'Cart' declares access: open`** (parameterized via `it.each`) — asserts the Cart route exists and its `meta.access` is exactly `'open'`. The expected value is hard-coded (not derived from the route records) so a missing `meta` object still fails loudly.
- **`'asks no permission'`** — asserts `meta.can` is `undefined` on the Cart route, confirming no per-account permission gate is set.
- **`'declares no route this file does not know about'`** — asserts the sorted list of route names equals `['Cart']`, catching any new route added without an access decision.

## Relationships

- **Imports `routes` from `src/modules/cart/routes.ts`** — the file under test. Tests assert against the raw route records directly (not a resolved router), so no locale prefix or full app context is needed.
- The module docstring notes that a companion router spec (elsewhere) proves access enforcement is *attached* to the router; this file proves the declarations are *present* on the records.

## Notes

- Expected access values are written as literals rather than read back from the route objects, deliberately so that a missing `meta` field fails the assertion instead of being silently absent.
- The "no unknown routes" test is the module's completeness guard: adding a new cart route without adding a corresponding assertion here will break the test.
- The `open` access level (not `auth`) is intentional — guests have a browser-stored cart that merges on sign-in.
