# src/modules/orders/tests/e2e/a11y.cy.ts

## Purpose

Cypress E2E accessibility sweep for the orders module. It delegates the actual auditing to the shared `sweepA11y` helper, supplying the specific routes and roles to audit. It lives co-located with the orders module so that removing the module also removes its a11y coverage, preventing a central list from referencing routes the app no longer serves.

## Key elements

- **`orderDetail()`** — Resolves the detail-page URL (`/en/orders/:id`) of a pending order owned by the current backend profile by calling `cy.orderInRole('cancellable')`.
- **`orderEdit()`** — Same pattern, but resolves the edit-page URL (`/en/orders/:id/edit`).
- **`sweepA11y('orders — signed in', …)`** — Audits the static `/en/orders` list route as a signed-in user.
- **`sweepA11y('orders — admin', …)`** — Audits the dynamic detail and edit routes as an admin, since those pages are role-gated.

## Relationships

- **`tests/support/e2e/a11y-sweep.ts`** — Provides the `sweepA11y` function that this file imports and calls. That file contains the actual axe-core (or equivalent) auditing logic; this file is purely the route list and role context.
- **`cy.orderInRole('cancellable')`** — A custom Cypress command (defined elsewhere in test support) that finds a pending order owned by the current profile. Both URL resolvers depend on it.
- **`tests/cross-cutting/a11y-coverage.spec.ts`** (referenced in a comment) — Asserts that every routed module has a co-located a11y sweep file like this one, guarding against a domain silently losing coverage.

## Notes

- The role is named **by backend profile**, not by a hardcoded user; the correct credentials are resolved at runtime by whichever backend the profile started against.
- The `'cancellable'` role targets a **pending** order specifically, because that state renders every action button (cancel, edit, etc.). The comment explains that a disabled control and a missing one fail a11y differently, so auditing the most-interactive state is the point.
- The detail page is reachable **by its owner only**, and the edit page is **admin-only**; the test runs them as the `admin` profile for that reason.
- This file is intentionally *not* a `*.spec.ts` — it's a `*.cy.ts` module that registers sweeps via the shared helper rather than defining its own `describe`/`it` blocks.
