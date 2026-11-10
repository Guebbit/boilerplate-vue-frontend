---
source: tests/e2e/specs/journeys/cu28-the-merge-answer-got-lost.cy.ts
sha256: c8d93bf7c789d3062266e82e935d30ce53bc4e249f78ce192fd1f17866dcbc1c
signature: b6b54f03ebba40ec18c11ec4e11d6e3e9191150e23bb4f3e099e0119ed5c3d22
generated_at: 2026-11-10T06:58:44.267944+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu28-the-merge-answer-got-lost.cy.ts

## Purpose

Cypress E2E journey test for CU28: a guest signs in, the server applies the cart merge, but the HTTP response is replaced by a 502 before it reaches the browser. The test verifies the browser keeps its local cart copy, that a retry under the same idempotency key does not double the quantity, and that signing out clears the pending merge so a subsequent sign-in sends nothing.

## Key elements

- **`GUEST_UNITS = 2`** — the quantity added as a guest; deliberately > 1 so a silent doubling is detectable.
- **`signInThroughTheForm()`** — fetches the `user` account's credentials via `cy.accountOf` and submits them through the login form.
- **`loseTheFirstMergeAnswer()`** — sets up `cy.intercept('POST', '**/cart/merge')` that lets the real request through to the server but swaps the first response's status to 502 via `request.on('response', r => r.send(502))`. Later calls pass untouched. Aliased as `@merge` so both attempts can be waited on.
- **`guestAdds(name)`** — visits `/en/products`, opens the product by guarantee name, clicks "add to cart" `GUEST_UNITS` times, asserts the nav badge shows the total.
- **`accountHolds(productId, quantity)`** — calls `GET /cart` via `cy.apiAs('user', …)` and asserts exactly one line for the product with the expected quantity.
- **Test 1: "keeps the guest cart, and the retry after a reload adds it once"** — full lost-response → reload → retry flow; checks localStorage keys, server cart quantity, and the rendered cart item.
- **Test 2: "ends the lost merge with the session"** — lost response → sign-out → sign-in again; asserts no second merge request is sent and the cart quantity is unchanged.

## Relationships

- **`tests/support/e2e/steps.ts`** — supplies four imported symbols used directly: `GUEST_CART_KEY` and `GUEST_MERGE_ATTEMPT_KEY` (localStorage key names asserted in the tests), `searchAndOpenProduct` (product-page navigation helper), and `submitLoginForm` (login form interaction).

## Notes

- The intercept pattern is intentionally **not** `cy.server({ forceNetworkError: true })`. From a response handler the browser never sees a failed request, so the app's error path would not fire. The 502 swap only changes the status code while preserving the real body/headers (which 5xx handlers typically ignore), giving the "server applied it, browser never knew" semantics.
- Both tests assert on **server-side state** via `cy.apiAs('user', 'GET', '/cart')` rather than trusting the rendered page. The page is used only for UI-level confirmations (badge text, "stays on this device" message, cart-item count).
- `cy.wait('@merge')` is used after sign-in and after reload to synchronise with the (possibly retried) merge request. In test 2 the second sign-in is verified to send *no* merge via `cy.get('@merge.all').should('have.length', 1)`.
- The `beforeEach` clears the user's cart items with `DELETE /cart/items` and calls `cy.restore()` to reset any seeded test data, ensuring each scenario starts from a clean server state.
