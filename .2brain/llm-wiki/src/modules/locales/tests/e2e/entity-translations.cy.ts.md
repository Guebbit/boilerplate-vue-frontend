---
source: src/modules/locales/tests/e2e/entity-translations.cy.ts
sha256: 67f9d71747693071e5cee9f7eef60b2bd1b35b621bc71b730cb41ff02c843234
signature: 67f9d71747693071e5cee9f7eef60b2bd1b35b621bc71b730cb41ff02c843234
generated_at: 2026-11-10T04:42:47.523620+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/tests/e2e/entity-translations.cy.ts

## Purpose

E2E suite for the generic entity-translation admin screen. It verifies the full write→invalidate→read path: an admin edits a product's translation in the UI, the save clears the API's cache tag, and a fresh storefront page load renders the new text. Also covers navigation into the screen and a touch-screen regression (swipe inside a field must not switch tabs).

## Key elements

- **`describe('Entity translations — the generic admin door')`** — top-level suite; `beforeEach` visits `/en`, restores fixtures, and logs in as `admin`.
- **`it('an edited translation reaches the storefront')`** — creates a product with `en` + `it` titles, opens the translation screen, switches to the `it` panel, types a new title, saves, asserts the "Translations saved" message, then visits the Italian product page and asserts the new title is present and the old one is gone.
- **`it('reaches the screen from the product edit page')`** — navigates from `/en/products/:id/edit`, clicks `[data-test=translations-link]`, and asserts the URL and `#entity-translations-page` exist.
- **`describe('on a touch screen')`** — sets a phone viewport, swipes left inside the `en` title textarea, and asserts the `en` tab remains selected and the textarea value is unchanged.
- **`applyViewport('phone')`** (imported) — applies a phone-sized viewport for the touch test.

## Relationships

- **`tests/support/e2e/apply-viewport.ts`** — imported and called with `'phone'` to configure the viewport before the touch-swipe assertion.

## Notes

- All locale panels stay in the DOM (`v-tabs-window` renders every panel). Selecting by `:visible` is a race during tab transitions; tests scope by the panel's `id` (e.g. `#translation-panel-it`) instead.
- `data-field=title` is used because the seeded product only sets a title; `description` also renders (from the registry's declared field set) but is blank and untouched.
- The touch/swipe test uses `realSwipe` (Cypress real-events). Touch emulation leaks into any test that follows it in live Chromium (desktop pointer is lost), so the touch `describe` block **must remain last**.
- Test data uses `Date.now()` for uniqueness; the original and edited titles are captured in variables for post-save assertions.
- The suite exercises the real HTTP/API invalidation path (cache-tag clear → fresh page load), not a store-level or component-level assertion.
