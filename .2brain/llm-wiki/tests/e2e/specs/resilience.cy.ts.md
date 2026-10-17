---
source: tests/e2e/specs/resilience.cy.ts
sha256: 81dbbe57fe2185dc8c96a3d4d907bd7de8a0c5bddf73261752dc67c8dc8f11f5
generated_at: 2026-10-17T02:23:32.878318+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/resilience.cy.ts

## Purpose

Shell-generic resilience spec for the FOUNDATION pages that ship with every deployment of this boilerplate. Unlike the dataset-specific specs (cart, orders, products), it names no values and asserts only two things per route: the page renders without an unexpected console log, and it does not overflow the viewport horizontally. It exists to catch the quiet failures—broken images, caught TypeErrors, 300 px tables—that value-asserting specs stay green on.

## Key elements

- **`describe('Resilience')`** — top-level suite; `beforeEach` visits `/en` (ensures a rendered app) and calls `cy.restore()` to reset backend state before each case.
- **`describe('every route renders, quietly, inside the viewport')`** — inner suite holding four `it` blocks grouped by auth level:
  - *public routes* — `/en` (home) and a seeded published example.
  - *guest-only routes* — `/en/login`, `/en/signup`.
  - *authenticated routes* — `/en/profile`, `/en/examples` (requires `cy.loginAs('user')`).
  - *admin-only routes* — `/en/admin`, `/en/users` (requires `cy.loginAs('admin')`).
- **`assertRouteIsHealthy(url, selector)`** — imported from the support file; performs the visit, console-spy, and `scrollWidth` check for a single route.

## Relationships

- **`tests/support/e2e/resilience.ts`** — sole import. Provides `assertRouteIsHealthy`, which encapsulates the visit → console-log assertion → `document.body.scrollWidth ≤ window.innerWidth` sequence that every `it` block above delegates to.

## Notes

- Routes are **hardcoded**, not discovered from the router. Parameterised routes (`products/:id/edit`, `error/:status/:message`) are intentionally excluded because they need fixtures to be meaningful.
- `inventory` and `feedback` are **absent on purpose** (feature in progress at time of writing). Add them here when they land.
- Cypress already fails a test on an *uncaught* exception; the added value of this spec is catching *caught-and-logged* errors and horizontal overflow.
- No randomised data is used: a console spy + `scrollWidth` check are dataset-agnostic, and generated data would make failures harder to reproduce.
- The file lives under `tests/e2e/specs/`; the analogous dataset-specific specs for cart/orders/products live at `tests/e2e/resilience.cy.ts` (one level up) and are independent files.
