---
source: src/modules/example/tests/e2e/resilience.cy.ts
sha256: a72cfa6526b077e79a9cfcce274dc2d90a964b6090fabe8f602c47ed55505f0c
signature: a72cfa6526b077e79a9cfcce274dc2d90a964b6090fabe8f602c47ed55505f0c
generated_at: 2026-11-10T04:24:44.751215+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/tests/e2e/resilience.cy.ts

## Purpose

Module-level slice of the application-wide resilience sweep. Verifies that the example list, detail, edit, and public pages each render their expected content without emitting unexpected log output and within the viewport. Runs as an authenticated editor (internal pages) and as a guest (public page).

## Key elements

- **`EDITOR_PUBLISHED`** – Seeded MongoDB ObjectId of a published example the editor can view in the detail and edit routes.
- **`ADMIN_PUBLISHED`** – Seeded ObjectId of a published example the guest-facing public route reads.
- **`describe('the example pages render whatever they hold')`** – Top-level suite; contains four tests (list, detail, edit, public) that each delegate to `assertRouteIsHealthy` with the route path and a CSS selector for the expected page anchor.
- **`beforeEach` (editor context)** – Visits `/en`, calls `cy.restore()`, then logs in as `editor` before each internal-page test.

## Relationships

- **`tests/support/e2e/resilience.ts`** – Provides the single helper `assertRouteIsHealthy(route, selector)` used by every test in this file. This file is the *consumer*; the support file holds the shared assertion logic (console-error check + viewport-fit check).

## Notes

- The file deliberately **names no concrete values** (no text assertions, no data comparisons); it only checks route health. The header attributes this choice to a rationale given in the central sweep file.
- `cy.restore()` is called after `cy.visit('/en')` in both the editor `beforeEach` and the guest test, implying the support layer provides a fixture-reset mechanism that must run before each assertion.
- The public-page test sits at the same `describe` level as the editor sub-suite (not nested inside it), so it does **not** run under the editor `beforeEach` and therefore does not log in.
