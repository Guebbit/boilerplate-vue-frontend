---
source: tests/e2e/specs/journeys/cu28-the-merge-answer-got-lost.cy.ts
sha256: 73f4bfb5bf56a6ae928de4607cf75b08cb23b41216c87c4e3ab214fbaec5b95f
generated_at: 2026-10-17T02:12:42.533281+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu28-the-merge-answer-got-lost.cy.ts

## Purpose

E2E test for CU28: a guest cart merge succeeds on the server but the response is lost in transit (replaced by a 502). Verifies three invariants—the browser retains its guest copy, a retried merge under the same idempotency key does not double the quantity, and a sign-out clears both the device copy and the pending merge so the next sign-in sends nothing.

## Key elements

- **`GUEST_UNITS`** — constant `2`; chosen > 1 so a doubling bug (4) is distinguishable from the correct value.
- **`signInThroughTheForm()`** — signs in via the login form using credentials resolved from the `user` account guarantee.
- **`loseTheFirstMergeAnswer()`** — intercepts `POST **/cart/merge`; lets the request reach the real server but swaps only the first response's status to 502 via `request.on('response', …)`. Aliased as `@merge` so both calls are countable.
- **`guestAdds(name)`** — visits the product list, opens a seeded product, clicks "add to cart" `GUEST_UNITS` times, asserts the nav badge.
- **`accountHolds(productId, quantity)`** — reads the authenticated user's cart via `cy.apiAs` (GET /cart) and asserts exactly one line item with the expected quantity.
- **Test 1** — "keeps the guest cart, and the retry after a reload adds it once": full lost-response → reload → idempotent-retry → clean-up flow.
- **Test 2** — "ends the lost merge with the session": lost-response → sign-out → verify localStorage cleared → sign-in again → verify no second merge is sent and quantity is unchanged.

## Relationships

- **`tests/support/e2e/steps.ts`** — imports `GUEST_CART_KEY` and `GUEST_MERGE_ATTEMPT_KEY` (localStorage keys asserted in `cy.window()` checks), `searchAndOpenProduct` (navigates to a product page), and `submitLoginForm` (fills and submits credentials).

## Notes

- The 502 is injected with `request.on('response', (r) => r.send(502))`, **not** `cy.intercept('…', { statusCode: 502 })` or `forceNetworkError`. The file's doc comment explains: the request must actually reach the server (so it is applied), and only the *response* is altered. `forceNetworkError` would abort the request, which does not reproduce the "applied but lost" case.
- Assertions about server state use `cy.apiAs` (API read-back) rather than UI text, because the UI intentionally shows the "cart stays on this device" message when the merge answer is lost.
- The `@merge` alias accumulates all intercepted calls; the second test asserts `cy.get('@merge.all').should('have.length', 1)` to prove no second merge was sent after sign-out + sign-in.
- `beforeEach` restores DB fixtures and wipes the user's cart via `DELETE /cart/all`.
- Requires the `account`, `cart`, and `products` modules (per the `requires-module` comment).
