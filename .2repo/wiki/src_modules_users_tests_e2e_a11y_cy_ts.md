# src/modules/users/tests/e2e/a11y.cy.ts

## Purpose

Co-located a11y route list for the **users** module. It registers four user-facing routes with the shared `sweepA11y` helper so that accessibility audits run against the admin view of each page. Placing the list inside the module (rather than in a central file) guarantees the routes vanish if the module is deleted, and a cross-cutting spec enforces that every routed module ships one of these files.

## Key elements

- **`userDetail()`** — Cypress chain that resolves the detail-page URL (`/en/users/:id`) for the seeded non-admin account by querying `cy.accountInRole('user')`.
- **`userEdit()`** — Same lookup, returning the edit-page URL (`/en/users/:id/edit`).
- **`sweepA11y(...)` call** — Registers the four routes (`users list`, `user create`, `user detail`, `user edit`) under the module name `'users'` and declares the sweep role as `'admin'`. This is the file's sole side-effect; there is no test body.

## Relationships

- **`tests/support/e2e/a11y-sweep.ts`** — Exports `sweepA11y`, the helper this file calls. That file owns the sweep loop, axe-core integration, and role-switching; this file supplies only the route list and module label.

## Notes

- **Subject vs. viewer are different accounts.** The *subject* of each audit is the seeded non-admin (`user` role) because a page rendering *your own* row hides the controls that act on someone else's. The *viewer* (who signs in) is the `admin` role, specified as the third argument to `sweepA11y`.
- **Dynamic URL resolution.** `userDetail` and `userEdit` resolve the account id at test time via `cy.accountInRole`, so the sweep works regardless of which backend seed produced the profile. Do not hardcode an id.
- **Enforced presence.** `tests/cross-cutting/a11y-coverage.spec.ts` asserts every routed module has a corresponding a11y file in its `tests/e2e/` directory; deleting this file will fail that spec.
