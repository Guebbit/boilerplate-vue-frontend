---
source: src/modules/feedback/tests/routes.spec.ts
sha256: 2a91eadf05c3a86e1cf70ff3b7ef477f179c0992b5a00790dcd20e34dc013285
generated_at: 2026-10-17T00:56:25.138005+00:00
model: ollama:qwen3.8:27b
---

# src/modules/feedback/tests/routes.spec.ts

## Purpose

Vitest spec that pins the `meta.access` and `meta.can` values declared on every feedback route. Because a route that silently loses its `meta.access` becomes open, the test enforces the module's access split (public contact form vs. authenticated inbox) and guards against unknown routes appearing in the array.

## Key elements

- **`describe('feedback route access')`** — top-level suite.
- **`it.each([...])('%s declares access %s, permission %s %s', …)`** — parameterized case over a hard-coded table of `[name, access, action, subject]` tuples. Asserts `route.meta.access` matches the expected access level and `route.meta.can` equals `[action, subject]` (or `undefined` for the public route).
- **`it('declares no route this file does not know about', …)`** — asserts the full set of route names is exactly `['Contact', 'FeedbackInbox']`, catching any route added upstream that this test hasn't been updated to expect.

## Relationships

- **`src/modules/feedback/routes.ts`** — the sole import target. The test reads the default-exported `routes` array, looks up each entry by `name`, and asserts on its `meta` shape. It does not execute route handlers or mock any runtime dependencies.

## Notes

- Follows the same pattern as the account module's equivalent spec (referenced in the file's doc comment): access declarations are the single source of truth for authorization, so the test treats them as a contract.
- Uses `Array.prototype.toSorted()` (non-mutating, ES 2023) rather than `.sort()` for the route-name comparison; the project targets an environment that supports it.
- The `it.each` tuple uses `undefined` for both `action` and `subject` on the public route; the test then expects `meta.can` to be `undefined` (not an empty array).
