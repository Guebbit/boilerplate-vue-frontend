# src/modules/products/tests/e2e/a11y.cy.ts

## Purpose

Declares the set of routes and viewport/theme variants that the products module exposes to the shared a11y sweep mechanism. It exists so that axe audits cover both the public storefront and the admin CRUD pages, including edge cases (dark theme, phone-width stacking, form-error states) that a single default-desktop pass would miss.

## Key elements

- **`PHONE`** – `[390, 844]` viewport constant; deliberately set below the `DataTable.vue` `mobile-breakpoint` so the 8-column table renders as stacked cards.
- **`productDetail()`** – Resolves the product-detail URL by looking up the seeded `'rich'` role via `cy.productInRole`, returning a promise of the path string.
- **`productEdit()`** – Same lookup, appending `/edit`.
- **`sweepA11y('products — public', …)`** – Registers the public-facing routes: product list, product detail, a dark-theme variant of the list, and a phone-viewport variant of the list.
- **`sweepA11y('products — admin', …)`** – Registers admin routes (create, edit, and a "submitted empty" form-error scenario) under the `'admin'` profile.

## Relationships

- **`tests/support/e2e/a11y-sweep.ts`** – Provides `sweepA11y`, which consumes the route arrays defined here and drives the actual axe runs (visiting each URL, applying the specified theme/viewport/prepare hook, and collecting violations). This file is the *data* half; the support module is the *engine*.

## Notes

- URLs for detail/edit are never hardcoded IDs. They resolve through `cy.productInRole('rich')` so the sweep works against whatever backend the current Cypress profile is pointed at.
- The `'rich'` role is chosen intentionally: it is the seeded product that has a description, category chips, and an image populated, giving axe the most visual surface to audit.
- The dark-theme and phone-viewport entries exist because a pair of colour contrast or a table layout that passes on white/desktop can fail in those variants; they are separate sweep entries, not parameterised repeats.
- The "submitted empty" `prepare` hook clicks the submit button and asserts `.v-messages__message` visibility before axe runs, ensuring the error-association (`aria-describedby`) and announcement requirements are actually in the DOM.
