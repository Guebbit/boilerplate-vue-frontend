---
source: tests/e2e/specs/resilience.cy.ts
sha256: 7ec5d8efdaa141239bd7fa4e0b33a85bbc92edf4c47ada70e5f96484ebd22e10
signature: 7ec5d8efdaa141239bd7fa4e0b33a85bbc92edf4c47ada70e5f96484ebd22e10
generated_at: 2026-11-10T07:24:03.824013+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/resilience.cy.ts

## Purpose

Asserts that every FOUNDATION route renders without uncaught exceptions, without caught-and-logged console errors, and without horizontal scroll. It is deliberately value-agnostic (no exact titles, counts, or prices) to catch rendering/layout regressions that dataset-specific specs miss.

## Key elements

- **`describe('Resilience')`** — top-level suite; `beforeEach` visits `/en` then calls `cy.restore()` to reset backend state before each case.
- **`describe('every route renders, quietly, inside the viewport')`** — contains four test cases grouped by auth level (public, guest-only, authenticated, admin-only), each calling `assertRouteIsHealthy(url, selector)`.
- **`assertRouteIsHealthy`** (imported) — the shared helper that performs the console-spy + `scrollWidth` check for a given route and page selector.
- **`cy.loginAs('editor' | 'admin')`** — custom command used to authenticate before hitting protected routes.

## Relationships

- **`tests/support/e2e/resilience.ts`** — provides `assertRouteIsHealthy`; this spec is its sole consumer. All resilience assertions (console-error spy, horizontal-scroll check, page-load success) live in that file; this spec only supplies the route/selector pairs.

## Notes

- Routes are hard-coded rather than derived from the router on purpose: parameterised routes (`products/:id/edit`, `error/:status/:message`) are excluded because they need fixtures to be meaningful.
- Only FOUNDATION routes are tested here. `cart`, `orders`, `products`, `inventory`, and `tasks` carry their own `resilience.cy.ts` under their module directories and add dataset-shaped cases (empty lists, pagination, sparse records) on top of the same two base assertions.
- The seeded example ID `65e1a0000000000000000e04` depends on the backend demo scenario (`scenarios/examples.ts`, `adminPublished`); if that seed changes, this assertion will 404.
- No randomised data is generated; a console spy and `scrollWidth` check are dataset-independent, and generated data would make failures harder to reproduce.
