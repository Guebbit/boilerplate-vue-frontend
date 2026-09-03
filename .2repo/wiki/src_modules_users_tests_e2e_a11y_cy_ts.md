# src/modules/users/tests/e2e/a11y.cy.ts

## Purpose

Declares the accessibility route list for the users module so the shared `sweepA11y` helper can audit every user-facing page (list, create, detail, edit) as the admin. Co-located with the module so that deleting the module automatically removes its a11y coverage, and so a cross-cutting spec can verify no routed module is missing a sweep file.

## Key elements

- **`PHONE`** — `[390, 844]` constant; iPhone 14-class viewport width below which `DataTable.vue` stacks rows into cards.
- **`userDetail()`** — Resolves the detail-page URL (`/en/users/:id`) by querying the seeded non-admin account via `cy.accountInRole('user')` rather than hard-coding an id.
- **`userEdit()`** — Same pattern, appending `/edit` for the edit-page URL.
- **`sweepA11y('users', …, 'admin')`** — Registers five sweep entries: users list, users list at phone viewport, user create, user detail, and user edit. Runs the shared sweep as the admin role.

## Relationships

- **`tests/support/e2e/a11y-sweep.ts`** — Provides the `sweepA11y` helper that this file calls with a module name, a route list, and the acting role. This file is one of many per-module consumers of that helper.
- **`tests/cross-cutting/a11y-coverage.spec.ts`** (referenced in the module docblock) — Asserts that every routed module has a co-located a11y sweep file like this one, preventing a module from being added without a11y coverage.

## Notes

- The sweep signs in as **admin**, but the detail/edit pages target the **seeded non-admin** account. The comment explains why: viewing your own row hides the action controls that act on another user, so the admin perspective exercises the full UI.
- The phone-viewport entry exists specifically to catch the stacked-card layout that `DataTable.vue` renders below its `sm` breakpoint — a layout the default desktop sweep never sees.
- `userDetail`/`userEdit` are functions (not static strings) so they resolve the account id at runtime against whichever backend the seed created.
