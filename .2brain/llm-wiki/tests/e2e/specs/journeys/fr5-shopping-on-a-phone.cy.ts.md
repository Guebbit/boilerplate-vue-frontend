---
source: tests/e2e/specs/journeys/fr5-shopping-on-a-phone.cy.ts
sha256: 79a0a10e54fcc5a19aa64dea6124628c4b916bc7ceaff2bd11ff1ec8731bd473
generated_at: 2026-10-17T02:16:30.938530+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/fr5-shopping-on-a-phone.cy.ts

## Purpose

E2E Cypress journey test that verifies the full guest-to-customer purchase flow is usable at a phone-class viewport (390 × 844). It asserts that the drawer menu (not the top bar) carries login, signup, section links, and logout; that no page overflows horizontally; and that the address dialog fits inside the viewport. It reuses the same seeded product and payment fixture as CU1's desktop journey.

## Key elements

- **`PHONE`** – constant `{ width: 390, height: 844 }`, the viewport set in `beforeEach`.
- **`DRAWER`** – constant `'#app-drawer'`, the element id referenced by the hamburger's `aria-controls`.
- **`openDrawer()`** – clicks the hamburger and asserts the drawer is visible.
- **`dismissToasts()`** – closes every `.v-alert` via its close button, then asserts none remain (prevents toasts stacking over drawer entries).
- **`fitsTheScreen()`** – asserts `document.documentElement.scrollWidth ≤ 390`, catching horizontal overflow.
- **`describe('FR5 · Shopping on a phone')` / `it(...)`** – the single test: guest → drawer login → sign in → drawer sections → product page → add to cart → cart/checkout with new address in dialog → pay by card → logout via drawer → drawer shows login again.
- **`cy.restore()`** – re-seeds the fixture (account, cart, products, etc.) between the initial `visit` and the one the test actually runs against.

## Relationships

- **`tests/support/e2e/steps.ts`** – provides the shared step helpers `addOpenProductToCart`, `fillAddressDialog`, and `openProductCard` imported and called mid-journey (product card, cart action, and address-dialog fill respectively). All other DOM interactions are inline `cy` commands in this file.

## Notes

- The file header `// requires-module: …` lists the backend modules the fixture must seed; running without them will fail at `cy.restore()`.
- `fitsTheScreen()` is called repeatedly as a guard after every navigation/action—removing it won't break the test but loses the "no sideways scroll" assertion.
- The address-dialog fit check reads `getBoundingClientRect()` and compares `left ≥ 0` and `right ≤ 390`, which is stricter than the `scrollWidth` check: it verifies the dialog *itself* is clipped, not just the page.
- `dismissToasts()` runs only before the final logout step; if a toast appears earlier in the flow it could occlude drawer links.
- The drawer is identified by `#app-drawer` (from `AppNavigation.vue`); the hamburger is found via its `aria-controls` attribute rather than a dedicated data-test attribute.
