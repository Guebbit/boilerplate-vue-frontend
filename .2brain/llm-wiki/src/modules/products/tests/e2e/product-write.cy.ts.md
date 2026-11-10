---
source: src/modules/products/tests/e2e/product-write.cy.ts
sha256: 8d14f65666ce13df2d3da1ee5ef7bbc653fa555f7a603fc6e29a601adba6167e
signature: a2be4b20443deef2522d1711b336cf123e6407e307071bc294a0f161a1034f07
generated_at: 2026-11-10T05:23:25.474715+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/e2e/product-write.cy.ts

## Purpose

Cypress end-to-end spec covering the multilingual product write surface: creating a product in two languages in a single submit, removing one language while editing another in the same save, surfacing a validation badge on an unselected tab, and verifying that a horizontal swipe inside a title field does not accidentally switch the active language tab on a phone viewport.

## Key elements

- **`unique()`** — local helper generating a `timestamp-random` string so concurrent spec runs targeting the same backend don't collide on product titles.
- **`describe('create — two languages in one submit')`** — fills English and Italian title fields, submits the form once, then asserts both titles render on their respective storefront URLs.
- **`describe('edit — remove a language and edit another in one save')`** — seeds a three-language product, edits the Spanish title, removes the Italian tab, saves, reloads, and asserts Italian is gone while Spanish retains its new title.
- **`describe('validation — an error on an unselected tab')`** — blanks the Italian title, switches to the English tab, submits, and asserts an error badge appears on the Italian tab element.
- **`describe('on a touch screen')`** — two swipe tests (edit and create) using `cy.realSwipe('toLeft')` to confirm the active `aria-selected` tab and the field's value survive a gesture that starts inside the title input. Must remain the last `describe` block (see Notes).

## Relationships

- **`tests/support/e2e/apply-viewport.ts`** — imported as `applyViewport`; called in the touch-screen specs to switch the browser to a phone-sized viewport before interacting with the product page. No other file in this spec imports from it.

## Notes

- **Selector scoping is deliberate.** Every title-field interaction targets `#translation-panel-<locale> [data-test=translation-title-field]` rather than relying on `:visible`. The in-file comments explain that `v-tabs-window`'s slide transition leaves both panels reporting nonzero size momentarily, so `:visible` alone races the animation.
- **Wrapper vs. `<input>` distinction.** `data-test=translation-title-field` lands on the Vuetify `<v-text-field>` wrapper (`<div>`), not the inner `<input>`. `.type()` / `.clear()` work because Vuetify delegates focus, but `should('have.value', …)` must target the ` input` suffix or it reads the wrapper's nonexistent value.
- **Focus hand-back after language picker.** After selecting a language from the `v-select` menu, Vuetify returns focus to the picker's activator a beat late. The spec waits for `[data-test=translation-tab-add] input` to `be.focused` before clicking the Italian title field to avoid the rest of the typed string being swallowed by the picker's filter.
- **Touch-emulation ordering.** The `describe('on a touch screen')` block is appended last and must stay last: `applyViewport('phone')` leaks touch emulation into subsequent tests in live Chromium (the desktop pointer is lost).
- **Custom commands assumed.** The spec relies on `cy.loginAs`, `cy.createProduct`, `cy.restore`, and `cy.realSwipe` — all defined elsewhere in the project's support layer and not visible in this file.
