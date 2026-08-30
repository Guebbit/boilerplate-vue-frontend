# tests/e2e/specs/home.cy.ts

## Purpose
Cypress end-to-end spec that verifies all public (unauthenticated) routes render their expected pages: the locale-prefixed home, the redirect from `/`, the products list, login, signup, and the 404 error page. It exists to guard against routing regressions and broken public-page layouts.

## Key elements
- **`describe('Public routes')`** – Single suite grouping all public-route tests.
- **`beforeEach`** – Visits `/en` and calls `cy.resetState()` (custom command) to start each test from a clean session.
- **`it('loads home page at locale-prefixed URL')`** – Asserts `#home-page` and an `h1` exist at `/en`.
- **`it('redirects / to the locale-prefixed home')`** – Visits `/`, expects the URL to match a `/[a-z]{2}` pattern, and confirms an `h1` is present.
- **`it('loads the products list page')`** – Asserts `#products-list-page` and the heading text "Products list" at `/en/products`.
- **`it('loads the login page')`** – Asserts `#login-page`, an email input, and a password input at `/en/login`.
- **`it('loads the signup page')`** – Asserts `#signup-page`, an email input, and **two** password inputs (`.eq(0)`, `.eq(1)`) at `/en/signup`.
- **`it('shows 404 error page for unknown routes')`** – Asserts the `h1` contains "404" at `/en/error/404/not-found`.

## Relationships
No graph neighbors are recorded for this file. It is a leaf test file that only depends on the Cypress runtime and the `cy.resetState()` custom command (defined elsewhere in the project's support files).

## Notes
- Relies on the custom Cypress command `cy.resetState()` — this is not part of the standard Cypress API; it must be registered in the `support/` commands file for tests to pass.
- The 404 test navigates to a deliberately invalid route (`/en/error/404/not-found`) rather than a truly random path, so it only verifies that *this specific* fallback renders correctly.
- All assertions use `cy.visit` + `cy.get`; there are no network-intercept or API-level checks in this spec.
