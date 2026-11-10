---
source: src/modules/inventory/tests/e2e/resilience.cy.ts
sha256: 062bff97dc4fc495b3496919a434a98da8fb9939b8ae55b56d38daccda50913f
signature: 062bff97dc4fc495b3496919a434a98da8fb9939b8ae55b56d38daccda50913f
generated_at: 2026-11-10T04:33:42.491023+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/tests/e2e/resilience.cy.ts

## Purpose

Inventory's contribution to the cross-module "resilience sweep." Verifies that the stock board (`/en/inventory`) and the preorder board (`/en/sales/preorders`) render, log nothing unexpected, and stay within the viewport for the staff who read them. It is intentionally value-agnostic ("names no value") per the convention set by the central resilience spec.

## Key elements

- **`describe('the stock boards render whatever the ledger holds')`** – top-level suite; visits `/en` and calls `cy.restore()` in `beforeEach`.
- **`it('serves the stock board and the preorder board quietly and inside the viewport')`** – logs in as `admin`, then delegates to `assertRouteIsHealthy` for the two target routes with their respective CSS anchors (`#inventory-page`, `#preorders-board-page`).

## Relationships

- **`tests/support/e2e/resilience.ts`** – supplies `assertRouteIsHealthy`, the shared helper that performs the render / no-unexpected-logs / viewport-fit checks. This is the file's sole import.

## Notes

- The test intentionally asserts *absence of problems* (no unexpected console output, viewport fit) rather than checking specific rendered values. Do not add value assertions here; they belong in module-specific feature tests.
- `cy.restore()` is called in `beforeEach` to reset application state after `cy.visit('/en')`; removing it will leak state across runs.
- Both routes require an `admin` session (`cy.loginAs('admin')`). Running this file without the login fixture will produce 403/redirect failures that look like the boards are broken.
