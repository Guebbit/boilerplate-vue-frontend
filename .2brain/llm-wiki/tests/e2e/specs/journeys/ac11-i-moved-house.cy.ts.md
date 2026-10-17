---
source: tests/e2e/specs/journeys/ac11-i-moved-house.cy.ts
sha256: 3f7dbf60a8f5f07127f780e993c7c7da75c7a78bb9c88a5f46861beda363dfa8
generated_at: 2026-10-17T02:04:11.439208+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ac11-i-moved-house.cy.ts

## Purpose

End-to-end test for the "I moved house" acceptance criteria. Verifies that address edits and a new default set in the profile are reflected in the checkout address picker, and that removing all addresses is visible in both the profile and checkout, where a new address can then be added directly from the picker. No payment is exercised.

## Key elements

- **`EDITED_STREET`** — constant (`'Via Nuova 99'`) holding the street value written into the existing address; reused later to assert the picker shows the edited text.
- **`describe('AC11 · I moved house')`** — top-level suite. `beforeEach` visits `/en`, restores the database, and re-visits to get a clean UI state.
- **`it('an edit and a new default reach checkout, and an emptied book can be refilled from there')`** — the single test. Walks five `cy.step` phases: edit existing address → add a second address as default → assert picker pre-selection at checkout → delete both addresses (loop over `[1, 0]`) → assert empty state in profile and checkout, then add a new address from the checkout picker.
- **`fillAddressDialog`** (imported) — fills the label/name/street/zip/city/country fields in the address modal.
- **`addToCartFromStorefront`** (imported) — adds a product (`product.barebones`) to the cart so checkout is reachable.

## Relationships

- **`tests/support/e2e/steps.ts`** — source of the two imported helpers (`addToCartFromStorefront`, `fillAddressDialog`). All other page interactions use direct `cy.get` / `cy.contains` selectors against `data-test` attributes.

## Notes

- The `// requires-module:` comment at the top lists the server modules this journey touches (`account, cart, delivery, inventory, products`); the test harness uses it to spin up only those services.
- `cy.restore()` resets DB state but the test re-visits `/en` afterward to flush client-side caches.
- The address-picker selectors use the attribute-prefix pattern `[data-test^=address-picker-]` because each option carries a dynamic suffix; avoid assuming a single fixed ID.
- The removal loop iterates `[1, 0]` so the assertion matches the *remaining* count after each deletion, not the count before.
