# src/modules/inventory/tests/e2e/a11y.cy.ts

## Purpose

Co-located accessibility (a11y) sweep for the inventory module's routed pages. It declares which routes the inventory domain owns and hands them to the shared `sweepA11y` helper, ensuring the module's a11y coverage is deleted automatically if the module is removed.

## Key elements

- **`sweepA11y('inventory', …)`** — Single top-level call that registers the inventory route list (`/en/inventory`, labelled "inventory ledger") under the `admin` scope for the shared a11y sweep runner.
- **Module doc comment** — Documents the co-location rationale and points to `tests/cross-cutting/a11y-coverage.spec.ts` as the enforcement mechanism.

## Relationships

- **`tests/support/e2e/a11y-sweep.ts`** — Provides the `sweepA11y` function that actually executes the accessibility checks against the supplied route list. This file is purely the route inventory; all sweep logic lives in the support file.
- **`tests/cross-cutting/a11y-coverage.spec.ts`** (referenced in docs, not imported) — A cross-cutting spec that asserts every routed module has a co-located a11y file like this one, preventing a module from being added without a11y coverage.

## Notes

- This file has **no exports**; it executes side-effects on import (i.e., when Cypress loads the spec).
- The route list is intentionally per-module rather than centralized. The doc comment explains the trade-off: a central list would accumulate stale routes after module deletion.
- The third argument (`'admin'`) likely scopes which auth/permission context the sweep runs under, but the contract is defined in `a11y-sweep.ts`.
